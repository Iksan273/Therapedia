<?php

namespace App\Actions\Client;

use App\Models\Client;

/**
 * TITIK SAMBUNG Sprint 2 (jadwal & kredit). Dipanggil `TransitionClientAction` di dalam transaksi yang sama saat
 * client di-discharge. Yang akan dikerjakan di sini (schema.md §6.6):
 *  - hapus permanen semua `schedules` aktif (scheduled / rescheduled / reschedule_pending, termasuk seri);
 *  - tulis ledger `discharge` (-sisa kredit per paket aktif) dan tandai paket `depleted`;
 *  - nolkan `clients.credit_balance`.
 * Sampai Sprint 2, discharge di M4 hanya mengubah status, alasan, dan tanggal.
 */
class ApplyDischargeEffects
{
    public function handle(Client $client): void
    {
        // Sprint 2 (hari 3-4): efek jadwal + ledger.
    }
}
