<?php

namespace App\Actions\Finance;

use App\Exceptions\ApiException;
use App\Http\Resources\Finance\InvoiceResource;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceLog;
use App\Models\PaymentProof;
use App\Support\BranchContext;
use App\Support\Paginate;
use App\Support\PrefixSearch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Invoice untuk Finance, tahap awal (Sprint 1): daftar "Menunggu Pembayaran", detail, unggah bukti oleh Finance, dan Tandai Lunas
 * KHUSUS invoice asesmen. Invoice paket / cuti (aktivasi kredit, void, refund, renewal) menyusul di modul Finance (M7).
 */
class InvoiceActions
{
    public const TYPES = ['package', 'assessment', 'leave'];

    /** @return array{data: array<int, mixed>, meta: array<string, int>} */
    public function list(Request $request): array
    {
        $query = Invoice::query()
            ->with(['client:id,client_code,child_name,parent_name', 'branch:id,name', 'assessmentAccessCode:id,code'])
            ->withMax('paymentProofs as last_proof_id', 'id');

        BranchContext::apply($query, $request);

        if (($statuses = array_filter((array) $request->query('status'))) !== []) {
            $query->whereIn('status', array_intersect($statuses, ['unpaid', 'paid', 'void']));
        }
        if (in_array($request->query('type'), self::TYPES, true)) {
            $query->where('invoice_type', $request->query('type'));
        }
        if ($request->filled('client_id')) {
            $query->where('client_id', (int) $request->query('client_id'));
        }
        if (($term = trim((string) $request->query('q', ''))) !== '') {
            // Client yang cocok dicari lebih dulu (indeks nama/kode, maks 1000 id) lalu dipakai sebagai daftar konstanta: OR dengan subquery
            // memaksa MySQL memindai seluruh invoice. Nomor invoice dicari dari AWAL (prefix, indeks UNIQUE).
            $looksLikeInvoiceNumber = (bool) preg_match('/^inv-/i', $term); // "INV-…": tidak perlu mencari nama/kode client
            $clientIds = $looksLikeInvoiceNumber ? [] : PrefixSearch::applyWords(Client::withoutGlobalScopes()->select('id'), $term, ['child_name', 'parent_name'], ['client_code'])->limit(1000)->pluck('id')->all();
            $like = addcslashes($term, '%_\\').'%';
            $query->where(fn (Builder $w) => $w->where('invoice_number', 'like', $like)->orWhereIn('client_id', $clientIds));
        }

        $query->orderByDesc('issued_at')->orderByDesc('id');

        return Paginate::offset($query, $request, fn ($items) => InvoiceResource::collection($items)->resolve());
    }

    public function find(int $id): Invoice
    {
        return Invoice::query()
            ->with(['client:id,client_code,child_name,parent_name', 'branch:id,name', 'assessmentAccessCode:id,code', 'paymentProofs' => fn ($q) => $q->orderBy('uploaded_at')->orderBy('id')])
            ->findOrFail($id);
    }

    /** Finance mengunggah / menambah bukti (mis. bukti mutasi). Status invoice TIDAK berubah; tanpa batas jumlah; invoice void ditolak. */
    public function uploadProof(int $invoiceId, UploadedFile $file): Invoice
    {
        $stored = $file->store('payment-proofs');

        try {
            DB::transaction(function () use ($invoiceId, $file, $stored): void {
                $invoice = Invoice::query()->lockForUpdate()->findOrFail($invoiceId);
                if ($invoice->status === 'void') {
                    throw ApiException::unprocessable('invoice_void', 'Invoice yang sudah void tidak menerima bukti pembayaran.');
                }

                PaymentProof::create([
                    'invoice_id' => $invoice->id,
                    'file_path' => $stored,
                    'file_name' => mb_substr($file->getClientOriginalName(), 0, 255),
                    'mime_type' => (string) $file->getMimeType(),
                    'file_size' => (int) $file->getSize(),
                    'uploaded_by_type' => 'user',
                    'uploaded_by_id' => Auth::id(),
                    'uploaded_at' => now(),
                ]);
                $invoice->forceFill(['proof_upload_count' => $invoice->proof_upload_count + 1])->save();

                InvoiceLog::create([
                    'invoice_id' => $invoice->id,
                    'action' => 'proof_uploaded',
                    'actor_name' => Auth::user()?->name,
                    'actor_id' => Auth::id(),
                    'note' => 'Bukti transfer diunggah oleh Finance',
                ]);
            });
        } catch (\Throwable $e) {
            Storage::delete($stored);
            throw $e;
        }

        return $this->find($invoiceId);
    }

    /** Tandai Lunas (tanpa Tolak). Sprint ini hanya invoice asesmen: tidak membuat paket/ledger, cukup `paid` + log `verified`. */
    public function verify(int $invoiceId, mixed $version): Invoice
    {
        DB::transaction(function () use ($invoiceId, $version): void {
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($invoiceId);
            $invoice->assertVersion($version);

            if ($invoice->invoice_type !== 'assessment') {
                throw ApiException::unprocessable('not_supported_yet', 'Tandai lunas untuk invoice paket dan cuti tersedia di modul Finance berikutnya. Saat ini hanya invoice asesmen.');
            }
            if ($invoice->status === 'void') {
                throw ApiException::conflict('invoice_void', 'Invoice ini sudah void.');
            }
            if ($invoice->status === 'paid') {
                throw ApiException::conflict('already_paid', 'Invoice ini sudah ditandai lunas.');
            }

            $invoice->forceFill([
                'status' => 'paid',
                'paid_at' => now(),
                'verified_by' => Auth::id(),
                'verified_at' => now(),
            ])->save();

            InvoiceLog::create([
                'invoice_id' => $invoice->id,
                'action' => 'verified',
                'actor_name' => Auth::user()?->name,
                'actor_id' => Auth::id(),
                'note' => 'Ditandai lunas oleh Finance',
            ]);
        });

        return $this->find($invoiceId);
    }

    /** File bukti milik invoice (Finance). Tanpa Content-Disposition agar tampil di penampil, bukan terunduh. */
    public function proofFilePath(int $invoiceId, int $proofId): array
    {
        $invoice = Invoice::query()->findOrFail($invoiceId); // BranchScope: cabang lain -> 404
        $proof = PaymentProof::query()->where('invoice_id', $invoice->id)->findOrFail($proofId);

        if (! Storage::exists($proof->file_path)) {
            throw ApiException::notFound('File bukti tidak ditemukan.');
        }

        return [Storage::path($proof->file_path), $proof->mime_type ?: 'application/octet-stream'];
    }
}
