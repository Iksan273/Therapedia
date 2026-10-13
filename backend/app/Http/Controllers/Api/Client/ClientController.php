<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Services\ClientService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Intake & pipeline client (M4). Hapus client hanya master.
 * Tipis: validasi (Form Request) di sini nanti, logika bisnis di ClientService / Action.
 */
class ClientController extends Controller
{
    public function __construct(private readonly ClientService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->paginate($request->query())]);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->create($request->all())], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->find($id)]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->update($id, $request->all())]);
    }

    public function destroy(Request $request, string $id): Response
    {
        $this->service->delete($id);

        return response()->noContent();
    }
}
