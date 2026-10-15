<?php

namespace App\Http\Requests\Client;

use Illuminate\Foundation\Http\FormRequest;

class CheckDuplicateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'child_name' => ['required', 'string', 'max:150'],
            'date_of_birth' => ['required', 'date_format:Y-m-d'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'child_name.required' => 'Nama anak wajib diisi.',
            'date_of_birth.required' => 'Tanggal lahir wajib diisi.',
            'date_of_birth.date_format' => 'Tanggal lahir harus berformat yyyy-MM-dd.',
        ];
    }
}
