<?php

namespace App\Http\Controllers\Api\Assessment;

use App\Http\Controllers\Controller;
use App\Services\AssessmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Kuesioner publik tanpa login: buka, simpan draft, submit sekali (M5, schema.md §6.5b).
 * Tipis: validasi (Form Request) di sini nanti, logika bisnis di AssessmentService / Action.
 */
class PublicAssessmentController extends Controller
{
    public function __construct(private readonly AssessmentService $service) {}

    public function show(Request $request, string $code): JsonResponse
    {
        return response()->json(['data' => $this->service->open($code)]);
    }

    public function saveDraft(Request $request, string $code): JsonResponse
    {
        return response()->json(['data' => $this->service->saveDraft($code, $request->all())]);
    }

    public function submit(Request $request, string $code): JsonResponse
    {
        return response()->json(['data' => $this->service->submit($code, $request->all())], 201);
    }
}
