<?php

namespace App\Http\Controllers\Api\Schedule;

use App\Http\Controllers\Controller;
use App\Services\LeaveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Log cuti client, dicatat Finance (M6, schema.md §6.8).
 * Tipis: validasi (Form Request) di sini nanti, logika bisnis di LeaveService / Action.
 */
class ClientLeaveController extends Controller
{
    public function __construct(private readonly LeaveService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->paginate($request->query())]);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->record($request->all())], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->find($id)]);
    }
}
