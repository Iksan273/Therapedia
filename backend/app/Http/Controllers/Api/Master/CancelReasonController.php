<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Master\ReasonRequest;
use App\Http\Resources\Master\ReasonResource;
use App\Models\CancelReason;
use App\Services\MasterDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Alasan Cancel dan Off dalam SATU daftar, dibedakan bendera `is_therapist_off` (filter `?therapist_off=0|1`).
 * Transaksi menyimpan alasan sebagai string, jadi hapus tidak dicek pemakainya.
 */
class CancelReasonController extends Controller
{
    public function __construct(private readonly MasterDataService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => ReasonResource::collection($this->service->all(CancelReason::class, $request))->resolve()]);
    }

    public function show(string $code): JsonResponse
    {
        return response()->json(['data' => (new ReasonResource($this->service->find(CancelReason::class, $code)))->resolve()]);
    }

    public function store(ReasonRequest $request): JsonResponse
    {
        return response()->json(['data' => (new ReasonResource($this->service->create(CancelReason::class, $request->validated())))->resolve()], 201);
    }

    public function update(ReasonRequest $request, string $code): JsonResponse
    {
        return response()->json(['data' => (new ReasonResource($this->service->update(CancelReason::class, $code, $request->validated())))->resolve()]);
    }

    public function destroy(string $code): Response
    {
        $this->service->delete(CancelReason::class, $code);

        return response()->noContent();
    }
}
