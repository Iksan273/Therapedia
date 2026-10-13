<?php

namespace App\Services;

use App\Exceptions\NotImplementedException;

/**
 * User staf & terapis (M2, modul user_management). `branch_id` NULL = semua cabang.
 *
 * SKELETON setup: tanda tangan method saja; logika (transaksi, aturan bisnis) diisi per use-case.
 * Acuan aturan: schema.md §06 dan frontend/src/domain/*.
 */
class UserService
{
    /** list ber-pagination (default 10, maks 50), pencarian prefix, BranchScope */
    public function paginate(array $filters = []): mixed
    {
        throw new NotImplementedException('UserService::paginate');
    }

    public function find(string $id): mixed
    {
        throw new NotImplementedException('UserService::find');
    }

    public function create(array $data): mixed
    {
        throw new NotImplementedException('UserService::create');
    }

    /** kirim `version` bila entity ber-optimistic-lock */
    public function update(string $id, array $data): mixed
    {
        throw new NotImplementedException('UserService::update');
    }

    public function delete(string $id): void
    {
        throw new NotImplementedException('UserService::delete');
    }
}
