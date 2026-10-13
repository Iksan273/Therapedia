<?php

namespace App\Actions\Organization;

use App\Exceptions\ApiException;
use App\Models\User;
use App\Support\TempPassword;
use Illuminate\Support\Facades\DB;

/**
 * Master/pengatur mengatur password sementara baru (bantuan lupa password). Akun wajib menggantinya saat login berikutnya
 * dan semua tokennya dihapus. Password kosong = dibuatkan otomatis (dikembalikan SEKALI).
 * Reset akun sendiri ditolak: pakai ganti password.
 */
class ResetUserPasswordAction
{
    /** @return array{user: User, temporary_password: ?string} */
    public function __invoke(User $actor, int $id, ?string $password): array
    {
        return DB::transaction(function () use ($actor, $id, $password): array {
            $target = User::query()->with('role')->lockForUpdate()->findOrFail($id);
            UserGuard::assertMayManage($actor, $target);

            if ($target->id === $actor->id) {
                throw ApiException::unprocessable('use_change_password', 'Untuk akun Anda sendiri gunakan menu ganti password.');
            }

            $temporary = null;
            if ($password === null || $password === '') {
                $password = $temporary = TempPassword::generate();
            }

            $target->forceFill(['password' => $password, 'must_change_password' => true])->save();
            $target->tokens()->delete();

            return ['user' => $target->load(['role', 'branch']), 'temporary_password' => $temporary];
        });
    }
}
