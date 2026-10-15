<?php

namespace App\Actions\Client;

use App\Exceptions\ApiException;
use App\Models\Client;
use App\Models\ClientService;
use App\Models\Service;
use App\Services\ClientStatusService;
use Illuminate\Support\Facades\DB;

/**
 * Atur layanan yang dipilih client (`PUT /clients/{id}/services`), hanya layanan aktif.
 * Daftar tidak kosong dan status masih `inquiry` -> otomatis `service_selected`. Melepas semua layanan TIDAK memundurkan status.
 * Layanan yang sudah terpasang dan kini nonaktif boleh tetap ada (tidak ikut divalidasi ulang).
 */
class SyncClientServicesAction
{
    public function __construct(private readonly ClientStatusService $statuses) {}

    /** @param  list<string>  $serviceCodes */
    public function handle(int $clientId, array $serviceCodes, ?int $actorId): Client
    {
        $codes = array_values(array_unique($serviceCodes));

        return DB::transaction(function () use ($clientId, $codes, $actorId): Client {
            $client = Client::query()->lockForUpdate()->findOrFail($clientId);

            $current = ClientService::query()->where('client_id', $client->id)->pluck('service_code')->all();
            $added = array_values(array_diff($codes, $current));
            $removed = array_values(array_diff($current, $codes));

            $active = Service::query()->whereIn('code', $added)->where('is_active', true)->pluck('code')->all();
            $invalid = array_values(array_diff($added, $active));
            if ($invalid !== []) {
                throw ApiException::validation(['service_codes' => ['Layanan tidak tersedia atau nonaktif: '.implode(', ', $invalid).'.']]);
            }

            if ($removed !== []) {
                ClientService::query()->where('client_id', $client->id)->whereIn('service_code', $removed)->delete();
            }
            foreach ($added as $code) {
                ClientService::query()->create(['client_id' => $client->id, 'service_code' => $code, 'selected_at' => now(), 'selected_by' => $actorId]);
            }

            if ($codes !== []) {
                $next = $this->statuses->advance($client->status, 'service_selected');
                if ($next !== $client->status) {
                    $client->fill(['status' => $next, 'status_changed_at' => now()])->save();
                }
            }

            return $client->refresh()->load(['branch', 'clientServices', 'clientDocuments']);
        });
    }
}
