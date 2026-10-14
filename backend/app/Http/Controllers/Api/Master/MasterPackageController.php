<?php

namespace App\Http\Controllers\Api\Master;

use App\Actions\Master\DeleteMasterPackageAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Master\MasterPackageRequest;
use App\Http\Requests\Organization\SetActiveRequest;
use App\Http\Resources\Master\MasterPackageResource;
use App\Services\MasterPackageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** Master paket (M3). Baca: semua staf login. Tulis: modul finance. Hapus dipakai invoice/paket client → 409 `in_use`. */
class MasterPackageController extends Controller
{
    public function __construct(private readonly MasterPackageService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => MasterPackageResource::collection($this->service->all($request))->resolve()]);
    }

    public function show(string $package): JsonResponse
    {
        return response()->json(['data' => (new MasterPackageResource($this->service->find((int) $package)))->resolve()]);
    }

    public function store(MasterPackageRequest $request): JsonResponse
    {
        return response()->json(['data' => (new MasterPackageResource($this->service->create($request->validated())))->resolve()], 201);
    }

    public function update(MasterPackageRequest $request, string $package): JsonResponse
    {
        return response()->json(['data' => (new MasterPackageResource($this->service->update((int) $package, $request->validated())))->resolve()]);
    }

    public function setActive(SetActiveRequest $request, string $package): JsonResponse
    {
        return response()->json(['data' => (new MasterPackageResource($this->service->setActive((int) $package, $request->boolean('is_active'))))->resolve()]);
    }

    public function destroy(string $package, DeleteMasterPackageAction $delete): Response
    {
        $delete((int) $package);

        return response()->noContent();
    }
}
