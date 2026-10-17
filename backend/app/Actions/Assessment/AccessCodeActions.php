<?php

namespace App\Actions\Assessment;

use App\Exceptions\ApiException;
use App\Models\AssessmentAccessCode;
use App\Models\AssessmentCategory;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceLog;
use App\Models\MasterPackage;
use App\Services\ClientStatusService;
use App\Services\InvoiceNumberService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Terbit & hapus kode kuesioner. Server yang membuat kode (`{type_code}-{6 karakter acak}`, tanpa 0/O/1/I).
 * Terbit: status client maju ke `assessment_scheduled` (hanya maju) dan invoice asesmen `unpaid` bila `with_invoice`.
 */
class AccessCodeActions
{
    private const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public function __construct(
        private readonly ClientStatusService $statuses,
        private readonly InvoiceNumberService $numbers,
    ) {}

    public function issue(int $clientId, array $data): AssessmentAccessCode
    {
        return DB::transaction(function () use ($clientId, $data): AssessmentAccessCode {
            $client = Client::query()->lockForUpdate()->findOrFail($clientId);
            $category = AssessmentCategory::query()->findOrFail($data['category_id']);
            if (! $category->is_active) {
                throw ApiException::validation(['category_id' => ['Kategori kuesioner ini sudah dinonaktifkan.']]);
            }

            $withInvoice = (bool) ($data['with_invoice'] ?? true);
            $package = $withInvoice ? $this->resolvePackage($data['master_package_id'] ?? null) : null;

            $code = $this->createCode($client, $category, $data['validity_days'] ?? null, $withInvoice);

            if ($package !== null) {
                $this->issueInvoice($client, $code, $package);
            }

            $next = $this->statuses->advance($client->status, 'assessment_scheduled');
            if ($next !== $client->status) {
                $client->fill(['status' => $next, 'status_changed_at' => now()])->save();
            }

            return $code->refresh();
        });
    }

    public function delete(int $id): void
    {
        DB::transaction(function () use ($id): void {
            // Lewat BranchScope client: kode client cabang lain -> 404
            $code = AssessmentAccessCode::query()->whereHas('client')->lockForUpdate()->findOrFail($id);

            if ($code->status === 'submitted') {
                throw ApiException::conflict('already_submitted', 'Kuesioner ini sudah diisi, kodenya tidak dapat dihapus.');
            }
            if ($code->assessmentDraftsViaAccessCode()->exists()) {
                throw ApiException::conflict('draft_exists', 'Kuesioner ini sudah mulai diisi (ada draft), kodenya tidak dapat dihapus.');
            }

            // Invoice asesmen yang belum lunas ikut dihapus; yang sudah lunas dipertahankan (FK -> NULL)
            Invoice::withoutGlobalScopes()->where('assessment_access_code_id', $id)->where('status', 'unpaid')->delete();
            $code->delete();
        });
    }

    private function createCode(Client $client, AssessmentCategory $category, ?int $validityDays, bool $invoiceRequired): AssessmentAccessCode
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            try {
                return AssessmentAccessCode::create([
                    'code' => $category->type_code.'-'.$this->randomSuffix(),
                    'client_id' => $client->id,
                    'category_id' => $category->id,
                    'status' => 'issued',
                    'issued_by' => Auth::id(),
                    'issued_at' => now(),
                    'expires_at' => $validityDays ? now()->addDays($validityDays) : null,
                    'invoice_required' => $invoiceRequired,
                ]);
            } catch (UniqueConstraintViolationException) {
                // bentrok kode acak: ulangi dengan akhiran baru
            }
        }

        throw ApiException::unavailable('Gagal membuat kode kuesioner unik. Coba lagi.');
    }

    private function resolvePackage(?int $packageId): MasterPackage
    {
        // Hanya master paket berflag `is_assessment` (aktif) yang boleh dipilih admin; harganya jadi nominal invoice. Tanpa pilihan: paket asesmen pertama.
        $query = MasterPackage::query()->where('is_active', true)->where('is_assessment', true);
        $package = $packageId !== null ? $query->find($packageId) : $query->orderBy('id')->first();

        return $package ?? throw ApiException::validation(['master_package_id' => ['Pilih paket asesmen (master paket bertanda Assessment) untuk invoice, atau terbitkan tanpa invoice. Buat paketnya di Finance → Master Paket.']]);
    }

    private function issueInvoice(Client $client, AssessmentAccessCode $code, MasterPackage $package): void
    {
        $invoice = Invoice::create([
            'invoice_number' => $this->numbers->next('ASM'),
            'client_id' => $client->id,
            'branch_id' => $client->branch_id,
            'master_package_id' => null, // invoice asesmen tidak membuat paket kredit; nominal & nama disalin sebagai snapshot
            'invoice_type' => 'assessment',
            'assessment_access_code_id' => $code->id,
            'type_code' => 'ASM',
            'package_name' => 'Assessment '.$code->category()->value('name').' — '.$package->name,
            'credits' => 0,
            'amount' => $package->price,
            'gross_amount' => $package->price,
            'status' => 'unpaid',
            'issued_at' => now(),
        ]);

        InvoiceLog::create([
            'invoice_id' => $invoice->id,
            'action' => 'issued',
            'actor_name' => Auth::user()?->name,
            'actor_id' => Auth::id(),
            'note' => "Invoice asesmen untuk kode {$code->code}",
        ]);
    }

    private function randomSuffix(): string
    {
        $out = '';
        for ($i = 0; $i < 6; $i++) {
            $out .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
        }

        return $out;
    }
}
