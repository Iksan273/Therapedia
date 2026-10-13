<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Services\MasterDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Pilihan cepat alasan discharge (M3, tanpa FK).
 * Tipis: validasi (Form Request) di sini nanti, logika bisnis di MasterDataService / Action.
 */
class DischargeReasonController extends Controller
{
    public function __construct(private readonly MasterDataService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->paginate('discharge-reasons', $request->query())]);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->create('discharge-reasons', $request->all())], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->find('discharge-reasons', $id)]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->update('discharge-reasons', $id, $request->all())]);
    }

    public function destroy(Request $request, string $id): Response
    {
        $this->service->delete('discharge-reasons', $id);

        return response()->noContent();
    }
}
