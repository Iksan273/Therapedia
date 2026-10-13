<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class ClientLoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['client_code' => mb_strtoupper(trim((string) $this->input('client_code')))]);
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'client_code' => ['required', 'string', 'max:10'],
            'date_of_birth' => ['required', 'date_format:Y-m-d'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'client_code.required' => 'Kode client wajib diisi.',
            'date_of_birth.required' => 'Tanggal lahir anak wajib diisi.',
            'date_of_birth.date_format' => 'Format tanggal lahir harus yyyy-MM-dd.',
        ];
    }
}
