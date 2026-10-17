<?php

namespace App\Http\Controllers\Api\Assessment;

use App\Actions\Assessment\CategoryActions;
use App\Http\Controllers\Controller;
use App\Http\Requests\Assessment\CategoryRequest;
use App\Http\Resources\Assessment\CategoryResource;
use App\Models\AssessmentCategory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * Kategori kuesioner (M5, 5.1–5.2). Baca: `assessment_master` atau `inquiry_pipeline`; tulis: `assessment_master`.
 * Hapus kategori yang sudah dipakai kode/hasil → 409 `in_use`.
 */
class AssessmentCategoryController extends Controller
{
    public function __construct(private readonly CategoryActions $actions) {}

    public function index(): JsonResponse
    {
        $categories = $this->withCounts(AssessmentCategory::query())->orderBy('id')->get(); // urutan bawaan seed (bukan abjad)

        return response()->json(['data' => CategoryResource::collection($categories)->resolve()]);
    }

    public function show(string $id): JsonResponse
    {
        $category = $this->withCounts(AssessmentCategory::query())
            ->with([
                'assessmentSectionsViaCategory' => fn ($q) => $q->orderBy('sort_order')->orderBy('id'),
                'assessmentSectionsViaCategory.assessmentQuestionsViaSection' => fn ($q) => $q->orderBy('sort_order')->orderBy('item_no')->orderBy('id'),
            ])->findOrFail($id);

        return response()->json(['data' => (new CategoryResource($category))->resolve()]);
    }

    public function store(CategoryRequest $request): JsonResponse
    {
        $category = $this->actions->create($request->validated());

        return response()->json(['data' => (new CategoryResource($category))->resolve()], 201);
    }

    /** Duplikat template: salin section + soal ke kategori baru (kode jenis & nama baru). */
    public function duplicate(CategoryRequest $request, string $id): JsonResponse
    {
        $new = $this->actions->duplicate((int) $id, $request->validated());
        $category = $this->withCounts(AssessmentCategory::query())->findOrFail($new->id);

        return response()->json(['data' => (new CategoryResource($category))->resolve()], 201);
    }

    public function update(CategoryRequest $request, string $id): JsonResponse
    {
        return response()->json(['data' => (new CategoryResource($this->actions->update((int) $id, $request->validated())))->resolve()]);
    }

    public function destroy(string $id): Response
    {
        $this->actions->delete((int) $id);

        return response()->noContent();
    }

    private function withCounts(Builder $query): Builder
    {
        return $query->withCount([
            'assessmentSectionsViaCategory as section_count',
            'assessmentQuestionsViaCategory as question_count',
            'assessmentSectionsViaCategory as template_section_count' => fn ($q) => $q->whereNotNull('result_template'),
            'assessmentAccessCodesViaCategory as filling_count' => fn ($q) => $q->where('status', 'issued')->whereNotNull('snapshot_at'),
        ]);
    }
}
