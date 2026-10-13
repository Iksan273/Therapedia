<?php

namespace App\Support;

use App\Exceptions\ApiException;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Cabang efektif sebuah request (implementation_detail.md §1.1).
 * - Staf ber-cabang (non-master): SELALU cabang miliknya; `?branch_id=` diabaikan. `BranchScope` (global scope model)
 *   menjadi lapis kedua, jadi data cabang lain tidak pernah lolos walau helper ini terlewat.
 * - Master / staf semua cabang (`users.branch_id` NULL): `?branch_id=<id>` memfilter, kosong atau `all` = semua cabang.
 *
 * Pakai `BranchContext::apply($query, $request)` di query list yang punya kolom `branch_id`.
 */
final class BranchContext
{
    /** @return int|null id cabang yang dipakai memfilter, null = semua cabang */
    public static function resolve(Request $request): ?int
    {
        $user = $request->user();

        if ($user instanceof User && $user->branch_id !== null) {
            return (int) $user->branch_id;
        }

        $value = $request->query('branch_id');

        if ($value === null || $value === '' || $value === 'all') {
            return null;
        }

        if (! is_scalar($value) || ! ctype_digit((string) $value)) {
            throw ApiException::validation(['branch_id' => ['Cabang tidak valid.']]);
        }

        return (int) $value;
    }

    /**
     * @template TQuery of \Illuminate\Database\Eloquent\Builder|\Illuminate\Database\Query\Builder
     *
     * @param  TQuery  $query
     * @return TQuery
     */
    public static function apply($query, Request $request, string $column = 'branch_id')
    {
        $branchId = self::resolve($request);

        return $branchId === null ? $query : $query->where($column, $branchId);
    }
}
