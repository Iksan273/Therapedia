<?php

namespace App\Actions\Organization;

use App\Exceptions\ApiException;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Aktif/nonaktifkan akun staf. Staf TIDAK dihapus lewat UI (riwayat sesi tetap); berhenti = dinonaktifkan.
 * - Tidak boleh menonaktifkan diri sendiri, dan tidak boleh menonaktifkan master aktif terakhir.
 * - Saat dinonaktifkan semua token akun dihapus (langsung keluar dari semua perangkat).
 */
class SetUserActiveAction
{
    public function __invoke(User $actor, int $id, bool $active): User
    {
        return DB::transaction(function () use ($actor, $id, $active): User {
            $target = User::query()->with('role')->lockForUpdate()->findOrFail($id);
            UserGuard::assertMayManage($actor, $target);

            if (! $active) {
                if ($target->id === $actor->id) {
                    throw ApiException::unprocessable('cannot_deactivate_self', 'Anda tidak dapat menonaktifkan akun Anda sendiri.');
                }
                if (UserGuard::isLastActiveMaster($target)) {
                    throw ApiException::unprocessable('last_master', 'Master aktif terakhir tidak dapat dinonaktifkan.');
                }
            }

            $target->is_active = $active;
            $target->save();

            if (! $active) {
                $target->tokens()->delete();
            }

            return $target->load(['role', 'branch']);
        });
    }
}
