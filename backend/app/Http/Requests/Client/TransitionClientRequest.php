<?php

namespace App\Http\Requests\Client;

use App\Services\ClientStatusService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TransitionClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'to_status' => ['required', Rule::in(ClientStatusService::STATUSES)],
            // Wajib untuk discharged / discontinued; dicek juga di TransitionClientAction
            'reason' => ['nullable', 'string', 'max:150'],
            'note' => ['nullable', 'string', 'max:2000'],
            'version' => ['required', 'integer', 'min:1'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'to_status.required' => 'Status tujuan wajib dipilih.',
            'to_status.in' => 'Status tujuan tidak valid.',
            'version.required' => 'Versi data wajib dikirim.',
            'reason.max' => 'Alasan maksimal 150 karakter.',
        ];
    }
}
