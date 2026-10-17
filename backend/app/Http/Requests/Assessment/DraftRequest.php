<?php

namespace App\Http\Requests\Assessment;

use Illuminate\Foundation\Http\FormRequest;

/** Simpan draft (patch jawaban) atau submit. Validasi per soal ada di PublicAssessmentActions (butuh struktur). */
class DraftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // kunci = kode kuesioner (publik, ber-throttle)
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'answers' => ['sometimes', 'array', 'max:3000'],
            'answers.*' => ['nullable', 'array'],
            'answers.*.t' => ['nullable'],
            'answers.*.v' => ['nullable', 'array'],
            'answers.*.v.*' => ['nullable'],
            'respondent' => ['sometimes', 'nullable', 'array'],
            'respondent.*' => ['nullable', 'string', 'max:200'],
            'last_section_id' => ['nullable', 'integer'],
            'consent' => ['sometimes', 'boolean'],
            'version' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
