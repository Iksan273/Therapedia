<?php

namespace App\Http\Requests\Assessment;

use Illuminate\Foundation\Http\FormRequest;

/** Bukti transfer: JPG/PNG/PDF, maksimal 5 MB. */
class ProofUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // kunci = kode kuesioner (publik, ber-throttle)
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return ['file' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120']];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'file.required' => 'File bukti transfer wajib dipilih.',
            'file.mimes' => 'Format file tidak didukung. Gunakan JPG, PNG, atau PDF.',
            'file.max' => 'Ukuran file terlalu besar. Maksimal 5 MB.',
        ];
    }
}
