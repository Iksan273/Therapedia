<?php

namespace App\Http\Requests\Client;

use Illuminate\Foundation\Http\FormRequest;

class StoreClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // akses modul `inquiry_pipeline` dijaga middleware rute
    }

    protected function prepareForValidation(): void
    {
        $trim = ['child_name', 'parent_name', 'parent_phone', 'parent_email', 'address', 'intake_note'];
        $this->merge(collect($trim)
            ->filter(fn ($f) => is_string($this->input($f)))
            ->mapWithKeys(fn ($f) => [$f => trim($this->input($f))])
            ->all());
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'child_name' => ['required', 'string', 'max:150'],
            'gender' => ['required', 'in:male,female'],
            'date_of_birth' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'parent_name' => ['required', 'string', 'max:150'],
            'parent_phone' => ['required', 'string', 'max:30', 'regex:/^[0-9+\-\s()]{6,30}$/'],
            'parent_email' => ['nullable', 'email', 'max:150'],
            'address' => ['nullable', 'string', 'max:500'],
            'intake_note' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'child_name.required' => 'Nama anak wajib diisi.',
            'gender.required' => 'Jenis kelamin wajib dipilih.',
            'gender.in' => 'Jenis kelamin tidak valid.',
            'date_of_birth.required' => 'Tanggal lahir anak wajib diisi.',
            'date_of_birth.date_format' => 'Tanggal lahir harus berformat yyyy-MM-dd.',
            'date_of_birth.before_or_equal' => 'Tanggal lahir tidak boleh di masa depan.',
            'parent_name.required' => 'Nama orang tua wajib diisi.',
            'parent_phone.required' => 'Nomor telepon orang tua wajib diisi.',
            'parent_phone.regex' => 'Nomor telepon tidak valid.',
            'parent_email.email' => 'Format email tidak valid.',
            'branch_id.exists' => 'Cabang tidak ditemukan.',
        ];
    }
}
