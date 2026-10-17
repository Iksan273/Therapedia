<?php

namespace App\Http\Resources\Assessment;

use App\Models\AssessmentQuestion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin AssessmentQuestion */
class QuestionResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'section_id' => $this->section_id,
            'category_id' => $this->category_id,
            'item_no' => (int) $this->item_no,
            'question_type' => $this->question_type,
            'question' => $this->question,
            'options' => $this->options,
            'range_min' => $this->range_min,
            'range_max' => $this->range_max,
            'range_min_label' => $this->range_min_label,
            'range_max_label' => $this->range_max_label,
            'is_required' => (bool) $this->is_required,
            'sort_order' => (int) $this->sort_order,
        ];
    }
}
