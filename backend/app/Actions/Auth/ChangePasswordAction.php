<?php

namespace App\Actions\Auth;

use App\Exceptions\ApiException;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Ganti password staf. Satu-satunya endpoint (selain me/logout) yang boleh dipanggil saat `must_change_password = 1`.
 * Token lain milik user dihapus (perangkat lain keluar); token yang dipakai sekarang tetap berlaku.
 */
class ChangePasswordAction
{
    public function __invoke(User $user, string $current, string $new): void
    {
        if (! Hash::check($current, $user->password)) {
            throw ApiException::validation(['current_password' => ['Password saat ini salah.']]);
        }

        $user->forceFill([
            'password' => $new, // di-hash oleh cast 'hashed'
            'must_change_password' => false,
            'password_changed_at' => now(),
        ])->save();

        $currentToken = $user->currentAccessToken();
        $keepId = $currentToken instanceof PersonalAccessToken ? $currentToken->id : null;

        $user->tokens()->when($keepId, fn ($q) => $q->where('id', '!=', $keepId))->delete();
    }
}
