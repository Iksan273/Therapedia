<?php

namespace App\Http\Resources\Auth;

use App\Models\User;
use App\Services\PermissionService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Profil staf untuk respons login & `GET /auth/me`: peran, cabang, dan matriks modul
 * (frontend `useAuth().hasPermission` membaca dari sini tanpa request tambahan). Tanpa `password`/kolom pelaku.
 *
 * @mixin User
 */
class StaffSessionResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $permissions = app(PermissionService::class);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'title' => $this->title,
            'specialty' => $this->specialty,
            'role' => [
                'code' => $this->role->code,
                'name' => $this->role->name,
                'badge' => $this->role->badge,
            ],
            'is_master' => $permissions->isMaster($this->resource),
            'branch_id' => $this->branch_id,
            'branch' => $this->branch ? [
                'id' => $this->branch->id,
                'code' => $this->branch->code,
                'name' => $this->branch->name,
            ] : null,
            'must_change_password' => (bool) $this->must_change_password,
            'permissions' => $permissions->effectiveModules($this->resource),
        ];
    }
}
