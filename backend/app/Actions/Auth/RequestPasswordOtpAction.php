<?php

namespace App\Actions\Auth;

use App\Exceptions\ApiException;
use App\Mail\PasswordOtpMail;
use App\Models\PasswordResetOtp;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Throwable;

/**
 * Lupa password staf: kirim OTP 6 angka ke email (berlaku 10 menit). Aturan:
 * - Respons SELALU generik (204) walau email tidak terdaftar/nonaktif; tidak membocorkan akun.
 * - Throttle per email (3 per 10 menit) dan per IP (10 per jam); dihitung untuk email apa pun.
 * - Hanya OTP terbaru yang berlaku: OTP lama yang belum dipakai dihanguskan.
 * - OTP disimpan sebagai HASH. Email dikirim SINKRON setelah commit; gagal → baris OTP dihapus + 503.
 */
class RequestPasswordOtpAction
{
    public const TTL_MINUTES = 10;

    private const MAX_PER_EMAIL = 3;

    private const EMAIL_DECAY = 600;

    private const MAX_PER_IP = 10;

    private const IP_DECAY = 3600;

    public function __invoke(string $email, ?string $ip): void
    {
        $emailKey = 'otp-request:email:'.sha1($email);
        $ipKey = 'otp-request:ip:'.sha1((string) $ip);

        foreach ([[$emailKey, self::MAX_PER_EMAIL], [$ipKey, self::MAX_PER_IP]] as [$key, $max]) {
            if (RateLimiter::tooManyAttempts($key, $max)) {
                $minutes = (int) ceil(RateLimiter::availableIn($key) / 60);

                throw ApiException::tooManyRequests("Terlalu banyak permintaan kode. Coba lagi dalam {$minutes} menit.", RateLimiter::availableIn($key));
            }
        }

        RateLimiter::hit($emailKey, self::EMAIL_DECAY);
        RateLimiter::hit($ipKey, self::IP_DECAY);

        $user = User::query()->where('email', $email)->where('is_active', true)->first();

        if ($user === null) {
            return; // generik: tidak ada tanda email tidak terdaftar
        }

        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $row = DB::transaction(function () use ($user, $otp, $ip): PasswordResetOtp {
            // Hanya OTP terbaru yang boleh dipakai.
            PasswordResetOtp::query()
                ->where('user_id', $user->id)
                ->whereNull('used_at')
                ->where('expires_at', '>', now())
                ->update(['expires_at' => now()]);

            return PasswordResetOtp::query()->create([
                'user_id' => $user->id,
                'otp_hash' => Hash::make($otp),
                'expires_at' => now()->addMinutes(self::TTL_MINUTES),
                'attempts' => 0,
                'requested_ip' => $ip,
            ]);
        });

        try {
            Mail::to($user->email)->send(new PasswordOtpMail($user->name, $otp, self::TTL_MINUTES, $ip));
        } catch (Throwable $e) {
            $row->delete();
            report($e);

            throw ApiException::unavailable('Email kode OTP gagal dikirim. Coba lagi sebentar lagi atau hubungi Master untuk reset password.');
        }
    }
}
