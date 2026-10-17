<?php

namespace App\Http\Resources\Assessment;

use App\Models\AssessmentSection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin AssessmentSection */
class SectionResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'title' => $this->title,
            'description' => $this->description,
            'document_url' => $this->document_url,
            'document_name' => $this->document_path ? $this->document_name : null,
            'document_size' => $this->document_path ? $this->document_size : null,
            'has_document_file' => $this->document_path !== null,
            'result_template' => $this->result_template,
            'sort_order' => (int) $this->sort_order,
            'questions' => QuestionResource::collection($this->whenLoaded('assessmentQuestionsViaSection')),
        ];
    }
}
