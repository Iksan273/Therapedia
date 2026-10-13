<?php

namespace App\Http\Requests\Organization;

use Illuminate\Foundation\Http\FormRequest;

/** Maks sesi per bulan terapis (1 sesi = 1 jam, CHECK 1..744). Kosong = kembali ke bawaan (100). */
class UpdateCapacityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return ['max_sessions_per_month' => ['present', 'nullable', 'integer', 'between:1,744']];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'max_sessions_per_month.present' => 'Maks sesi per bulan wajib dikirim (boleh kosong).',
            'max_sessions_per_month.integer' => 'Maks sesi per bulan harus berupa angka bulat.',
            'max_sessions_per_month.between' => 'Maks sesi per bulan harus antara 1 dan 744.',
        ];
    }
}
