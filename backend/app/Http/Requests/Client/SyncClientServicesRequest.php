<?php

namespace App\Http\Requests\Client;

use Illuminate\Foundation\Http\FormRequest;

class SyncClientServicesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'service_codes' => ['present', 'array'],
            'service_codes.*' => ['string', 'max:50', 'distinct'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'service_codes.present' => 'Daftar layanan wajib dikirim (boleh kosong).',
            'service_codes.array' => 'Daftar layanan tidak valid.',
        ];
    }
}
