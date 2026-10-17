<?php

namespace App\Http\Controllers\Api\Assessment;

use App\Actions\Assessment\QuestionActions;
use App\Http\Controllers\Controller;
use App\Http\Requests\Assessment\QuestionRequest;
use App\Http\Resources\Assessment\QuestionResource;
use App\Models\AssessmentQuestion;
use App\Models\AssessmentSection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** Soal kuesioner (M5, 5.5), nested di section. Tulis: `assessment_master`. Hapus soal yang sudah dijawab → 409 `in_use`. */
class AssessmentQuestionController extends Controller
{
    public function __construct(private readonly QuestionActions $actions) {}

    public function index(string $sectionId): JsonResponse
    {
        AssessmentSection::query()->findOrFail($sectionId);
        $questions = AssessmentQuestion::query()->where('section_id', $sectionId)->orderBy('sort_order')->orderBy('item_no')->orderBy('id')->get();

        return response()->json(['data' => QuestionResource::collection($questions)->resolve()]);
    }

    public function store(QuestionRequest $request, string $sectionId): JsonResponse
    {
        return response()->json(['data' => (new QuestionResource($this->actions->create((int) $sectionId, $request->validated())))->resolve()], 201);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(['data' => (new QuestionResource(AssessmentQuestion::query()->findOrFail($id)))->resolve()]);
    }

    public function update(QuestionRequest $request, string $id): JsonResponse
    {
        return response()->json(['data' => (new QuestionResource($this->actions->update((int) $id, $request->validated())))->resolve()]);
    }

    public function reorder(Request $request, string $sectionId): JsonResponse
    {
        $data = $request->validate(['ids' => ['required', 'array', 'min:1'], 'ids.*' => ['integer', 'distinct']]);
        $this->actions->reorder((int) $sectionId, $data['ids']);

        return $this->index($sectionId);
    }

    public function destroy(string $id): Response
    {
        $this->actions->delete((int) $id);

        return response()->noContent();
    }
}
