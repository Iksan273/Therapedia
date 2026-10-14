<?php

namespace App\Http\Resources\Master;

use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Service */
class ServiceResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'code' => $this->code,
            'label' => $this->label,
            'category' => $this->category,
            'description' => $this->description,
            'is_active' => (bool) $this->is_active,
            'sort_order' => (int) $this->sort_order,
            // Pemakaian asli (client yang memilih layanan, jadwal bertanggal); hanya ada di respons baca (index/show)
            'client_count' => $this->when(isset($this->client_count), fn () => (int) $this->client_count),
            'schedule_count' => $this->when(isset($this->schedule_count), fn () => (int) $this->schedule_count),
        ];
    }
}
