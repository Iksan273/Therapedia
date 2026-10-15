<?php

namespace App\Actions\Organization;

use App\Models\BranchBankAccount;

/** Aktif/nonaktif rekening: nonaktif tidak tampil ke ortu, tetap tersimpan di master. */
class SetBranchBankAccountActiveAction
{
    public function handle(int $branchId, int $accountId, bool $active): BranchBankAccount
    {
        $account = BranchBankAccount::query()->where('branch_id', $branchId)->findOrFail($accountId);
        $account->is_active = $active;
        $account->save();

        return $account;
    }
}
