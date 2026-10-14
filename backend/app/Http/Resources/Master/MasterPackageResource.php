<?php

namespace App\Http\Resources\Master;

use App\Models\MasterPackage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin MasterPackage */
class MasterPackageResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'invoice_code' => $this->invoice_code,
            'name' => $this->name,
            'credits' => (int) $this->credits,
            'price' => (int) $this->price,
            'leave_quota' => (int) $this->leave_quota,
            'is_satuan' => (bool) $this->is_satuan,
            'is_assessment' => (bool) $this->is_assessment,
            'description' => $this->description,
            'is_active' => (bool) $this->is_active,
        ];
    }
}
