<?php

namespace App\Http\Resources\Organization;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Daftar ringan terapis untuk dropdown/penjadwalan (dibaca semua staf). Sengaja tanpa email, telepon, atau data akun.
 *
 * @mixin User
 */
class TherapistResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'title' => $this->title,
            'specialty' => $this->specialty,
            'branch_id' => $this->branch_id,
            'max_sessions_per_month' => $this->max_sessions_per_month,
        ];
    }
}
