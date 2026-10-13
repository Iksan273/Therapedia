<?php

namespace App\Http\Controllers\Api\Organization;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\SetActiveRequest;
use App\Http\Requests\Organization\StoreBranchRequest;
use App\Http\Requests\Organization\UpdateBranchRequest;
use App\Http\Resources\Organization\BranchResource;
use App\Services\BranchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Master Cabang (M2). Baca: semua staf login (filter cabang di semua halaman). Tulis: modul branch_master.
 * Pratinjau dampak hapus dan hapus cabang: hanya master (hapus dikerjakan Sprint 4).
 */
class BranchController extends Controller
{
    public function __construct(private readonly BranchService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => BranchResource::collection($this->service->all($request))->resolve()]);
    }

    public function show(string $branch): JsonResponse
    {
        return response()->json(['data' => (new BranchResource($this->service->find((int) $branch)))->resolve()]);
    }

    public function store(StoreBranchRequest $request): JsonResponse
    {
        return response()->json(['data' => (new BranchResource($this->service->create($request->validated())))->resolve()], 201);
    }

    public function update(UpdateBranchRequest $request, string $branch): JsonResponse
    {
        return response()->json(['data' => (new BranchResource($this->service->update((int) $branch, $request->validated())))->resolve()]);
    }

    public function setActive(SetActiveRequest $request, string $branch): JsonResponse
    {
        return response()->json(['data' => (new BranchResource($this->service->setActive((int) $branch, $request->boolean('is_active'))))->resolve()]);
    }

    public function deleteImpact(Request $request, string $branch): JsonResponse
    {
        $result = $this->service->deleteImpact($request->user(), (int) $branch);

        return response()->json(['data' => (new BranchResource($result['branch']))->resolve() + ['impact' => $result['impact']]]);
    }

    public function destroy(Request $request, string $branch): Response
    {
        $this->service->delete($request->user(), (int) $branch);

        return response()->noContent();
    }
}
