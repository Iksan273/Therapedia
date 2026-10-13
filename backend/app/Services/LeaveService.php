<?php

namespace App\Services;

use App\Exceptions\NotImplementedException;

/**
 * Cuti client, dicatat Finance (M6, schema.md §6.8): catat, akhiri lebih awal, void, reset tahunan.
 *
 * SKELETON setup: tanda tangan method saja; logika (transaksi, aturan bisnis) diisi per use-case.
 * Acuan aturan: schema.md §06 dan frontend/src/domain/*.
 */
class LeaveService
{
    public function paginate(array $filters = []): mixed
    {
        throw new NotImplementedException('LeaveService::paginate');
    }

    public function find(string $id): mixed
    {
        throw new NotImplementedException('LeaveService::find');
    }

    /** wajib ada sesi terapi di rentang; sesi dibatalkan `OL` */
    public function record(array $data): mixed
    {
        throw new NotImplementedException('LeaveService::record');
    }

    public function end(string $id, array $data): mixed
    {
        throw new NotImplementedException('LeaveService::end');
    }

    public function void(string $id, array $data): mixed
    {
        throw new NotImplementedException('LeaveService::void');
    }

    /** hanguskan sisa cuti, jatah 30 hari */
    public function annualReset(): mixed
    {
        throw new NotImplementedException('LeaveService::annualReset');
    }
}
