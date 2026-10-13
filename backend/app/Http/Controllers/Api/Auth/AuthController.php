<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Login staf & ortu, logout, profil sesi, ganti/lupa password (M1).
 * Tipis: validasi (Form Request) di sini nanti, logika bisnis di AuthService / Action.
 */
class AuthController extends Controller
{
    public function __construct(private readonly AuthService $service) {}

    public function login(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->login((string) $request->input('email'), (string) $request->input('password'))]);
    }

    public function clientLogin(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->clientLogin((string) $request->input('client_code'), (string) $request->input('date_of_birth'))]);
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

    public function changePassword(Request $request): Response
    {
        $this->service->changePassword($request->user(), (string) $request->input('current_password'), (string) $request->input('password'));

        return response()->noContent();
    }

    public function forgotPassword(Request $request): Response
    {
        $this->service->requestPasswordOtp((string) $request->input('email'));

        return response()->noContent();
    }

    public function resetPassword(Request $request): Response
    {
        $this->service->resetPasswordWithOtp((string) $request->input('email'), (string) $request->input('otp'), (string) $request->input('password'));

        return response()->noContent();
    }
}
