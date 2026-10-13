<?php

namespace App\Actions\Organization;

use App\Exceptions\ApiException;
use App\Models\Branch;
use App\Models\Role;
use App\Models\User;

/**
 * Menentukan `branch_id` akhir sebuah akun (dipakai CreateUserAction dan UpdateUserAction):
 * - role master → NULL (semua cabang);
 * - pengatur yang terikat 1 cabang → selalu cabangnya sendiri (nilai request diabaikan);
 * - selain itu nilai request (NULL = semua cabang), dan cabang harus aktif.
 */
final class ResolveUserBranch
{
    public static function for(User $actor, Role $role, mixed $requested): ?int
    {
        if (UserGuard::isMasterRole($role)) {
            return null;
        }

        if ($actor->branch_id !== null) {
            return (int) $actor->branch_id;
        }

        if ($requested === null || $requested === '') {
            return null;
        }

        $branch = Branch::query()->find($requested);
        if ($branch === null || ! $branch->is_active) {
            throw ApiException::validation(['branch_id' => ['Cabang tidak aktif. Pilih cabang yang aktif.']]);
        }

        return (int) $branch->id;
    }
}
