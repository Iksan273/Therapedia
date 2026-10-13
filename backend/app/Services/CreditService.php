<?php

namespace App\Services;

use App\Exceptions\NotImplementedException;

/**
 * Paket kredit & ledger append-only (M7): saldo, FIFO, idempotensi, reversal, rekonsiliasi.
 *
 * SKELETON setup: tanda tangan method saja; logika (transaksi, aturan bisnis) diisi per use-case.
 * Acuan aturan: schema.md §06 dan frontend/src/domain/*.
 */
class CreditService
{
    public function paginatePackages(array $filters = []): mixed
    {
        throw new NotImplementedException('CreditService::paginatePackages');
    }

    public function findPackage(string $id): mixed
    {
        throw new NotImplementedException('CreditService::findPackage');
    }

    /** keyset pagination (cursor) */
    public function ledger(array $filters = []): mixed
    {
        throw new NotImplementedException('CreditService::ledger');
    }

    /** AdjustCreditAction: manual_adjust, alasan wajib */
    public function adjust(array $data): mixed
    {
        throw new NotImplementedException('CreditService::adjust');
    }

    /** tulis baris ledger + saldo paket/client di transaksi yang sama */
    public function record(array $entry): mixed
    {
        throw new NotImplementedException('CreditService::record');
    }

    /** baris `reversal` (sekali per baris) */
    public function reverse(string $ledgerId, string $note): mixed
    {
        throw new NotImplementedException('CreditService::reverse');
    }
}
