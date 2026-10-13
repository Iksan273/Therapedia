<?php

namespace App\Http\Controllers\Api\Schedule;

use App\Http\Controllers\Controller;
use App\Services\ScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Laporan sesi 3 bagian (M6).
 * Tipis: validasi (Form Request) di sini nanti, logika bisnis di ScheduleService / Action.
 */
class SessionReportController extends Controller
{
    public function __construct(private readonly ScheduleService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->paginateReports($request->query())]);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->saveReport($request->all())], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->findReport($id)]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->updateReport($id, $request->all())]);
    }
}
