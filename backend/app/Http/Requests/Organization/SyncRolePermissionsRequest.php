<?php

namespace App\Http\Requests\Organization;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Simpan matriks izin sebuah role. Bentuk: `{ "permissions": [{ "module_code": "finance", "allowed": true }, ...] }`
 * (array, bukan kamus berkunci kode modul: konvensi key JSON). Modul yang tidak dikirim tidak berubah.
 */
class SyncRolePermissionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'permissions' => ['required', 'array', 'min:1'],
            'permissions.*.module_code' => ['required', 'string', 'distinct', 'exists:access_modules,code'],
            'permissions.*.allowed' => ['required', 'boolean'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'permissions.required' => 'Daftar izin wajib dikirim.',
            'permissions.*.module_code.exists' => 'Kode modul tidak dikenal.',
            'permissions.*.module_code.distinct' => 'Kode modul tidak boleh dobel.',
            'permissions.*.allowed.required' => 'Status izin wajib dikirim.',
            'permissions.*.allowed.boolean' => 'Status izin harus true atau false.',
        ];
    }
}
