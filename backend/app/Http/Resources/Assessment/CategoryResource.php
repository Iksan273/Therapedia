<?php

namespace App\Http\Resources\Assessment;

use App\Models\AssessmentCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Kategori kuesioner. `sections` (beserta soal) hanya ada bila dimuat (detail). `filling_count` = jumlah kuesioner yang
 * sedang diisi dengan struktur terbeku: informasi saja, perubahan master tidak memengaruhi mereka.
 *
 * @mixin AssessmentCategory
 */
class CategoryResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type_code' => $this->type_code,
            'name' => $this->name,
            'domain' => $this->domain,
            'respondent_profile' => $this->respondent_profile ?? 'parent',
            'is_active' => (bool) $this->is_active,
            'version' => (int) $this->version,
            'section_count' => $this->when(isset($this->resource->section_count), fn () => (int) $this->resource->section_count),
            'question_count' => $this->when(isset($this->resource->question_count), fn () => (int) $this->resource->question_count),
            'template_section_count' => $this->when(isset($this->resource->template_section_count), fn () => (int) $this->resource->template_section_count),
            'filling_count' => $this->when(isset($this->resource->filling_count), fn () => (int) $this->resource->filling_count),
            'sections' => SectionResource::collection($this->whenLoaded('assessmentSectionsViaCategory')),
        ];
    }
}
