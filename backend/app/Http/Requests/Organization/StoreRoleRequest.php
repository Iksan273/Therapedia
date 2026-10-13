<?php

namespace App\Http\Requests\Organization;

use Illuminate\Foundation\Http\FormRequest;

class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // akses modul `rbac` dijaga middleware rute
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('code')) {
            $this->merge(['code' => mb_strtolower(trim((string) $this->input('code')))]);
        }
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            // Kosong = dibuat dari nama (slug). Hanya huruf kecil, angka, garis bawah.
            'code' => ['nullable', 'string', 'regex:/^[a-z][a-z0-9_]{1,49}$/', 'unique:roles,code'],
            'badge' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            // Izin awal: daftar kode modul yang diizinkan (modul lain = tidak diizinkan).
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:access_modules,code'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.required' => 'Nama role wajib diisi.',
            'code.regex' => 'Kode role hanya boleh huruf kecil, angka, dan garis bawah (diawali huruf, 2-50 karakter).',
            'code.unique' => 'Kode role ini sudah dipakai.',
            'permissions.*.exists' => 'Kode modul tidak dikenal.',
        ];
    }
}
