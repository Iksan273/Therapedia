<?php

namespace App\Http\Controllers\Api\Portal;

use App\Http\Controllers\Controller;
use App\Services\PortalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Portal orang tua (M10), token ability `client`.
 * Tipis: validasi (Form Request) di sini nanti, logika bisnis di PortalService / Action.
 */
class PortalController extends Controller
{
    public function __construct(private readonly PortalService $service) {}

    public function profile(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->profile($request->user())]);
    }

    public function invoices(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->invoices($request->user())]);
    }

    public function credits(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->credits($request->user())]);
    }

    public function sessions(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->sessions($request->user())]);
    }
}
