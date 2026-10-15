<?php

namespace App\Actions\Client;

use App\Models\Client;
use App\Models\ClientDocument;
use Illuminate\Support\Facades\DB;

/**
 * Link Google Drive client (`client_documents`, type `gdrive_folder`). Dokumen = link saja, tanpa upload file.
 */
class GdriveLinkActions
{
    public function add(int $clientId, string $url, ?string $label): ClientDocument
    {
        return DB::transaction(function () use ($clientId, $url, $label): ClientDocument {
            $client = Client::query()->lockForUpdate()->findOrFail($clientId);

            return $client->clientDocuments()->create([
                'type' => 'gdrive_folder',
                'label' => $label !== null && trim($label) !== '' ? trim($label) : null,
                'url' => $url,
            ]);
        });
    }

    public function delete(int $clientId, int $documentId): void
    {
        // Client dicari lewat BranchScope dulu: dokumen client cabang lain -> 404
        $client = Client::query()->findOrFail($clientId);
        $client->clientDocuments()->where('type', 'gdrive_folder')->findOrFail($documentId)->delete();
    }
}
