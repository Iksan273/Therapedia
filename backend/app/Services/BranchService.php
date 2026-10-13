<?php

namespace App\Services;

use App\Exceptions\NotImplementedException;

/**
 * Master Cabang (M2, modul branch_master). Hapus cabang hanya master (DeleteBranchAction).
 *
 * SKELETON setup: tanda tangan method saja; logika (transaksi, aturan bisnis) diisi per use-case.
 * Acuan aturan: schema.md §06 dan frontend/src/domain/*.
 */
class BranchService
{
    /** list ber-pagination (default 10, maks 50), pencarian prefix, BranchScope */
    public function paginate(array $filters = []): mixed
    {
        throw new NotImplementedException('BranchService::paginate');
    }

    public function find(string $id): mixed
    {
        throw new NotImplementedException('BranchService::find');
    }

    public function create(array $data): mixed
    {
        throw new NotImplementedException('BranchService::create');
    }

    /** kirim `version` bila entity ber-optimistic-lock */
    public function update(string $id, array $data): mixed
    {
        throw new NotImplementedException('BranchService::update');
    }

    public function delete(string $id): void
    {
        throw new NotImplementedException('BranchService::delete');
    }
}
