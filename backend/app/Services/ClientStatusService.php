<?php

namespace App\Services;

use App\Models\Client;

/**
 * Aturan transisi status pipeline client (schema.md §6.6). Padanan `domain/client.js` di frontend
 * (`advanceStatus`, `buildActivationPatch`, `buildStatusChangePatch`). Pure: tidak menyentuh DB.
 *
 * - Otomatis (sync layanan, terbit kode, jadwal asesmen, sesi asesmen selesai) hanya MAJU: `advance()`.
 * - Manual boleh ke tahap mana pun (maju, mundur, koreksi outcome, reaktivasi): `manualPatch()`.
 * - Tanpa tabel riwayat tahap; jejak cukup `status_changed_at` + `updated_by`.
 */
class ClientStatusService
{
    public const STATUSES = [
        'inquiry', 'service_selected', 'assessment_scheduled', 'assessment_done',
        'admitted', 'done_consult', 'done_assessment', 'discontinued', 'discharged',
    ];

    /** Alur utama (urut). Hasil akhir (done_*, discontinued, discharged) di luar urutan ini. */
    public const FLOW = ['inquiry', 'service_selected', 'assessment_scheduled', 'assessment_done', 'admitted'];

    /** Status yang wajib menyertakan alasan keluar. */
    public const REASON_REQUIRED = ['discharged', 'discontinued'];

    /** Status otomatis hanya MAJU; selain itu (hasil akhir / sudah lewat target) dibiarkan. */
    public function advance(string $current, string $target): string
    {
        $from = array_search($current, self::FLOW, true);
        $to = array_search($target, self::FLOW, true);

        return $from !== false && $to !== false && $from < $to ? $target : $current;
    }

    /**
     * Atribut yang diubah oleh perubahan status MANUAL ke `$to` (kolom snake_case). `$today` = `Y-m-d` dari pemanggil.
     *
     * @return array<string, mixed>
     */
    public function manualPatch(Client $client, string $to, string $today, ?string $reason = null, ?string $note = null): array
    {
        $clearExit = [
            'date_of_discharge' => null,
            'date_of_discontinue' => null,
            'discharge_reason' => null,
            'discharge_note' => null,
        ];

        return match ($to) {
            'admitted' => [
                'status' => 'admitted',
                'final_outcome' => 'admitted',
                'date_of_join' => $client->date_of_join?->toDateString() ?? $today, // admit pertama; dipertahankan saat reaktivasi
            ] + $clearExit,
            'done_consult', 'done_assessment' => ['status' => $to, 'final_outcome' => $to] + $clearExit,
            // Catatan: array_merge (bukan `+`) supaya nilai belakangan menimpa $clearExit
            'discontinued' => array_merge(['status' => 'discontinued', 'final_outcome' => 'discontinued'], $clearExit, [
                'date_of_discontinue' => $today, 'discharge_reason' => $this->clean($reason), 'discharge_note' => $this->clean($note),
            ]),
            // Discharge tidak mengubah final_outcome (tetap `admitted`)
            'discharged' => array_merge(['status' => 'discharged'], $clearExit, [
                'date_of_discharge' => $today, 'discharge_reason' => $this->clean($reason), 'discharge_note' => $this->clean($note),
            ]),
            default => ['status' => $to, 'final_outcome' => null] + $clearExit, // tahap awal: koreksi / mundur
        };
    }

    private function clean(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}
