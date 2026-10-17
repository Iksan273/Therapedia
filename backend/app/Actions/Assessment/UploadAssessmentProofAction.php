<?php

namespace App\Actions\Assessment;

use App\Exceptions\ApiException;
use App\Models\AssessmentAccessCode;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceLog;
use App\Models\PaymentProof;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Ortu mengunggah bukti transfer invoice asesmen dari halaman kuesioner publik (dikunci oleh kode). Hanya invoice `assessment`
 * milik kode itu (atau invoice manual Finance tanpa kode) yang belum `paid`/`void`. Maks 4 upload (1 + 3 re-upload). Status invoice
 * TIDAK berubah (Finance menandai lunas); cukup `proof_upload_count > 0` untuk membuka kuesioner.
 */
class UploadAssessmentProofAction
{
    public const MAX_UPLOADS = 4;

    /** @return array{invoice_number: string, proof_upload_count: int, remaining_uploads: int} */
    public function handle(string $codeValue, UploadedFile $file): array
    {
        $code = AssessmentAccessCode::query()->where('code', strtoupper(trim($codeValue)))->first()
            ?? throw ApiException::notFound('Kode kuesioner tidak ditemukan.');

        if ($code->status === 'submitted') {
            throw ApiException::conflict('already_submitted', 'Kuesioner ini sudah dikirim.');
        }

        $stored = $file->store('payment-proofs');

        try {
            return DB::transaction(function () use ($code, $file, $stored): array {
                $invoice = Invoice::withoutGlobalScopes()->lockForUpdate()
                    ->where('client_id', $code->client_id)->where('invoice_type', 'assessment')
                    ->whereNotIn('status', ['paid', 'void'])
                    ->where(fn ($q) => $q->where('assessment_access_code_id', $code->id)->orWhereNull('assessment_access_code_id'))
                    ->orderByRaw('assessment_access_code_id IS NULL')->orderBy('id')->first();

                if ($invoice === null) {
                    throw ApiException::conflict('proof_not_needed', 'Tidak ada invoice asesmen yang menunggu bukti transfer untuk kode ini.');
                }
                if ($invoice->proof_upload_count >= self::MAX_UPLOADS) {
                    throw ApiException::unprocessable('proof_limit_reached', 'Batas unggah bukti (maksimal '.self::MAX_UPLOADS.' kali) sudah tercapai. Hubungi admin Therapedia.');
                }

                $child = Client::withoutGlobalScopes()->whereKey($code->client_id)->value('child_name');
                PaymentProof::create([
                    'invoice_id' => $invoice->id,
                    'file_path' => $stored,
                    'file_name' => mb_substr($file->getClientOriginalName(), 0, 255),
                    'mime_type' => (string) $file->getMimeType(),
                    'file_size' => (int) $file->getSize(),
                    'uploaded_by_type' => 'client',
                    'uploaded_by_id' => $code->client_id,
                    'uploaded_at' => now(),
                ]);
                $invoice->forceFill(['proof_upload_count' => $invoice->proof_upload_count + 1])->save();

                InvoiceLog::create([
                    'invoice_id' => $invoice->id,
                    'action' => 'proof_uploaded',
                    'actor_name' => 'Orang tua '.$child,
                    'note' => 'Bukti transfer diunggah dari halaman kuesioner ('.$code->code.')',
                ]);

                return [
                    'invoice_number' => $invoice->invoice_number,
                    'proof_upload_count' => (int) $invoice->proof_upload_count,
                    'remaining_uploads' => self::MAX_UPLOADS - (int) $invoice->proof_upload_count,
                ];
            });
        } catch (\Throwable $e) {
            Storage::delete($stored); // gagal: jangan tinggalkan file yatim
            throw $e;
        }
    }
}
