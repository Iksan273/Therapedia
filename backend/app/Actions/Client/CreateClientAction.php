<?php

namespace App\Actions\Client;

use App\Exceptions\ApiException;
use App\Models\Branch;
use App\Models\Client;
use App\Models\User;
use App\Services\ClientCodeService;
use Illuminate\Support\Facades\DB;

/**
 * Intake client baru: status `inquiry`, kode `AE-00001` dibuat server (counter atomik, tidak dipakai ulang).
 * Cabang: staf ber-cabang dipaksa cabangnya; master / staf semua cabang wajib memilih cabang aktif.
 */
class CreateClientAction
{
    public function __construct(private readonly ClientCodeService $codes) {}

    public function handle(User $actor, array $data): Client
    {
        $branchId = $this->resolveBranch($actor, $data['branch_id'] ?? null);

        return DB::transaction(function () use ($data, $branchId): Client {
            $client = Client::query()->create([
                'client_code' => $this->codes->next($data['child_name']),
                'branch_id' => $branchId,
                'child_name' => $data['child_name'],
                'gender' => $data['gender'],
                'date_of_birth' => $data['date_of_birth'],
                'parent_name' => $data['parent_name'],
                'parent_phone' => $data['parent_phone'],
                'parent_email' => $data['parent_email'] ?? null,
                'address' => $data['address'] ?? null,
                'intake_note' => $data['intake_note'] ?? null,
                'status' => 'inquiry',
                'status_changed_at' => now(),
            ]);

            return $client->refresh()->load(['branch', 'clientServices']);
        });
    }

    private function resolveBranch(User $actor, mixed $requested): int
    {
        if ($actor->branch_id !== null) {
            return (int) $actor->branch_id;
        }

        $branch = $requested === null || $requested === '' ? null : Branch::query()->find($requested);
        if ($branch === null) {
            throw ApiException::validation(['branch_id' => ['Cabang wajib dipilih.']]);
        }
        if (! $branch->is_active) {
            throw ApiException::validation(['branch_id' => ['Cabang tidak aktif. Pilih cabang yang aktif.']]);
        }

        return (int) $branch->id;
    }
}
