<?php

namespace App\Actions\Auth;

use App\Exceptions\ApiException;
use App\Models\PasswordResetOtp;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Atur ulang password dengan OTP email. Aturan (sama dengan domain/auth.js frontend):
 * - OTP salah/kedaluwarsa/sudah dipakai → 422 generik (tanpa membedakan penyebab).
 * - Maks 5 percobaan salah per OTP; lewat itu OTP hangus dan harus minta kode baru.
 * - Berhasil: OTP ditandai terpakai, password diganti, `must_change_password = 0`, SEMUA token user dihapus.
 * Hitungan percobaan harus tetap tersimpan walau jawaban 422, jadi keputusan dihitung di dalam transaksi
 * dan exception dilempar SETELAH commit.
 */
class ResetPasswordWithOtpAction
{
    public const MAX_ATTEMPTS = 5;

    private const DUMMY_HASH = '$2y$12$oByZDM4YUSK6da7v4VKA7OKdFl3Rr0RU95HYSHyvFBARXFnppSDsu';

    public function __invoke(string $email, string $otp, string $password): void
    {
        $user = User::query()->where('email', $email)->where('is_active', true)->first();

        if ($user === null) {
            Hash::check($otp, self::DUMMY_HASH); // samakan waktu respons

            throw $this->invalid();
        }

        $result = DB::transaction(function () use ($user, $otp, $password): string {
            $row = PasswordResetOtp::query()
                ->where('user_id', $user->id)
                ->whereNull('used_at')
                ->where('expires_at', '>', now())
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();

            if ($row === null) {
                return 'invalid';
            }

            if ($row->attempts >= self::MAX_ATTEMPTS) {
                return 'locked';
            }

            if (! Hash::check($otp, $row->otp_hash)) {
                $row->increment('attempts');

                return $row->attempts >= self::MAX_ATTEMPTS ? 'locked' : 'invalid';
            }

            $row->update(['used_at' => now()]);

            $user->forceFill([
                'password' => $password, // di-hash oleh cast 'hashed'
                'must_change_password' => false,
                'password_changed_at' => now(),
            ])->save();

            $user->tokens()->delete();

            return 'ok';
        });

        match ($result) {
            'ok' => null,
            'locked' => throw ApiException::validation(
                ['otp' => ['Kode OTP sudah tidak berlaku karena terlalu banyak percobaan. Minta kode baru.']],
                'Kode OTP sudah tidak berlaku. Minta kode baru.'
            ),
            default => throw $this->invalid(),
        };
    }

    private function invalid(): ApiException
    {
        return ApiException::validation(
            ['otp' => ['Kode OTP salah atau sudah kedaluwarsa.']],
            'Kode OTP salah atau sudah kedaluwarsa.'
        );
    }
}
