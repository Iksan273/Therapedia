<?php

namespace App\Http\Requests\Client;

use Illuminate\Foundation\Http\FormRequest;

class GdriveLinkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('url'))) {
            $this->merge(['url' => trim($this->input('url'))]);
        }
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'url' => ['required', 'string', 'max:500', 'url:http,https'],
            'label' => ['nullable', 'string', 'max:150'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'url.required' => 'Tautan Google Drive wajib diisi.',
            'url.url' => 'Tautan harus berupa URL http/https yang valid.',
        ];
    }
}
