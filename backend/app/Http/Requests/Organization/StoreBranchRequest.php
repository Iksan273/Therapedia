<?php

namespace App\Http\Requests\Organization;

use Illuminate\Foundation\Http\FormRequest;

class StoreBranchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // akses modul `branch_master` dijaga middleware rute
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
        return [
            'name' => ['required', 'string', 'max:100', 'unique:branches,name'],
            'code' => ['required', 'string', 'regex:/^[A-Z0-9]{2,10}$/', 'unique:branches,code'],
            'city' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:500'],
            'phone' => ['nullable', 'string', 'max:30'],
            'is_active' => ['sometimes', 'boolean'],
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
