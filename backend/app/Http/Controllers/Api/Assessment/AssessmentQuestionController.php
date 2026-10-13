<?php

namespace App\Http\Controllers\Api\Assessment;

use App\Http\Controllers\Controller;
use App\Services\AssessmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Soal kuesioner (M5), nested di section.
 * Tipis: validasi (Form Request) di sini nanti, logika bisnis di AssessmentService / Action.
 */
class AssessmentQuestionController extends Controller
{
    public function __construct(private readonly AssessmentService $service) {}

    public function index(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->questions($id)]);
    }

    public function store(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->createQuestion($id, $request->all())], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->findQuestion($id)]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->updateQuestion($id, $request->all())]);
    }

    public function destroy(Request $request, string $id): Response
    {
        $this->service->deleteQuestion($id);

        return response()->noContent();
    }
}
