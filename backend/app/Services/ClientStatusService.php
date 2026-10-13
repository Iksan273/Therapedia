<?php

namespace App\Services;

/**
 * Transisi status pipeline client (schema.md §6.6).
 *
 * SKELETON setup: belum ada logika. Tanggung jawab:
 * - Otomatis hanya maju (`advanceStatus`), manual ke tahap mana pun (`buildStatusChangePatch`); simpan `status`, `status_changed_at`, `updated_by`, tanggal join/discharge/discontinue. Tanpa tabel riwayat.
 * - Discharge: hapus sesi aktif + hanguskan sisa sesi (ledger `discharge`).
 * - Aturan acuan: frontend/src/domain/client.js.
 */
class ClientStatusService
{
    //
}
