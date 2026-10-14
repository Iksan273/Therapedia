<?php

namespace App\Http\Requests\Master;

use Illuminate\Foundation\Http\FormRequest;

/** Tambah (POST) / ubah (PUT, PATCH) layanan intake. `code` hanya saat tambah dan tidak dapat diubah. */
class ServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // akses modul `inquiry_master_data` dijaga middleware rute
    }

    protected function prepareForValidation(): void
    {
        $this->merge(array_filter([
            'code' => $this->has('code') ? trim((string) $this->input('code')) : null,
            'label' => $this->has('label') ? trim((string) $this->input('label')) : null,
        ], fn ($v) => $v !== null));
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'code' => $this->isMethod('POST') ? ['required', 'string', 'max:50', 'regex:/^[A-Za-z0-9_-]+$/', 'unique:services,code'] : ['prohibited'],
            'label' => [$required, 'string', 'max:150'],
            'category' => [$required, 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'between:0,65535'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'code.required' => 'Kode layanan wajib diisi.',
            'code.regex' => 'Kode layanan hanya huruf, angka, strip, dan garis bawah.',
            'code.unique' => 'Kode layanan ini sudah dipakai.',
            'code.prohibited' => 'Kode layanan tidak dapat diubah.',
            'label.required' => 'Nama layanan wajib diisi.',
            'category.required' => 'Kategori layanan wajib diisi.',
        ];
    }
}
