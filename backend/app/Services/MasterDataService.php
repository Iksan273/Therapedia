<?php

namespace App\Services;

use App\Exceptions\NotImplementedException;

/**
 * Master data kecil (M3): services, quadrants, cancel-reasons, discharge-reasons, packages, holidays. `$resource` = salah satu kunci itu.
 *
 * SKELETON setup: tanda tangan method saja; logika (transaksi, aturan bisnis) diisi per use-case.
 * Acuan aturan: schema.md §06 dan frontend/src/domain/*.
 */
class MasterDataService
{
    public function paginate(string $resource, array $filters = []): mixed
    {
        throw new NotImplementedException('MasterDataService::paginate');
    }

    public function find(string $resource, string $id): mixed
    {
        throw new NotImplementedException('MasterDataService::find');
    }

    public function create(string $resource, array $data): mixed
    {
        throw new NotImplementedException('MasterDataService::create');
    }

    /** hari libur: tolak duplikat (tanggal, cabang) */
    public function update(string $resource, string $id, array $data): mixed
    {
        throw new NotImplementedException('MasterDataService::update');
    }

    /** 409 `in_use` bila sudah dipakai (kecuali pilihan string & libur) */
    public function delete(string $resource, string $id): void
    {
        throw new NotImplementedException('MasterDataService::delete');
    }
}
