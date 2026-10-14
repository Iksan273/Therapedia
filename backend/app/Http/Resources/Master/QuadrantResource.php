<?php

namespace App\Http\Resources\Master;

use App\Models\SensoryQuadrant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin SensoryQuadrant */
class QuadrantResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'code' => $this->code,
            'title' => $this->title,
            'full_name' => $this->full_name,
            'description' => $this->description,
            'color' => $this->color,
            'sort_order' => (int) $this->sort_order,
            // Pemakaian asli (soal yang memakai kuadran, skor hasil); hanya ada di respons baca (index/show)
            'question_count' => $this->when(isset($this->question_count), fn () => (int) $this->question_count),
            'score_count' => $this->when(isset($this->score_count), fn () => (int) $this->score_count),
        ];
    }
}
