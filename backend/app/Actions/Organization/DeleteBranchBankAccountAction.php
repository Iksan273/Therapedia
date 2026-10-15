<?php

namespace App\Actions\Organization;

use App\Models\BranchBankAccount;

/** Hapus permanen rekening cabang (tidak dipakai FK lain). */
class DeleteBranchBankAccountAction
{
    public function handle(int $branchId, int $accountId): void
    {
        BranchBankAccount::query()->where('branch_id', $branchId)->findOrFail($accountId)->delete();
    }
}
