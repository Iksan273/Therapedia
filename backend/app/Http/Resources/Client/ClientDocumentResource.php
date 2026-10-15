<?php

namespace App\Http\Resources\Client;

use App\Models\ClientDocument;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ClientDocument */
class ClientDocumentResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'label' => $this->label,
            'url' => $this->url,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
