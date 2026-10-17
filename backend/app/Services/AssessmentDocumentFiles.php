<?php

namespace App\Services;

use App\Models\AssessmentAccessCode;
use Illuminate\Support\Facades\Storage;

/**
 * Siklus hidup file PDF section. Kuesioner yang sedang diisi memegang struktur beku (`structure_snapshot`) yang menyimpan
 * `document_path` saat dibekukan, jadi file yang diganti/dihapus di master TIDAK langsung dibuang: ia dipertahankan selama masih ada
 * kode `issued` ber-snapshot yang merujuknya (ortu melihat PDF yang sama dari awal sampai kirim), lalu dibuang saat kuesioner terakhir
 * yang memakainya dikirim (`releaseAfterSubmit`).
 */
class AssessmentDocumentFiles
{
    /** Hapus file bila tidak ada lagi kuesioner yang sedang diisi yang merujuknya. */
    public function release(?string $path): void
    {
        if ($path === null || $path === '' || $this->isInUse($path)) {
            return;
        }

        Storage::delete($path);
    }

    /** Setelah kode dikirim: file di snapshot yang sudah bukan file section saat ini dilepas (bila tidak dipakai kode lain). */
    public function releaseAfterSubmit(array $snapshot, array $currentPathBySection): void
    {
        foreach ($snapshot['sections'] ?? [] as $section) {
            $path = $section['document_path'] ?? null;
            if ($path !== null && ($currentPathBySection[(int) $section['id']] ?? null) !== $path) {
                $this->release($path);
            }
        }
    }

    private function isInUse(string $path): bool
    {
        return AssessmentAccessCode::query()
            ->where('status', 'issued')->whereNotNull('snapshot_at')
            ->whereRaw("JSON_SEARCH(structure_snapshot, 'one', ?) IS NOT NULL", [$path])
            ->exists();
    }
}
