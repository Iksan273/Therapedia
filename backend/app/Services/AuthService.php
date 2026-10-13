<?php

namespace App\Services;

use App\Exceptions\NotImplementedException;

/**
 * Login staf & ortu, logout, profil sesi, ganti/lupa password (M1).
 *
 * SKELETON setup: tanda tangan method saja; logika (transaksi, aturan bisnis) diisi per use-case.
 * Acuan aturan: schema.md §06 dan frontend/src/domain/*.
 */
class AuthService
{
    /** StaffLoginAction: throttle, token ability `staff`, `must_change_password` */
    public function login(string $email, string $password): mixed
    {
        throw new NotImplementedException('AuthService::login');
    }

    /** ClientLoginAction: lockout, token ability `client`, pesan gagal generik */
    public function clientLogin(string $clientCode, string $dateOfBirth): mixed
    {
        throw new NotImplementedException('AuthService::clientLogin');
    }

    public function logout(mixed $user): void
    {
        throw new NotImplementedException('AuthService::logout');
    }

    /** profil + izin modul */
    public function me(mixed $user): mixed
    {
        throw new NotImplementedException('AuthService::me');
    }

    public function changePassword(mixed $user, string $current, string $new): void
    {
        throw new NotImplementedException('AuthService::changePassword');
    }

    /** OTP email sinkron; respons selalu generik */
    public function requestPasswordOtp(string $email): void
    {
        throw new NotImplementedException('AuthService::requestPasswordOtp');
    }

    public function resetPasswordWithOtp(string $email, string $otp, string $password): void
    {
        throw new NotImplementedException('AuthService::resetPasswordWithOtp');
    }
}
