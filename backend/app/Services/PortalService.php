<?php

namespace App\Services;

use App\Exceptions\NotImplementedException;

/**
 * Portal orang tua (M10): profil, tagihan (tanpa invoice void), kredit, riwayat sesi + laporan.
 *
 * SKELETON setup: tanda tangan method saja; logika (transaksi, aturan bisnis) diisi per use-case.
 * Acuan aturan: schema.md §06 dan frontend/src/domain/*.
 */
class PortalService
{
    public function profile(mixed $client): mixed
    {
        throw new NotImplementedException('PortalService::profile');
    }

    public function invoices(mixed $client): mixed
    {
        throw new NotImplementedException('PortalService::invoices');
    }

    public function credits(mixed $client): mixed
    {
        throw new NotImplementedException('PortalService::credits');
    }

    public function sessions(mixed $client): mixed
    {
        throw new NotImplementedException('PortalService::sessions');
    }
}
