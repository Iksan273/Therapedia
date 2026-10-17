<?php

namespace App\Http\Requests\Assessment;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Tambah (POST) / ubah (PATCH) kategori kuesioner. `type_code` boleh diubah selama belum dipakai kode kuesioner (dicek di CategoryActions); `version` wajib saat ubah. */
class CategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // akses modul `assessment_master` dijaga middleware rute
    }

    protected function prepareForValidation(): void
    {
        $this->merge(array_filter([
            'type_code' => $this->has('type_code') ? strtoupper(trim((string) $this->input('type_code'))) : null,
            'name' => $this->has('name') ? trim((string) $this->input('name')) : null,
        ], fn ($v) => $v !== null));
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $post = $this->isMethod('POST');

        return [
            'type_code' => [$post ? 'required' : 'sometimes', 'string', 'max:10', 'regex:/^[A-Z0-9]+$/', Rule::unique('assessment_categories', 'type_code')->ignore($post ? null : $this->route('assessment_category'))],
            'name' => [$post ? 'required' : 'sometimes', 'string', 'max:200'],
            'domain' => ['nullable', 'string', 'max:150'],
            'respondent_profile' => ['sometimes', 'in:none,parent,teacher'],
            'is_active' => ['sometimes', 'boolean'],
            'version' => $post ? ['prohibited'] : ['required', 'integer', 'min:1'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'type_code.required' => 'Kode jenis wajib diisi.',
            'type_code.regex' => 'Kode jenis hanya huruf besar dan angka.',
            'type_code.unique' => 'Kode jenis ini sudah dipakai.',
            'name.required' => 'Nama kategori wajib diisi.',
        ];
    }
}
