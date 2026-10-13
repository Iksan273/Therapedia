<?php

namespace App\Actions\Organization;

use App\Exceptions\ApiException;
use App\Models\Role;
use Illuminate\Support\Facades\DB;

/**
 * Hapus role kustom (permanen; matriks izinnya ikut terhapus lewat FK cascade). Aturan:
 * - Role sistem tidak dapat dihapus (422 `system_role`).
 * - Role yang masih dipakai akun → 409 `in_use` (FK `users.role_id` RESTRICT sebagai jaring pengaman).
 */
class DeleteRoleAction
{
    public function __invoke(int $id): void
    {
        DB::transaction(function () use ($id): void {
            $role = Role::query()->lockForUpdate()->findOrFail($id);

            if ($role->is_system) {
                throw ApiException::unprocessable('system_role', 'Role bawaan sistem tidak dapat dihapus.');
            }

            $count = $role->users()->count();
            if ($count > 0) {
                throw ApiException::inUse("Role \"{$role->name}\" masih dipakai {$count} akun. Pindahkan akun tersebut ke role lain dulu.");
            }

            $role->delete();
        });
    }
}
