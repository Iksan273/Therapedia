<?php

namespace App\Http\Controllers\Api\Assessment;

use App\Http\Controllers\Controller;
use App\Services\AssessmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Kode kuesioner publik (M5), nested di clients.
 * Tipis: validasi (Form Request) di sini nanti, logika bisnis di AssessmentService / Action.
 */
class AssessmentAccessCodeController extends Controller
{
    public function __construct(private readonly AssessmentService $service) {}

    public function index(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->codes($id)]);
    }

    public function store(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->issueCode($id, $request->all())], 201);
    }

    public function destroy(Request $request, string $id): Response
    {
        $this->service->deleteCode($id);

        return response()->noContent();
    }
}
