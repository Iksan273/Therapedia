<?php

namespace App\Http\Requests\Assessment;

use Illuminate\Foundation\Http\FormRequest;

/** Unggah dokumen PDF section (ADR 0007): satu file, maksimal 10 MB. */
class SectionDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return ['file' => ['required', 'file', 'mimes:pdf', 'mimetypes:application/pdf', 'max:10240']];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'file.required' => 'File PDF wajib dipilih.',
            'file.mimes' => 'Dokumen harus berformat PDF.',
            'file.mimetypes' => 'Dokumen harus berformat PDF.',
            'file.max' => 'Ukuran PDF maksimal 10 MB.',
        ];
    }
}
