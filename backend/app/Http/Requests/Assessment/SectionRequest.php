<?php

namespace App\Http\Requests\Assessment;

use Illuminate\Foundation\Http\FormRequest;

/** Tambah / ubah section. Dokumen: link (`document_url`) ATAU file PDF (endpoint terpisah), bukan keduanya. */
class SectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(array_filter([
            'title' => $this->has('title') ? trim((string) $this->input('title')) : null,
        ], fn ($v) => $v !== null));
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'title' => [$required, 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:5000'],
            'document_url' => ['nullable', 'url:http,https', 'max:500'],
            'result_template' => ['nullable', 'in:school_companion,toddler_sensory,child_sensory'],
            'sort_order' => ['sometimes', 'integer', 'between:0,65535'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'title.required' => 'Judul section wajib diisi.',
            'document_url.url' => 'Link dokumen harus berupa URL http/https yang valid.',
            'result_template.in' => 'Template hasil tidak dikenal.',
        ];
    }
}
