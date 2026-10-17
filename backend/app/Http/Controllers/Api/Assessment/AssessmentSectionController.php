<?php

namespace App\Http\Controllers\Api\Assessment;

use App\Actions\Assessment\SectionActions;
use App\Http\Controllers\Controller;
use App\Http\Requests\Assessment\SectionDocumentRequest;
use App\Http\Requests\Assessment\SectionRequest;
use App\Http\Resources\Assessment\SectionResource;
use App\Models\AssessmentCategory;
use App\Models\AssessmentSection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/** Section kuesioner (M5, 5.3–5.4) + dokumen PDF per section (5.4a–c, ADR 0007). Tulis: `assessment_master`. */
class AssessmentSectionController extends Controller
{
    public function __construct(private readonly SectionActions $actions) {}

    public function index(string $categoryId): JsonResponse
    {
        AssessmentCategory::query()->findOrFail($categoryId);
        $sections = AssessmentSection::query()->where('category_id', $categoryId)
            ->with(['assessmentQuestionsViaSection' => fn ($q) => $q->orderBy('sort_order')->orderBy('item_no')->orderBy('id')])
            ->orderBy('sort_order')->orderBy('id')->get();

        return response()->json(['data' => SectionResource::collection($sections)->resolve()]);
    }

    public function store(SectionRequest $request, string $categoryId): JsonResponse
    {
        return response()->json(['data' => (new SectionResource($this->actions->create((int) $categoryId, $request->validated())))->resolve()], 201);
    }

    public function show(string $id): JsonResponse
    {
        $section = AssessmentSection::query()
            ->with(['assessmentQuestionsViaSection' => fn ($q) => $q->orderBy('sort_order')->orderBy('item_no')->orderBy('id')])->findOrFail($id);

        return response()->json(['data' => (new SectionResource($section))->resolve()]);
    }

    public function update(SectionRequest $request, string $id): JsonResponse
    {
        return response()->json(['data' => (new SectionResource($this->actions->update((int) $id, $request->validated())))->resolve()]);
    }

    public function destroy(string $id): Response
    {
        $this->actions->delete((int) $id);

        return response()->noContent();
    }

    public function reorder(Request $request, string $categoryId): JsonResponse
    {
        $data = $request->validate(['ids' => ['required', 'array', 'min:1'], 'ids.*' => ['integer', 'distinct']]);
        $this->actions->reorder((int) $categoryId, $data['ids']);

        return $this->index($categoryId);
    }

    public function uploadDocument(SectionDocumentRequest $request, string $id): JsonResponse
    {
        return response()->json(['data' => (new SectionResource($this->actions->uploadDocument((int) $id, $request->file('file'))))->resolve()], 201);
    }

    public function deleteDocument(string $id): JsonResponse
    {
        return response()->json(['data' => (new SectionResource($this->actions->deleteDocument((int) $id)))->resolve()]);
    }

    public function document(string $id): BinaryFileResponse
    {
        $section = AssessmentSection::query()->findOrFail($id);
        abort_if($section->document_path === null || ! Storage::exists($section->document_path), 404, 'Dokumen tidak ditemukan.');

        // Tanpa Content-Disposition (lihat PublicAssessmentActions::pdfResponse): tampil di penampil, bukan diunduh
        return response()->file(Storage::path($section->document_path), ['Content-Type' => 'application/pdf', 'Cache-Control' => 'private, max-age=300']);
    }
}
