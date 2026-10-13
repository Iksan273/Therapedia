<?php

namespace App\Http\Controllers\Api\Organization;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\StoreRoleRequest;
use App\Http\Requests\Organization\SyncRolePermissionsRequest;
use App\Http\Requests\Organization\UpdateRoleRequest;
use App\Http\Resources\Organization\RoleResource;
use App\Services\RoleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Role & matriks akses (M2, modul rbac). Tipis: validasi di Form Request, aturan di RoleService/Action.
 * `permissions` selalu DAFTAR kode modul yang diizinkan (bukan kamus berkunci kode modul).
 */
class RoleController extends Controller
{
    public function __construct(private readonly RoleService $service) {}

    public function index(): JsonResponse
    {
        return response()->json(['data' => RoleResource::collection($this->service->all())->resolve()]);
    }

    public function show(string $role): JsonResponse
    {
        return response()->json(['data' => (new RoleResource($this->service->find((int) $role)))->resolve()]);
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $role = $this->service->create($request->validated());

        return response()->json(['data' => (new RoleResource($this->service->find($role->id)))->resolve()], 201);
    }

    public function update(UpdateRoleRequest $request, string $role): JsonResponse
    {
        return response()->json(['data' => (new RoleResource($this->service->update((int) $role, $request->validated())))->resolve()]);
    }

    public function destroy(string $role): Response
    {
        $this->service->delete((int) $role);

        return response()->noContent();
    }

    public function syncPermissions(SyncRolePermissionsRequest $request, string $role): JsonResponse
    {
        $updated = $this->service->syncPermissions($request->user(), (int) $role, $request->validated('permissions'));

        return response()->json(['data' => (new RoleResource($updated))->resolve()]);
    }

    /** Daftar modul akses (kolom matriks). */
    public function modules(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->modules()]);
    }
}
