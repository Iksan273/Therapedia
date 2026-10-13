<?php

namespace App\Actions\Auth;

use App\Exceptions\ApiException;
use App\Http\Resources\Auth\ClientSessionResource;
use App\Models\Client;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Login portal ortu: `client_code` + tanggal lahir anak (tanpa PIN). Kode client berurutan (AE-00001, ...) sehingga
 * mudah ditebak, jadi tanggal lahir adalah satu-satunya faktor kedua → wajib lockout (schema.md, keputusan klien):
 * - per kode: 5 kegagalan → kunci 15 menit (juga untuk kode yang tidak ada, agar tidak bisa dipakai menebak kode)
 * - per IP: 20 kegagalan → kunci 15 menit
 * Pesan gagal selalu generik (tidak menyebut mana yang salah).
 */
class ClientLoginAction
{
    private const MAX_PER_CODE = 5;

    private const MAX_PER_IP = 20;

    private const LOCK_SECONDS = 900;

    /** @return array{token: string, token_type: string, client: array<string, mixed>} */
    public function __invoke(string $clientCode, string $dateOfBirth, ?string $ip): array
    {
        $codeKey = 'client-login:code:'.sha1($clientCode);
        $ipKey = 'client-login:ip:'.sha1((string) $ip);

        foreach ([[$codeKey, self::MAX_PER_CODE], [$ipKey, self::MAX_PER_IP]] as [$key, $max]) {
            if (RateLimiter::tooManyAttempts($key, $max)) {
                $seconds = RateLimiter::availableIn($key);
                $minutes = (int) ceil($seconds / 60);

                throw ApiException::tooManyRequests("Terlalu banyak percobaan. Coba lagi dalam {$minutes} menit atau hubungi admin klinik.", $seconds);
            }
        }

        // Global scope cabang tidak berlaku: belum ada pengguna login.
        $client = Client::query()->with('branch')->where('client_code', $clientCode)->first();

        $valid = $client !== null
            && hash_equals($client->date_of_birth->format('Y-m-d'), $dateOfBirth);

        if (! $valid) {
            RateLimiter::hit($codeKey, self::LOCK_SECONDS);
            RateLimiter::hit($ipKey, self::LOCK_SECONDS);

            throw ApiException::validation(
                ['client_code' => ['Kode client atau tanggal lahir tidak sesuai.']],
                'Kode client atau tanggal lahir tidak sesuai.'
            );
        }

        RateLimiter::clear($codeKey);
        $client->forceFill(['last_login_at' => now()])->save();

        return [
            'token' => $client->createToken('client', ['client'])->plainTextToken,
            'token_type' => 'Bearer',
            'client' => (new ClientSessionResource($client))->resolve(),
        ];
    }
}
