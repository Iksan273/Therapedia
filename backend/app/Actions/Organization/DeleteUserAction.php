<?php

namespace App\Actions\Organization;

use App\Exceptions\ApiException;
use App\Models\Schedule;
use App\Models\SessionReport;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Hapus akun staf secara permanen (hanya Master). Aturan:
 * - Tidak boleh menghapus akun sendiri (422 `cannot_delete_self`) dan master aktif terakhir (422 `last_master`).
 * - Terapis yang punya jadwal atau laporan sesi → 409 `in_use` (FK `schedules.therapist_id` / `session_reports.therapist_id`
 *   RESTRICT sebagai jaring pengaman); sarannya dinonaktifkan agar riwayat sesi tetap utuh.
 * - Kolom pelaku (`created_by`, `updated_by`, `verified_by`, ...) di data lain menjadi NULL lewat FK `nullOnDelete`: data
 *   tetap ada tetapi nama pembuatnya hilang. `password_reset_otps` ikut terhapus (cascade); token Sanctum dihapus manual.
 */
class DeleteUserAction
{
    public function __invoke(User $actor, int $id): void
    {
        if (! UserGuard::isMasterUser($actor)) {
            throw ApiException::forbidden('Hanya Master yang boleh menghapus akun.');
        }

        DB::transaction(function () use ($actor, $id): void {
            $target = User::query()->with('role')->lockForUpdate()->findOrFail($id);
            UserGuard::assertMayManage($actor, $target);

            if ($target->id === $actor->id) {
                throw ApiException::unprocessable('cannot_delete_self', 'Anda tidak dapat menghapus akun Anda sendiri.');
            }
            if (UserGuard::isLastActiveMaster($target)) {
                throw ApiException::unprocessable('last_master', 'Master aktif terakhir tidak dapat dihapus.');
            }

            $schedules = Schedule::withoutGlobalScopes()->where('therapist_id', $target->id)->count();
            $reports = SessionReport::withoutGlobalScopes()->where('therapist_id', $target->id)->count();

            if ($schedules + $reports > 0) {
                throw ApiException::inUse("Akun \"{$target->name}\" dipakai di {$schedules} jadwal dan {$reports} laporan sesi. Nonaktifkan saja agar riwayat sesi tetap utuh.");
            }

            $target->tokens()->delete();
            $target->delete();
        });
    }
}
