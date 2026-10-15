<?php

namespace App\Actions\Client;

use App\Exceptions\ApiException;
use App\Models\Client;
use App\Services\ClientStatusService;
use Illuminate\Support\Facades\DB;

/**
 * Ubah status pipeline secara MANUAL ke tahap mana pun (`POST /clients/{id}/transition`).
 * Discharge / discontinue wajib `reason`. Status sama = tidak ada perubahan (`changed = false`, `version` tetap).
 * Admit TIDAK membuat paket kredit (saldo 0 = Frozen sampai Finance mengaktifkan paket).
 */
class TransitionClientAction
{
    public function __construct(
        private readonly ClientStatusService $statuses,
        private readonly ApplyDischargeEffects $dischargeEffects,
    ) {}

    /** @return array{client: Client, changed: bool} */
    public function handle(int $clientId, array $data): array
    {
        $to = (string) $data['to_status'];
        $reason = isset($data['reason']) ? trim((string) $data['reason']) : '';

        if (in_array($to, ClientStatusService::REASON_REQUIRED, true) && $reason === '') {
            throw ApiException::validation(['reason' => ['Alasan wajib diisi untuk Discharge / Discontinue.']]);
        }

        return DB::transaction(function () use ($clientId, $data, $to, $reason): array {
            $client = Client::query()->lockForUpdate()->findOrFail($clientId);
            $client->assertVersion($data['version'] ?? null);

            if ($client->status === $to) {
                return ['client' => $client, 'changed' => false];
            }

            $patch = $this->statuses->manualPatch($client, $to, now()->toDateString(), $reason, $data['note'] ?? null);
            $client->fill($patch + ['status_changed_at' => now()])->save();

            if ($to === 'discharged') {
                $this->dischargeEffects->handle($client);
            }

            return ['client' => $client->refresh(), 'changed' => true];
        });
    }
}
