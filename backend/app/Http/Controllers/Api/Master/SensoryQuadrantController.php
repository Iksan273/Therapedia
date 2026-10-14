<?php

namespace App\Http\Controllers\Api\Master;

use App\Actions\Master\DeleteQuadrantAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Master\QuadrantRequest;
use App\Http\Resources\Master\QuadrantResource;
use App\Models\SensoryQuadrant;
use App\Services\MasterDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** Kuadran sensori (M3). Baca: semua staf login. Tulis: modul inquiry_master_data. Hapus dipakai → 409 `in_use`. */
class SensoryQuadrantController extends Controller
{
    public function __construct(private readonly MasterDataService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => QuadrantResource::collection($this->service->all(SensoryQuadrant::class, $request))->resolve()]);
    }

    public function show(string $code): JsonResponse
    {
        return response()->json(['data' => (new QuadrantResource($this->service->find(SensoryQuadrant::class, $code)))->resolve()]);
    }

    public function store(QuadrantRequest $request): JsonResponse
    {
        return response()->json(['data' => (new QuadrantResource($this->service->create(SensoryQuadrant::class, $request->validated())))->resolve()], 201);
    }

    public function update(QuadrantRequest $request, string $code): JsonResponse
    {
        return response()->json(['data' => (new QuadrantResource($this->service->update(SensoryQuadrant::class, $code, $request->validated())))->resolve()]);
    }

    public function destroy(string $code, DeleteQuadrantAction $delete): Response
    {
        $delete($code);

        return response()->noContent();
    }
}
