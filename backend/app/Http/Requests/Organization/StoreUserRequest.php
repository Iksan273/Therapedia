<?php

namespace App\Http\Requests\Organization;

use App\Rules\StrongPassword;
use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // akses modul `user_management` dijaga middleware rute
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('email')) {
            $this->merge(['email' => mb_strtolower(trim((string) $this->input('email')))]);
        }
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'string', 'email', 'max:150', 'unique:users,email'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            // NULL = semua cabang (akun lintas cabang). Role master selalu NULL (dipaksa Action).
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            // Kosong = dibuatkan password sementara dan dikembalikan sekali di respons.
            'password' => ['nullable', 'string', new StrongPassword],
            'phone' => ['nullable', 'string', 'max:30'],
            'title' => ['nullable', 'string', 'max:50'],
            'specialty' => ['nullable', 'string', 'max:150'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.required' => 'Nama wajib diisi.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email ini sudah dipakai akun lain.',
            'role_id.required' => 'Role wajib dipilih.',
            'role_id.exists' => 'Role tidak ditemukan.',
            'branch_id.exists' => 'Cabang tidak ditemukan.',
        ];
    }
}
