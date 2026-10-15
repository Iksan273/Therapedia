<?php

namespace App\Actions\Client;

use App\Models\Client;
use Illuminate\Support\Facades\DB;

/**
 * Ubah biodata client (`PATCH /clients/{id}`). Kode client TIDAK berubah walau nama diedit; cabang dan status juga
 * tidak diubah di sini (status lewat transition). `version` wajib (409 `version_conflict` bila usang).
 */
class UpdateClientAction
{
    private const EDITABLE = ['child_name', 'gender', 'date_of_birth', 'parent_name', 'parent_phone', 'parent_email', 'address', 'intake_note'];

    public function handle(int $clientId, array $data): Client
    {
        return DB::transaction(function () use ($clientId, $data): Client {
            $client = Client::query()->lockForUpdate()->findOrFail($clientId);
            $client->assertVersion($data['version'] ?? null);

            $client->fill(array_intersect_key($data, array_flip(self::EDITABLE)))->save();

            return $client->refresh()->load(['branch', 'clientServices', 'clientDocuments']);
        });
    }
}
