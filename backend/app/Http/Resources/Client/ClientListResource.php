<?php

namespace App\Http\Resources\Client;

use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Baris client untuk daftar (pipeline, roster, picker jadwal). `frozen` = turunan dari saldo kredit 0 (tidak disimpan).
 *
 * @mixin Client
 */
class ClientListResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'client_code' => $this->client_code,
            'child_name' => $this->child_name,
            'gender' => $this->gender,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'parent_name' => $this->parent_name,
            'parent_phone' => $this->parent_phone,
            'branch_id' => $this->branch_id,
            'branch' => $this->whenLoaded('branch', fn () => $this->branch ? [
                'id' => $this->branch->id,
                'code' => $this->branch->code,
                'name' => $this->branch->name,
            ] : null),
            'status' => $this->status,
            'final_outcome' => $this->final_outcome,
            'status_changed_at' => $this->status_changed_at?->toIso8601String(),
            'date_of_join' => $this->date_of_join?->toDateString(),
            'date_of_discharge' => $this->date_of_discharge?->toDateString(),
            'date_of_discontinue' => $this->date_of_discontinue?->toDateString(),
            'discharge_reason' => $this->discharge_reason,
            'credit_balance' => (int) $this->credit_balance,
            'frozen' => (int) $this->credit_balance === 0,
            'service_codes' => $this->whenLoaded('clientServices', fn () => $this->clientServices->pluck('service_code')->values()->all()),
            'version' => (int) $this->version,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
