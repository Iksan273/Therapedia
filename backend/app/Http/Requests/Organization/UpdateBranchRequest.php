<?php

namespace App\Http\Requests\Organization;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBranchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(array_filter([
            'code' => $this->has('code') ? mb_strtoupper(trim((string) $this->input('code'))) : null,
            'name' => $this->has('name') ? trim((string) $this->input('name')) : null,
        ], fn ($v) => $v !== null));
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $id = $this->route('branch');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:100', Rule::unique('branches', 'name')->ignore($id)],
            'code' => ['sometimes', 'required', 'string', 'regex:/^[A-Z0-9]{2,10}$/', Rule::unique('branches', 'code')->ignore($id)],
            'city' => ['sometimes', 'nullable', 'string', 'max:50'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.required' => 'Nama cabang wajib diisi.',
            'name.unique' => 'Nama cabang ini sudah dipakai.',
            'code.required' => 'Kode cabang wajib diisi.',
            'code.regex' => 'Kode cabang 2-10 karakter, hanya huruf dan angka.',
            'code.unique' => 'Kode cabang ini sudah dipakai.',
        ];
    }
}
