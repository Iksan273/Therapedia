<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Services\ClientService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Tautan dokumen client (M4), nested di clients.
 * Tipis: validasi (Form Request) di sini nanti, logika bisnis di ClientService / Action.
 */
class ClientDocumentController extends Controller
{
    public function __construct(private readonly ClientService $service) {}

    public function index(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->documents($id)]);
    }

    public function store(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->addDocument($id, $request->all())], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->findDocument($id)]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->updateDocument($id, $request->all())]);
    }

    public function destroy(Request $request, string $id): Response
    {
        $this->service->deleteDocument($id);

        return response()->noContent();
    }
}
