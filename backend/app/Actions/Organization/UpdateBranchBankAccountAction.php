<?php

namespace App\Actions\Organization;

use App\Models\BranchBankAccount;

/** Ubah rekening bank cabang (field yang tidak dikirim tidak berubah). */
class UpdateBranchBankAccountAction
{
    /** @param array<string, mixed> $data */
    public function handle(int $branchId, int $accountId, array $data): BranchBankAccount
    {
        $account = BranchBankAccount::query()->where('branch_id', $branchId)->findOrFail($accountId);

        $account->fill(array_intersect_key($data, array_flip(['bank_name', 'account_number', 'account_holder', 'sort_order'])));
        $account->save();

        return $account;
    }
}
