<?php

namespace App\Http\Requests\Assessment;

use App\Models\AssessmentQuestion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/** Tambah / ubah soal. Opsi wajib untuk tipe pilihan; rentang valid untuk skala. */
class QuestionRequest extends FormRequest
{
    public const TYPES = ['scale_0_5', 'range', 'multiple_choice', 'checkbox_multi', 'free_text', 'yes_no', 'short_text', 'number', 'dropdown', 'date', 'birth_date', 'time'];

    private const CHOICE_TYPES = ['multiple_choice', 'checkbox_multi', 'dropdown'];

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(array_filter([
            'question' => $this->has('question') ? trim((string) $this->input('question')) : null,
        ], fn ($v) => $v !== null));
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'question' => [$required, 'string', 'max:2000'],
            'question_type' => ['sometimes', 'in:'.implode(',', self::TYPES)],
            'item_no' => ['sometimes', 'integer', 'between:1,65535'],
            'sort_order' => ['sometimes', 'integer', 'between:0,65535'],
            'options' => ['nullable', 'array', 'max:50'],
            'options.*' => ['string', 'max:300'],
            'range_min' => ['nullable', 'integer', 'between:0,100'],
            'range_max' => ['nullable', 'integer', 'between:0,100'],
            'range_min_label' => ['nullable', 'string', 'max:60'],
            'range_max_label' => ['nullable', 'string', 'max:60'],
            'is_required' => ['sometimes', 'boolean'],
        ];
    }

    /** @return array<int, \Closure> */
    public function after(): array
    {
        return [function (Validator $v): void {
            $type = $this->input('question_type')
                ?? ($this->isMethod('POST') ? 'scale_0_5' : AssessmentQuestion::query()->whereKey($this->route('question'))->value('question_type'));

            if (in_array($type, self::CHOICE_TYPES, true)) {
                $hasOptions = $this->has('options') ? count((array) $this->input('options')) >= 1 : ! $this->isMethod('POST');
                if (! $hasOptions) {
                    $v->errors()->add('options', 'Minimal satu opsi untuk tipe pilihan.');
                }
            }
            if ($this->filled('range_min') && $this->filled('range_max') && (int) $this->input('range_min') >= (int) $this->input('range_max')) {
                $v->errors()->add('range_max', 'Nilai maksimum harus lebih besar dari minimum.');
            }
        }];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'question.required' => 'Teks soal wajib diisi.',
            'question_type.in' => 'Tipe soal tidak dikenal.',
        ];
    }
}
