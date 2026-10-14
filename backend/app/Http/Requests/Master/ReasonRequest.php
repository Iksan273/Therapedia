<?php

namespace App\Http\Requests\Master;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Alasan Cancel/Off (`cancel_reasons`, bendera `is_therapist_off`) dan alasan Discharge (`discharge_reasons`).
 * Satu request untuk keduanya: tabel ditentukan dari path (`master/cancel-reasons` | `master/discharge-reasons`).
 */
class ReasonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // akses modul `inquiry_master_data` dijaga middleware rute
    }

    private function isCancel(): bool
    {
        return str_contains($this->path(), 'cancel-reasons');
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
        $table = $this->isCancel() ? 'cancel_reasons' : 'discharge_reasons';

        $rules = [
            'code' => $this->isMethod('POST')
                ? ['required', 'string', 'max:40', 'regex:/^[A-Za-z0-9_-]+$/', Rule::unique($table, 'code')]
                : ['prohibited'],
            'label' => [$this->isMethod('POST') ? 'required' : 'sometimes', 'string', 'max:120'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'between:0,65535'],
        ];

        if ($this->isCancel()) {
            $rules['is_therapist_off'] = ['sometimes', 'boolean'];
        }

        return $rules;
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'code.required' => 'Kode alasan wajib diisi.',
            'code.regex' => 'Kode alasan hanya huruf, angka, strip, dan garis bawah.',
            'code.unique' => 'Kode alasan ini sudah dipakai.',
            'code.prohibited' => 'Kode alasan tidak dapat diubah.',
            'label.required' => 'Nama alasan wajib diisi.',
        ];
    }
}
