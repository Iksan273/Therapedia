<?php

namespace App\Actions\Auth;

use App\Exceptions\ApiException;
use App\Http\Resources\Auth\StaffSessionResource;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Login staf (implementation_detail.md 1.1). Aturan:
 * - Gagal selalu generik (tidak membocorkan email terdaftar/nonaktif/password salah) dan waktu respons disamakan
 *   (hash dummy bila email tidak ditemukan).
 * - Throttle per email+IP: 5 kegagalan → 429 selama 60 detik (di atas throttle rute per IP).
 * - Token Sanctum ability `staff`; `must_change_password` dikembalikan agar frontend memaksa ganti password
 *   (endpoint lain diblokir middleware `password.changed`).
 */
class StaffLoginAction
{
    private const MAX_FAILURES = 5;

    private const DECAY_SECONDS = 60;

    /** Hash bcrypt cost 12 dari string acak: untuk menyamakan waktu bila akun tidak ada. */
    private const DUMMY_HASH = '$2y$12$oByZDM4YUSK6da7v4VKA7OKdFl3Rr0RU95HYSHyvFBARXFnppSDsu';

    /** @return array{token: string, token_type: string, user: array<string, mixed>} */
    public function __invoke(string $email, string $password, ?string $ip): array
    {
        $key = 'staff-login:'.sha1($email.'|'.$ip);

        if (RateLimiter::tooManyAttempts($key, self::MAX_FAILURES)) {
            $seconds = RateLimiter::availableIn($key);

            throw ApiException::tooManyRequests("Terlalu banyak percobaan login. Coba lagi dalam {$seconds} detik.", $seconds);
        }

        $user = User::query()->with(['role', 'branch'])->where('email', $email)->first();

        $valid = $user !== null && $user->is_active && Hash::check($password, $user->password);

        if (! $valid) {
            if ($user === null) {
                Hash::check($password, self::DUMMY_HASH);
            }
            RateLimiter::hit($key, self::DECAY_SECONDS);

            throw ApiException::validation(['email' => ['Email atau password salah.']], 'Email atau password salah.');
        }

        RateLimiter::clear($key);
        $user->forceFill(['last_login_at' => now()])->save();

        return [
            'token' => $user->createToken('staff', ['staff'])->plainTextToken,
            'token_type' => 'Bearer',
            'user' => (new StaffSessionResource($user))->resolve(),
        ];
    }
}
