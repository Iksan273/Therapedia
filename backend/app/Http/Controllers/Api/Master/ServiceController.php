<?php

namespace App\Http\Controllers\Api\Master;

use App\Actions\Master\DeleteServiceAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Master\ServiceRequest;
use App\Http\Resources\Master\ServiceResource;
use App\Models\Service;
use App\Services\MasterDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** Layanan intake (M3). Baca: semua staf login. Tulis: modul inquiry_master_data. Hapus dipakai → 409 `in_use`. */
class ServiceController extends Controller
{
    public function __construct(private readonly MasterDataService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => ServiceResource::collection($this->service->all(Service::class, $request))->resolve()]);
    }

    public function show(string $code): JsonResponse
    {
        return response()->json(['data' => (new ServiceResource($this->service->find(Service::class, $code)))->resolve()]);
    }

    public function store(ServiceRequest $request): JsonResponse
    {
        return response()->json(['data' => (new ServiceResource($this->service->create(Service::class, $request->validated())))->resolve()], 201);
    }

    public function update(ServiceRequest $request, string $code): JsonResponse
    {
        return response()->json(['data' => (new ServiceResource($this->service->update(Service::class, $code, $request->validated())))->resolve()]);
    }

    public function destroy(string $code, DeleteServiceAction $delete): Response
    {
        $delete($code);

        return response()->noContent();
    }
}
