<?php

namespace App\Support;

/**
 * Password sementara buatan Master (padanan `generateTempPassword` di frontend/src/domain/auth.js):
 * 6 huruf + 2 angka, tanpa karakter yang mudah tertukar (I, O, l, 0, 1). Memenuhi aturan StrongPassword
 * (minimal 8 karakter, ada huruf dan angka). Dibuat dengan random_int (CSPRNG).
 */
final class TempPassword
{
    private const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';

    private const DIGITS = '23456789';

    public static function generate(): string
    {
        $password = '';

        for ($i = 0; $i < 6; $i++) {
            $password .= self::LETTERS[random_int(0, strlen(self::LETTERS) - 1)];
        }
        for ($i = 0; $i < 2; $i++) {
            $password .= self::DIGITS[random_int(0, strlen(self::DIGITS) - 1)];
        }

        return $password;
    }
}
