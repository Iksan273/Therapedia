<?php

namespace App\Actions\Organization;

use App\Models\Role;
use App\Models\User;
use App\Support\TempPassword;

/**
 * Tambah akun staf (modul user_management). Aturan:
 * - Password sementara: dari Master, atau dibuatkan otomatis (dikembalikan SEKALI di `temporary_password`).
 *   Akun baru wajib mengganti password saat login pertama (`must_change_password = 1`).
 * - Cabang: lihat ResolveUserBranch (NULL = semua cabang; master selalu NULL; pengatur 1 cabang terkunci cabangnya).
 * - Hanya master yang boleh memberi role master.
 */
class CreateUserAction
{
    /** @return array{user: User, temporary_password: ?string} */
    public function __invoke(User $actor, array $data): array
    {
        $role = Role::query()->findOrFail($data['role_id']);
        UserGuard::assertMayAssignRole($actor, $role);

        $branchId = ResolveUserBranch::for($actor, $role, $data['branch_id'] ?? null);

        $password = $data['password'] ?? null;
        $temporary = null;
        if ($password === null || $password === '') {
            $password = $temporary = TempPassword::generate();
        }

        $user = User::query()->create([
            'role_id' => $role->id,
            'branch_id' => $branchId,
            'name' => trim($data['name']),
            'email' => $data['email'],
            'password' => $password, // di-hash oleh cast 'hashed'
            'must_change_password' => true,
            'is_active' => true,
            'phone' => $data['phone'] ?? null,
            'title' => $data['title'] ?? null,
            'specialty' => $data['specialty'] ?? null,
        ]);

        return ['user' => $user->load(['role', 'branch']), 'temporary_password' => $temporary];
    }
}
