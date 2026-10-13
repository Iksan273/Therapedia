<?php

namespace App\Http\Resources\Organization;

use App\Models\Role;
use App\Services\PermissionService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Role + izinnya. `permissions` = DAFTAR kode modul yang diizinkan (urut sort_order), bukan kamus berkunci kode modul
 * (konvensi key JSON). Role `master` selalu memuat semua modul. Muat relasi `rolePermissions` agar tidak N+1.
 *
 * @mixin Role
 */
class RoleResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $permissions = app(PermissionService::class);

        $codes = $this->code === PermissionService::MASTER_ROLE
            ? $permissions->moduleCodes()
            : $permissions->sortModuleCodes($this->rolePermissions->where('allowed', true)->pluck('module_code'));

        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'badge' => $this->badge,
            'description' => $this->description,
            'is_system' => (bool) $this->is_system,
            'users_count' => $this->whenCounted('users'),
            'permissions' => $codes,
        ];
    }
}
