<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Services\MasterDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Pilihan cepat alasan Cancel/Off + Therapist Off (M3, tanpa FK).
 * Tipis: validasi (Form Request) di sini nanti, logika bisnis di MasterDataService / Action.
 */
class CancelReasonController extends Controller
{
    public function __construct(private readonly MasterDataService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->paginate('cancel-reasons', $request->query())]);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->create('cancel-reasons', $request->all())], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->find('cancel-reasons', $id)]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->update('cancel-reasons', $id, $request->all())]);
    }

    public function destroy(Request $request, string $id): Response
    {
        $this->service->delete('cancel-reasons', $id);

        return response()->noContent();
    }
}
