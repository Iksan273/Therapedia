<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\ClientLoginRequest;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\StaffLoginRequest;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Login staf & ortu, logout, profil sesi, ganti/lupa password (M1).
 * Tipis: validasi di Form Request, aturan bisnis di Action lewat AuthService.
 */
class AuthController extends Controller
{
    public function __construct(private readonly AuthService $service) {}

    public function login(StaffLoginRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->service->login($request->validated('email'), $request->validated('password'), $request->ip())]);
    }

    public function clientLogin(ClientLoginRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->service->clientLogin($request->validated('client_code'), $request->validated('date_of_birth'), $request->ip())]);
    }

    public function logout(Request $request): Response
    {
        $this->service->logout($request->user());

        return response()->noContent();
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->me($request->user())]);
    }

    public function changePassword(ChangePasswordRequest $request): Response
    {
        $this->service->changePassword($request->user(), $request->validated('current_password'), $request->validated('password'));

        return response()->noContent();
    }

    public function forgotPassword(ForgotPasswordRequest $request): Response
    {
        $this->service->requestPasswordOtp($request->validated('email'), $request->ip());

        return response()->noContent();
    }

    public function resetPassword(ResetPasswordRequest $request): Response
    {
        $this->service->resetPasswordWithOtp($request->validated('email'), $request->validated('otp'), $request->validated('password'));

        return response()->noContent();
    }
}
