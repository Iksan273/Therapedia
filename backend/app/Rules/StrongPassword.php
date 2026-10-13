<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Aturan password baru (sama dengan `validateNewPassword` di frontend/src/domain/auth.js):
 * minimal 8 karakter, mengandung huruf dan angka.
 */
class StrongPassword implements ValidationRule
{
    public const MIN_LENGTH = 8;

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $password = (string) $value;

        if (mb_strlen($password) < self::MIN_LENGTH) {
            $fail('Password minimal '.self::MIN_LENGTH.' karakter.');

            return;
        }

        if (! preg_match('/[A-Za-z]/', $password) || ! preg_match('/\d/', $password)) {
            $fail('Password harus mengandung huruf dan angka.');
        }
    }
}
