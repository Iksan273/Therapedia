<?php

namespace App\Models\Scopes;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class BranchScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $user = Auth::user();

        // Bukan staf (ortu / proses sistem) atau staf semua cabang (branch_id NULL): tanpa pembatasan.
        if (! $user instanceof User || $user->branch_id === null) {
            return;
        }

        $column = $model->qualifyColumn('branch_id');
        $includeNull = (bool) ($model->branchScopeIncludesNull ?? false);

        $builder->where(function (Builder $query) use ($column, $user, $includeNull): void {
            $query->where($column, $user->branch_id);
            if ($includeNull) {
                $query->orWhereNull($column);
            }
        });
    }
}
