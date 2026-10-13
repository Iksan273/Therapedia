<?php

namespace App\Models\Concerns;

use App\Models\Scopes\BranchScope;

/**
 * Membatasi query ke cabang staf yang login. `users.branch_id` NULL = semua cabang (tidak dibatasi).
 * Model yang cabangnya boleh kosong (mis. `holidays`, NULL = berlaku semua cabang) menyetel `$branchScopeIncludesNull = true`.
 */
trait BranchScoped
{
    public static function bootBranchScoped(): void
    {
        static::addGlobalScope(new BranchScope);
    }
}
