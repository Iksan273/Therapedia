<?php

namespace App\Http\Resources\Master;

use App\Models\CancelReason;
use App\Models\DischargeReason;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Alasan Cancel/Off dan Discharge. `is_therapist_off` hanya ada di alasan Cancel/Off. @mixin CancelReason|DischargeReason */
class ReasonResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'code' => $this->code,
            'label' => $this->label,
            'is_active' => (bool) $this->is_active,
            'sort_order' => (int) $this->sort_order,
        ] + ($this->resource instanceof CancelReason ? ['is_therapist_off' => (bool) $this->is_therapist_off] : []);
    }
}
