<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Master\ReasonRequest;
use App\Http\Resources\Master\ReasonResource;
use App\Models\DischargeReason;
use App\Services\MasterDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** Alasan Discharge/Discontinue (pilihan cepat). Tersimpan sebagai string di client, jadi hapus tidak dicek pemakainya. */
class DischargeReasonController extends Controller
{
    public function __construct(private readonly MasterDataService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => ReasonResource::collection($this->service->all(DischargeReason::class, $request))->resolve()]);
    }

    public function show(string $code): JsonResponse
    {
        return response()->json(['data' => (new ReasonResource($this->service->find(DischargeReason::class, $code)))->resolve()]);
    }

    public function store(ReasonRequest $request): JsonResponse
    {
        return response()->json(['data' => (new ReasonResource($this->service->create(DischargeReason::class, $request->validated())))->resolve()], 201);
    }

    public function update(ReasonRequest $request, string $code): JsonResponse
    {
        return response()->json(['data' => (new ReasonResource($this->service->update(DischargeReason::class, $code, $request->validated())))->resolve()]);
    }

    public function destroy(string $code): Response
    {
        $this->service->delete(DischargeReason::class, $code);

        return response()->noContent();
    }
}
