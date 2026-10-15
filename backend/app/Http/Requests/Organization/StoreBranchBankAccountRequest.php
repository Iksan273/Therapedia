<?php

namespace App\Http\Requests\Organization;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBranchBankAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // akses modul `branch_master` dijaga middleware rute
    }

    protected function prepareForValidation(): void
    {
        $this->merge(array_filter([
            'bank_name' => $this->has('bank_name') ? trim((string) $this->input('bank_name')) : null,
            'account_number' => $this->has('account_number') ? trim((string) $this->input('account_number')) : null,
            'account_holder' => $this->has('account_holder') ? trim((string) $this->input('account_holder')) : null,
        ], fn ($v) => $v !== null));
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $branchId = (int) $this->route('branch');

        return [
            'bank_name' => ['required', 'string', 'max:100'],
            'account_number' => [
                'required', 'string', 'max:50', 'regex:/^[0-9][0-9 \-]*$/',
                Rule::unique('branch_bank_accounts', 'account_number')
                    ->where('branch_id', $branchId)
                    ->where('bank_name', (string) $this->input('bank_name')),
            ],
            'account_holder' => ['required', 'string', 'max:150'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'bank_name.required' => 'Nama bank wajib diisi.',
            'account_number.required' => 'Nomor rekening wajib diisi.',
            'account_number.regex' => 'Nomor rekening hanya boleh angka, spasi, atau tanda strip.',
            'account_number.unique' => 'Rekening ini sudah terdaftar di cabang tersebut.',
            'account_holder.required' => 'Nama pemilik rekening wajib diisi.',
        ];
    }
}
