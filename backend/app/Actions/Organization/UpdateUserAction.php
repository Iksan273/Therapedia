<?php

namespace App\Actions\Organization;

use App\Exceptions\ApiException;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Ubah profil, role, dan penugasan cabang akun staf (PATCH: hanya field yang dikirim). Aturan:
 * - Tidak boleh mengubah role diri sendiri (cegah terkunci), dan tidak boleh menurunkan master aktif terakhir.
 * - Hanya master yang boleh memberi/mengubah role master dan mengatur akun master.
 * - Cabang: lihat ResolveUserBranch. Password tidak diubah di sini (pakai ResetUserPasswordAction).
 */
class UpdateUserAction
{
    public function __invoke(User $actor, int $id, array $data): User
    {
        return DB::transaction(function () use ($actor, $id, $data): User {
            $target = User::query()->with('role')->lockForUpdate()->findOrFail($id);
            UserGuard::assertMayManage($actor, $target);

            $role = $target->role;

            if (array_key_exists('role_id', $data) && (int) $data['role_id'] !== (int) $target->role_id) {
                $newRole = Role::query()->findOrFail($data['role_id']);
                UserGuard::assertMayAssignRole($actor, $newRole);

                if ($target->id === $actor->id) {
                    throw ApiException::unprocessable('cannot_change_own_role', 'Anda tidak dapat mengubah role akun Anda sendiri.');
                }
                if (UserGuard::isLastActiveMaster($target) && ! UserGuard::isMasterRole($newRole)) {
                    throw ApiException::unprocessable('last_master', 'Master aktif terakhir tidak dapat diturunkan rolenya.');
                }

                $role = $newRole;
                $target->role_id = $newRole->id;
            }

            // Cabang dihitung ulang bila cabang dikirim atau role berubah (master selalu NULL).
            $branchTouched = array_key_exists('branch_id', $data);
            $roleChanged = (int) $role->id !== (int) $target->getOriginal('role_id');
            if ($branchTouched || $roleChanged) {
                $requested = $branchTouched ? $data['branch_id'] : $target->branch_id;
                $unchanged = $requested !== null && (int) $requested === (int) $target->getOriginal('branch_id');

                // Cabang yang tidak berubah dipertahankan apa adanya (boleh cabang nonaktif); selain itu divalidasi.
                $target->branch_id = $unchanged && ! UserGuard::isMasterRole($role)
                    ? $target->getOriginal('branch_id')
                    : ResolveUserBranch::for($actor, $role, $requested);
            }

            foreach (['name', 'email', 'phone', 'title', 'specialty'] as $field) {
                if (array_key_exists($field, $data)) {
                    $target->{$field} = is_string($data[$field]) ? trim($data[$field]) : $data[$field];
                }
            }

            $target->save();

            return $target->load(['role', 'branch']);
        });
    }
}
