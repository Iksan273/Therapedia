<?php

namespace App\Http\Resources\Master;

use App\Models\Holiday;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** `affected_sessions` hanya ada bila dihitung (respons tambah/ubah). @mixin Holiday */
class HolidayResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $data = [
            'id' => $this->id,
            'holiday_date' => $this->holiday_date->format('Y-m-d'),
            'name' => $this->name,
            'branch_id' => $this->branch_id,
        ];

        if (array_key_exists('affected_sessions', $this->resource->getAttributes())) {
            $data['affected_sessions'] = (int) $this->resource->getAttribute('affected_sessions');
        }

        return $data;
    }
}
