<?php

namespace App\Http\Requests\Organization;

use App\Rules\StrongPassword;
use Illuminate\Foundation\Http\FormRequest;

class ResetUserPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        // Kosong = dibuatkan password sementara dan dikembalikan sekali di respons.
        return ['password' => ['nullable', 'string', new StrongPassword]];
    }
}
