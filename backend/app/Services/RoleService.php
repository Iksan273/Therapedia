<?php

namespace App\Services;

use App\Exceptions\NotImplementedException;

/**
 * Role & matriks akses modul (M2, modul rbac).
 *
 * SKELETON setup: tanda tangan method saja; logika (transaksi, aturan bisnis) diisi per use-case.
 * Acuan aturan: schema.md §06 dan frontend/src/domain/*.
 */
class RoleService
{
    /** list ber-pagination (default 10, maks 50), pencarian prefix, BranchScope */
    public function paginate(array $filters = []): mixed
    {
        throw new NotImplementedException('RoleService::paginate');
    }

    public function find(string $id): mixed
    {
        throw new NotImplementedException('RoleService::find');
    }

    public function create(array $data): mixed
    {
        throw new NotImplementedException('RoleService::create');
    }

    /** kirim `version` bila entity ber-optimistic-lock */
    public function update(string $id, array $data): mixed
    {
        throw new NotImplementedException('RoleService::update');
    }

    public function delete(string $id): void
    {
        throw new NotImplementedException('RoleService::delete');
    }

    public function updatePermission(string $roleId, string $module, bool $allowed): void
    {
        throw new NotImplementedException('RoleService::updatePermission');
    }
}
