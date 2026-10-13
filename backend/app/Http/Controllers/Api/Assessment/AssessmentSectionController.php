<?php

namespace App\Http\Controllers\Api\Assessment;

use App\Http\Controllers\Controller;
use App\Services\AssessmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Section kuesioner (M5), nested di kategori.
 * Tipis: validasi (Form Request) di sini nanti, logika bisnis di AssessmentService / Action.
 */
class AssessmentSectionController extends Controller
{
    public function __construct(private readonly AssessmentService $service) {}

    public function index(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->sections($id)]);
    }

    public function store(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->createSection($id, $request->all())], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->findSection($id)]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->updateSection($id, $request->all())]);
    }

    public function destroy(Request $request, string $id): Response
    {
        $this->service->deleteSection($id);

        return response()->noContent();
    }
}
