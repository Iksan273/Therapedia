<?php

namespace App\Http\Resources\Auth;

use App\Http\Resources\Organization\BranchBankAccountResource;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Ringkasan client (ortu) untuk respons login portal & `GET /auth/me`. Tidak memuat hasil asesmen
 * (ortu tidak melihat hasil). `frozen` turunan dari saldo kredit (tidak disimpan).
 *
 * @mixin Client
 */
class ClientSessionResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'client_code' => $this->client_code,
            'child_name' => $this->child_name,
            'parent_name' => $this->parent_name,
            'status' => $this->status,
            'branch_id' => $this->branch_id,
            'branch' => $this->branch ? [
                'id' => $this->branch->id,
                'code' => $this->branch->code,
                'name' => $this->branch->name,
                // Info pembayaran untuk ortu: hanya rekening aktif
                'bank_accounts' => BranchBankAccountResource::collection(
                    $this->branch->bankAccounts()->where('is_active', true)->get()
                )->resolve(),
            ] : null,
            'credit_balance' => (int) $this->credit_balance,
            'frozen' => (int) $this->credit_balance === 0,
        ];
    }
}
