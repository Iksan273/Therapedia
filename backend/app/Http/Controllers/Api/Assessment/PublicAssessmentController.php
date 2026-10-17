<?php

namespace App\Http\Controllers\Api\Assessment;

use App\Actions\Assessment\PublicAssessmentActions;
use App\Actions\Assessment\UploadAssessmentProofAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Assessment\DraftRequest;
use App\Http\Requests\Assessment\ProofUploadRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Kuesioner publik tanpa login: buka, simpan draft, submit sekali (M5, 5.9–5.10, schema.md §6.5b).
 * Struktur soal memakai snapshot per kode (dibekukan saat pengisian dimulai).
 */
class PublicAssessmentController extends Controller
{
    public function __construct(private readonly PublicAssessmentActions $actions) {}

    public function show(string $code): JsonResponse
    {
        return response()->json(['data' => $this->actions->open($code)]);
    }

    public function saveDraft(DraftRequest $request, string $code): JsonResponse
    {
        return response()->json(['data' => $this->actions->saveDraft($code, $request->validated(), $request->ip())]);
    }

    public function submit(DraftRequest $request, string $code): JsonResponse
    {
        return response()->json(['data' => $this->actions->submit($code, $request->validated(), $request->ip())], 201);
    }

    public function uploadProof(ProofUploadRequest $request, UploadAssessmentProofAction $upload, string $code): JsonResponse
    {
        return response()->json(['data' => $upload->handle($code, $request->file('file'))], 201);
    }

    public function document(Request $request, string $code, string $sectionId): BinaryFileResponse
    {
        return $this->actions->document($code, (int) $sectionId);
    }
}
