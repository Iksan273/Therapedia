<?php

namespace App\Services;

use App\Exceptions\NotImplementedException;

/**
 * Dashboard dari view v_daily_* (M11), selalu filter cabang + rentang tanggal.
 *
 * SKELETON setup: tanda tangan method saja; logika (transaksi, aturan bisnis) diisi per use-case.
 * Acuan aturan: schema.md §06 dan frontend/src/domain/*.
 */
class DashboardService
{
    /** v_daily_revenue */
    public function revenue(array $filters): mixed
    {
        throw new NotImplementedException('DashboardService::revenue');
    }

    /** funnel dari `clients` (tanpa riwayat status) */
    public function inquiry(array $filters): mixed
    {
        throw new NotImplementedException('DashboardService::inquiry');
    }

    /** v_daily_sessions */
    public function schedule(array $filters): mixed
    {
        throw new NotImplementedException('DashboardService::schedule');
    }

    public function branchPerformance(array $filters): mixed
    {
        throw new NotImplementedException('DashboardService::branchPerformance');
    }
}
