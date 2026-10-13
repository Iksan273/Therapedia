<?php

namespace App\Services;

use App\Actions\Auth\ChangePasswordAction;
use App\Actions\Auth\ClientLoginAction;
use App\Actions\Auth\RequestPasswordOtpAction;
use App\Actions\Auth\ResetPasswordWithOtpAction;
use App\Actions\Auth\StaffLoginAction;
use App\Http\Resources\Auth\ClientSessionResource;
use App\Http\Resources\Auth\StaffSessionResource;
use App\Models\Client;
use App\Models\User;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Login staf & ortu, logout, profil sesi, ganti/lupa password (M1). Controller → service → Action (aturan di Action).
 */
class AuthService
{
    public function __construct(
        private readonly StaffLoginAction $staffLogin,
        private readonly ClientLoginAction $clientLogin,
        private readonly ChangePasswordAction $changePassword,
        private readonly RequestPasswordOtpAction $requestPasswordOtp,
        private readonly ResetPasswordWithOtpAction $resetPasswordWithOtp,
    ) {}

    /** @return array{token: string, token_type: string, user: array<string, mixed>} */
    public function login(string $email, string $password, ?string $ip = null): array
    {
        return ($this->staffLogin)($email, $password, $ip);
    }

    /** @return array{token: string, token_type: string, client: array<string, mixed>} */
    public function clientLogin(string $clientCode, string $dateOfBirth, ?string $ip = null): array
    {
        return ($this->clientLogin)($clientCode, $dateOfBirth, $ip);
    }

    /** Hapus token yang dipakai saat ini (perangkat lain tetap login). */
    public function logout(User|Client $user): void
    {
        $token = $user->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }
    }

    /** @return array<string, mixed> `{ type: staff|client, user|client: {...} }` */
    public function me(User|Client $user): array
    {
        if ($user instanceof Client) {
            return ['type' => 'client', 'client' => (new ClientSessionResource($user->loadMissing('branch')))->resolve()];
        }

        return ['type' => 'staff', 'user' => (new StaffSessionResource($user->loadMissing(['role', 'branch'])))->resolve()];
    }

    public function changePassword(User $user, string $current, string $new): void
    {
        ($this->changePassword)($user, $current, $new);
    }

    /** OTP email sinkron; respons selalu generik. */
    public function requestPasswordOtp(string $email, ?string $ip = null): void
    {
        ($this->requestPasswordOtp)($email, $ip);
    }

    public function resetPasswordWithOtp(string $email, string $otp, string $password): void
    {
        ($this->resetPasswordWithOtp)($email, $otp, $password);
    }
}
