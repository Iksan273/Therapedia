<?php

namespace App\Services;

use App\Exceptions\NotImplementedException;

/**
 * Client & pipeline (M4): intake, layanan, dokumen, transisi status, hapus permanen cascade (hanya master).
 *
 * SKELETON setup: tanda tangan method saja; logika (transaksi, aturan bisnis) diisi per use-case.
 * Acuan aturan: schema.md §06 dan frontend/src/domain/*.
 */
class ClientService
{
    /** list ber-pagination (default 10, maks 50), pencarian prefix, BranchScope */
    public function paginate(array $filters = []): mixed
    {
        throw new NotImplementedException('ClientService::paginate');
    }

    public function find(string $id): mixed
    {
        throw new NotImplementedException('ClientService::find');
    }

    public function create(array $data): mixed
    {
        throw new NotImplementedException('ClientService::create');
    }

    /** kirim `version` bila entity ber-optimistic-lock */
    public function update(string $id, array $data): mixed
    {
        throw new NotImplementedException('ClientService::update');
    }

    public function delete(string $id): void
    {
        throw new NotImplementedException('ClientService::delete');
    }

    /** TransitionClientAction (ClientStatusService) */
    public function transition(string $id, array $data): mixed
    {
        throw new NotImplementedException('ClientService::transition');
    }

    /** SyncClientServicesAction */
    public function syncServices(string $id, array $serviceCodes): mixed
    {
        throw new NotImplementedException('ClientService::syncServices');
    }

    public function documents(string $clientId): mixed
    {
        throw new NotImplementedException('ClientService::documents');
    }

    public function findDocument(string $id): mixed
    {
        throw new NotImplementedException('ClientService::findDocument');
    }

    public function addDocument(string $clientId, array $data): mixed
    {
        throw new NotImplementedException('ClientService::addDocument');
    }

    public function updateDocument(string $id, array $data): mixed
    {
        throw new NotImplementedException('ClientService::updateDocument');
    }

    public function deleteDocument(string $id): void
    {
        throw new NotImplementedException('ClientService::deleteDocument');
    }
}
