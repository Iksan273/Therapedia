<?php

namespace App\Http\Controllers\Api\Schedule;

use App\Http\Controllers\Controller;
use App\Services\ScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Sesi/jadwal + aksi sesi (M6).
 * Tipis: validasi (Form Request) di sini nanti, logika bisnis di ScheduleService / Action.
 */
class ScheduleController extends Controller
{
    public function __construct(private readonly ScheduleService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->paginate($request->query())]);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->create($request->all())], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->find($id)]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->update($id, $request->all())]);
    }

    public function destroy(Request $request, string $id): Response
    {
        $this->service->delete($id);

        return response()->noContent();
    }
}
