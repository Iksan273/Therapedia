<?php

namespace App\Actions\Organization;

use App\Exceptions\ApiException;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\User;
use App\Services\PermissionService;
use Illuminate\Support\Facades\DB;

/**
 * Simpan matriks izin sebuah role (upsert per modul; modul yang tidak dikirim tidak berubah). Aturan:
 * - Role `master` terkunci: selalu penuh (422 `role_locked`).
 * - Anda tidak boleh mencabut modul `rbac` dari role Anda sendiri (cegah terkunci dari pengaturan hak akses).
 * Izin dibaca dari database di setiap request, jadi perubahan berlaku langsung tanpa login ulang.
 */
class SyncRolePermissionsAction
{
    public function __construct(private readonly PermissionService $permissions) {}

    /** @param  list<array{module_code: string, allowed: bool}>  $items */
    public function __invoke(User $actor, int $roleId, array $items): Role
    {
        $role = DB::transaction(function () use ($actor, $roleId, $items): Role {
            $role = Role::query()->lockForUpdate()->findOrFail($roleId);

            if ($role->code === PermissionService::MASTER_ROLE) {
                throw ApiException::unprocessable('role_locked', 'Hak akses role Master tidak dapat diubah.');
            }

            foreach ($items as $item) {
                if ($role->id === $actor->role_id && $item['module_code'] === 'rbac' && ! $item['allowed']) {
                    throw ApiException::unprocessable('cannot_remove_own_rbac', 'Anda tidak dapat mencabut akses RBAC dari role Anda sendiri.');
                }
            }

            foreach ($items as $item) {
                RolePermission::query()->upsert(
                    [[
                        'role_id' => $role->id,
                        'module_code' => $item['module_code'],
                        'allowed' => (bool) $item['allowed'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]],
                    ['role_id', 'module_code'],
                    ['allowed', 'updated_at'],
                );
            }

            return $role->load('rolePermissions');
        });

        $this->permissions->forgetRole($roleId);

        return $role;
    }
}
