<?php

namespace App\Http\Controllers\Api\Dashboard;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Dashboard dari view v_daily_* (M11).
 * Tipis: validasi (Form Request) di sini nanti, logika bisnis di DashboardService / Action.
 */
class DashboardController extends Controller
{
    public function __construct(private readonly DashboardService $service) {}

    public function revenue(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->revenue($request->query())]);
    }

    public function inquiry(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->inquiry($request->query())]);
    }

    public function schedule(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->schedule($request->query())]);
    }

    public function branchPerformance(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->branchPerformance($request->query())]);
    }
}
