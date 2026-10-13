<?php

namespace App\Http\Requests\Organization;

use Illuminate\Foundation\Http\FormRequest;

/** Aktif/nonaktif (akun staf, cabang). */
class SetActiveRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return ['is_active' => ['required', 'boolean']];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['is_active.required' => 'Status aktif wajib dikirim.', 'is_active.boolean' => 'Status aktif harus true atau false.'];
    }
}
