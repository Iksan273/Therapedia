<?php

namespace App\Services;

use App\Models\RolePermission;
use App\Models\User;

/**
 * Hak akses berbasis modul (schema.md §04-A, implementation_detail §1.1). Dimemo per request: satu query per role.
 * `master` selalu boleh. Hapus client / cabang (data penting) hanya `master`; hapus operasional cukup akses modul.
 */
class PermissionService
{
    public const MASTER_ROLE = 'master';

    /** @var array<int, array<string, bool>> */
    private array $memo = [];

    public function isMaster(User $user): bool
    {
        return $user->role?->code === self::MASTER_ROLE;
    }

    public function allows(User $user, string $module): bool
    {
        return $this->isMaster($user) || ($this->modules($user)[$module] ?? false);
    }

    /** @param  array<int, string>  $modules */
    public function allowsAny(User $user, array $modules): bool
    {
        foreach ($modules as $module) {
            if ($this->allows($user, $module)) {
                return true;
            }
        }

        return false;
    }

    public function allowsDelete(User $user, string $module, bool $masterOnly = false): bool
    {
        if ($this->isMaster($user)) {
            return true;
        }

        return ! $masterOnly && $this->allows($user, $module);
    }

    /** @return array<string, bool> kode modul => diizinkan */
    public function modules(User $user): array
    {
        return $this->memo[$user->role_id] ??= RolePermission::query()
            ->where('role_id', $user->role_id)
            ->pluck('allowed', 'module_code')
            ->map(fn ($allowed) => (bool) $allowed)
            ->all();
    }
}
