<?php

namespace App\Actions\Organization;

use App\Models\Branch;
use App\Models\BranchBankAccount;

/** Tambah rekening bank pembayaran ke satu cabang (modul branch_master). */
class CreateBranchBankAccountAction
{
    /** @param array<string, mixed> $data */
    public function handle(int $branchId, array $data): BranchBankAccount
    {
        $branch = Branch::query()->findOrFail($branchId);

        return $branch->bankAccounts()->create([
            'bank_name' => $data['bank_name'],
            'account_number' => $data['account_number'],
            'account_holder' => $data['account_holder'],
            'is_active' => $data['is_active'] ?? true,
            'sort_order' => $data['sort_order'] ?? ((int) $branch->bankAccounts()->max('sort_order') + 1),
        ]);
    }
}
