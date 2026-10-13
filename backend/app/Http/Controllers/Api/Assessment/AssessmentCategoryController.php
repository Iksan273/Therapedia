<?php

namespace App\Http\Controllers\Api\Assessment;

use App\Http\Controllers\Controller;
use App\Services\AssessmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Kategori kuesioner (M5).
 * Tipis: validasi (Form Request) di sini nanti, logika bisnis di AssessmentService / Action.
 */
class AssessmentCategoryController extends Controller
{
    public function __construct(private readonly AssessmentService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->paginateCategory($request->query())]);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->createCategory($request->all())], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->findCategory($id)]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->service->updateCategory($id, $request->all())]);
    }

    public function destroy(Request $request, string $id): Response
    {
        $this->service->deleteCategory($id);

        return response()->noContent();
    }
}
