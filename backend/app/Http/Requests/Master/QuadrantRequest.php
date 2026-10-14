<?php

namespace App\Http\Requests\Master;

use Illuminate\Foundation\Http\FormRequest;

/** Tambah (POST) / ubah (PUT, PATCH) kuadran sensori. `code` hanya saat tambah dan tidak dapat diubah. */
class QuadrantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // akses modul `inquiry_master_data` dijaga middleware rute
    }

    protected function prepareForValidation(): void
    {
        $this->merge(array_filter([
            'code' => $this->has('code') ? mb_strtoupper(trim((string) $this->input('code'))) : null,
            'title' => $this->has('title') ? trim((string) $this->input('title')) : null,
            'full_name' => $this->has('full_name') ? trim((string) $this->input('full_name')) : null,
        ], fn ($v) => $v !== null));
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'code' => $this->isMethod('POST') ? ['required', 'string', 'max:10', 'regex:/^[A-Z0-9_-]+$/', 'unique:sensory_quadrants,code'] : ['prohibited'],
            'title' => [$required, 'string', 'max:60'],
            'full_name' => [$required, 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'color' => ['sometimes', 'string', 'max:20'],
            'sort_order' => ['sometimes', 'integer', 'between:0,65535'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'code.required' => 'Kode kuadran wajib diisi.',
            'code.regex' => 'Kode kuadran hanya huruf, angka, strip, dan garis bawah.',
            'code.unique' => 'Kode kuadran ini sudah dipakai.',
            'code.prohibited' => 'Kode kuadran tidak dapat diubah.',
            'title.required' => 'Judul kuadran wajib diisi.',
            'full_name.required' => 'Nama lengkap kuadran wajib diisi.',
        ];
    }
}
