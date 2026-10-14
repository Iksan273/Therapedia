<?php

namespace App\Http\Controllers\Api\Organization;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\ResetUserPasswordRequest;
use App\Http\Requests\Organization\SetActiveRequest;
use App\Http\Requests\Organization\StoreUserRequest;
use App\Http\Requests\Organization\UpdateUserRequest;
use App\Http\Resources\Organization\UserResource;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Akun staf & terapis (M2, modul user_management). Tipis: validasi di Form Request, aturan di UserService/Action.
 * Berhenti = PATCH /users/{id}/active. DELETE /users/{id}: hanya Master, hanya akun tanpa jadwal/laporan sesi.
 */
class UserController extends Controller
{
    public function __construct(private readonly UserService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->service->paginate($request, $request->user()));
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $result = $this->service->create($request->user(), $request->validated());

        return response()->json(['data' => $this->payload($result)], 201);
    }

    public function show(Request $request, string $user): JsonResponse
    {
        return response()->json(['data' => (new UserResource($this->service->find($request->user(), (int) $user)))->resolve()]);
    }

    public function update(UpdateUserRequest $request, string $user): JsonResponse
    {
        $updated = $this->service->update($request->user(), (int) $user, $request->validated());

        return response()->json(['data' => (new UserResource($updated))->resolve()]);
    }

    public function setActive(SetActiveRequest $request, string $user): JsonResponse
    {
        $updated = $this->service->setActive($request->user(), (int) $user, $request->boolean('is_active'));

        return response()->json(['data' => (new UserResource($updated))->resolve()]);
    }

    public function destroy(Request $request, string $user): Response
    {
        $this->service->delete($request->user(), (int) $user);

        return response()->noContent();
    }

    /** Respons memuat `temporary_password` SEKALI bila dibuatkan otomatis (tidak disimpan di tempat lain). */
    public function resetPassword(ResetUserPasswordRequest $request, string $user): JsonResponse
    {
        $result = $this->service->resetPassword($request->user(), (int) $user, $request->validated('password'));

        return response()->json(['data' => $this->payload($result)]);
    }

    /** @param  array{user: User, temporary_password: ?string}  $result */
    private function payload(array $result): array
    {
        return (new UserResource($result['user']))->resolve() + ['temporary_password' => $result['temporary_password']];
    }
}
