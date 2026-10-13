<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Services\MasterDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Katalog paket kredit (M3, modul finance).
 * Tipis: validasi (Form Request) di sini nanti, logika bisnis di MasterDataService / Action.
 */
class MasterPackageController extends Controller
{
    public function __construct(private readonly MasterDataService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->paginate('packages', $request->query())]);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->create('packages', $request->all())], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->find('packages', $id)]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->update('packages', $id, $request->all())]);
    }

    public function destroy(Request $request, string $id): Response
    {
        $this->service->delete('packages', $id);

        return response()->noContent();
    }
}
