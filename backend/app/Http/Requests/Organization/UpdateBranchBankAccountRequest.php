<?php

namespace App\Http\Requests\Organization;

use App\Models\BranchBankAccount;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBranchBankAccountRequest extends FormRequest
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
        $id = (int) $this->route('account');
        // Keunikan dicek terhadap pasangan bank+no akhir (nilai yang tidak dikirim diambil dari data tersimpan).
        $current = BranchBankAccount::query()->where('branch_id', $branchId)->find($id);
        $bank = (string) $this->input('bank_name', $current?->bank_name ?? '');

        return [
            'bank_name' => ['sometimes', 'string', 'max:100'],
            'account_number' => [
                'sometimes', 'string', 'max:50', 'regex:/^[0-9][0-9 \-]*$/',
                Rule::unique('branch_bank_accounts', 'account_number')
                    ->where('branch_id', $branchId)
                    ->where('bank_name', $bank)
                    ->ignore($id),
            ],
            'account_holder' => ['sometimes', 'string', 'max:150'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'bank_name.string' => 'Nama bank tidak valid.',
            'account_number.regex' => 'Nomor rekening hanya boleh angka, spasi, atau tanda strip.',
            'account_number.unique' => 'Rekening ini sudah terdaftar di cabang tersebut.',
        ];
    }
}
