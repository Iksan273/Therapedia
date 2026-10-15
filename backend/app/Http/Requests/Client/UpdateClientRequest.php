<?php

namespace App\Http\Requests\Client;

use Illuminate\Foundation\Http\FormRequest;

/** Ubah biodata. Kode client, cabang, dan status tidak bisa diubah di sini (field itu diabaikan). */
class UpdateClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
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
            'version' => ['required', 'integer', 'min:1'],
            'child_name' => ['sometimes', 'required', 'string', 'max:150'],
            'gender' => ['sometimes', 'required', 'in:male,female'],
            'date_of_birth' => ['sometimes', 'required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'parent_name' => ['sometimes', 'required', 'string', 'max:150'],
            'parent_phone' => ['sometimes', 'required', 'string', 'max:30', 'regex:/^[0-9+\-\s()]{6,30}$/'],
            'parent_email' => ['sometimes', 'nullable', 'email', 'max:150'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'intake_note' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'version.required' => 'Versi data wajib dikirim.',
            'child_name.required' => 'Nama anak wajib diisi.',
            'gender.in' => 'Jenis kelamin tidak valid.',
            'date_of_birth.date_format' => 'Tanggal lahir harus berformat yyyy-MM-dd.',
            'date_of_birth.before_or_equal' => 'Tanggal lahir tidak boleh di masa depan.',
            'parent_name.required' => 'Nama orang tua wajib diisi.',
            'parent_phone.required' => 'Nomor telepon orang tua wajib diisi.',
            'parent_phone.regex' => 'Nomor telepon tidak valid.',
            'parent_email.email' => 'Format email tidak valid.',
        ];
    }
}
