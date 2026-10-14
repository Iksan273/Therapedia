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
        ];
    }
}
