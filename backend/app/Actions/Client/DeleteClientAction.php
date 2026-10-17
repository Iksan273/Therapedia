<?php

namespace App\Actions\Client;

use App\Actions\Organization\UserGuard;
use App\Exceptions\ApiException;
use App\Models\AssessmentAccessCode;
use App\Models\Client;
use App\Models\PaymentProof;
use App\Models\User;
use App\Services\AssessmentDocumentFiles;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Hapus client PERMANEN (hanya Master, ADR 0005). FK CASCADE menghapus layanan, dokumen, kode/respons/draft kuesioner,
 * seri & jadwal (+laporan), cuti, invoice (+bukti, log), paket, konversi, dan ledger. Tidak ada syarat revert sesi.
 * Kode client tidak dipakai ulang (counter tidak turun). File bukti bayar dihapus sinkron SETELAH commit; kegagalan
 * hapus file hanya dicatat di log aplikasi. Satu baris log: pelaku, client, jumlah baris yang terhapus.
 */
class DeleteClientAction
{
    public function __invoke(User $actor, int $id): void
    {
        if (! UserGuard::isMasterUser($actor)) {
            throw ApiException::forbidden('Hanya Master yang boleh menghapus client.');
        }

        $files = [];
        $frozenDocs = [];
        $summary = [];

        DB::transaction(function () use ($id, &$files, &$frozenDocs, &$summary): void {
            $client = Client::query()->lockForUpdate()->findOrFail($id);

            // PDF section yang dibekukan di kuesioner client ini (file master yang sudah diganti hanya hidup lewat snapshot itu)
            $frozenDocs = AssessmentAccessCode::query()->where('client_id', $client->id)->whereNotNull('structure_snapshot')->pluck('structure_snapshot')
                ->flatMap(fn ($snap) => array_column((array) ($snap['sections'] ?? []), 'document_path'))
                ->filter()->unique()->values()->all();

            $files = PaymentProof::query()
                ->whereIn('invoice_id', $client->invoices()->withoutGlobalScopes()->select('id'))
                ->pluck('file_path')
                ->all();

            $summary = [
                'client_code' => $client->client_code,
                'schedules' => $client->schedules()->withoutGlobalScopes()->count(),
                'invoices' => $client->invoices()->withoutGlobalScopes()->count(),
                'packages' => $client->clientPackages()->count(),
                'proof_files' => count($files),
            ];

            $client->delete();
        });

        foreach ($files as $path) {
            try {
                Storage::delete($path);
            } catch (\Throwable $e) {
                Log::warning('Gagal menghapus file bukti bayar client terhapus.', ['path' => $path, 'error' => $e->getMessage()]);
            }
        }

        foreach ($frozenDocs as $path) {
            app(AssessmentDocumentFiles::class)->release($path); // dibuang bila tidak dirujuk kuesioner lain yang sedang diisi
        }

        Log::info('Client dihapus permanen.', ['actor_id' => $actor->id, 'client_id' => $id] + $summary);
    }
}
