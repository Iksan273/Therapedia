<?php

namespace App\Actions\Organization;

use App\Exceptions\ApiException;
use App\Models\Role;
use App\Models\User;
use App\Services\PermissionService;

/**
 * Pagar keamanan manajemen akun (dipakai Action user). Aturan:
 * - Akun/role `master` hanya boleh diatur oleh master (akses modul `user_management` saja tidak cukup).
 * - Pengatur yang terikat 1 cabang hanya boleh mengelola akun di cabangnya sendiri (data cabang lain = 404).
 * - Master aktif terakhir tidak boleh diturunkan rolenya atau dinonaktifkan (cegah sistem tanpa master).
 */
final class UserGuard
{
    public static function isMasterRole(Role $role): bool
    {
        return $role->code === PermissionService::MASTER_ROLE;
    }

    public static function isMasterUser(User $user): bool
    {
        return $user->role?->code === PermissionService::MASTER_ROLE;
    }

    /** Hanya master yang boleh memberi/menyentuh role master. */
    public static function assertMayAssignRole(User $actor, Role $role): void
    {
        if (self::isMasterRole($role) && ! self::isMasterUser($actor)) {
            throw ApiException::forbidden('Hanya Master yang boleh memberi role Master.');
        }
    }

    /** Pengatur boleh mengelola `$target`? (master hanya oleh master; akun cabang lain disembunyikan). */
    public static function assertMayManage(User $actor, User $target): void
    {
        if ($actor->branch_id !== null && (int) $target->branch_id !== (int) $actor->branch_id) {
            throw ApiException::notFound();
        }

        if (self::isMasterUser($target) && ! self::isMasterUser($actor)) {
            throw ApiException::forbidden('Hanya Master yang boleh mengubah akun Master.');
        }
    }

    /** Apakah `$target` satu-satunya master aktif? */
    public static function isLastActiveMaster(User $target): bool
    {
        if (! self::isMasterUser($target) || ! $target->is_active) {
            return false;
        }

        return ! User::query()
            ->where('is_active', true)
            ->where('id', '!=', $target->id)
            ->whereHas('role', fn ($q) => $q->where('code', PermissionService::MASTER_ROLE))
            ->exists();
    }
}
