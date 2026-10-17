<?php

namespace App\Http\Requests\Assessment;

use Illuminate\Foundation\Http\FormRequest;

/** Terbitkan kode kuesioner untuk client. */
class IssueAccessCodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'category_id' => ['required', 'integer', 'exists:assessment_categories,id'],
            'validity_days' => ['nullable', 'integer', 'between:1,365'],
            'with_invoice' => ['sometimes', 'boolean'],
            'master_package_id' => ['nullable', 'integer', 'exists:master_packages,id'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'category_id.required' => 'Jenis kuesioner wajib dipilih.',
            'category_id.exists' => 'Jenis kuesioner tidak ditemukan.',
            'validity_days.between' => 'Masa berlaku 1–365 hari.',
        ];
    }
}
