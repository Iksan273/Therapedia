<?php

namespace App\Support;

/**
 * Pencarian prefix `q` (implementation_detail.md §1.1, schema.md Q5): cocok di AWAL nilai kolom, tidak case-sensitive
 * (collation utf8mb4_unicode_ci), sehingga indeks B-tree (`idx_clients_child_name`, `idx_clients_parent_name`,
 * UNIQUE `client_code`) terpakai. Bukan `%q%`.
 *
 * Contoh: PrefixSearch::apply($clients, $request->query('q'), ['child_name', 'parent_name', 'client_code']);
 */
final class PrefixSearch
{
    /**
     * @template TQuery of \Illuminate\Database\Eloquent\Builder|\Illuminate\Database\Query\Builder
     *
     * @param  TQuery  $query
     * @param  list<string>  $columns  cocok di salah satu kolom (OR)
     * @return TQuery
     */
    public static function apply($query, ?string $term, array $columns)
    {
        $term = trim((string) $term);

        if ($term === '' || $columns === []) {
            return $query;
        }

        $pattern = self::escapeLike($term).'%';

        return $query->where(function ($q) use ($columns, $pattern): void {
            foreach ($columns as $column) {
                $q->orWhere($column, 'like', $pattern);
            }
        });
    }

    /**
     * Prefix PER KATA (daftar client): `Wir` menemukan `Kenzo Wirawan`. Kolom `$wordColumns` dicocokkan di awal nilai
     * ATAU di awal kata mana pun (`LIKE 'x%' OR LIKE '% x%'`); kolom `$prefixColumns` hanya di awal nilai (mis. kode).
     *
     * @template TQuery of \Illuminate\Database\Eloquent\Builder|\Illuminate\Database\Query\Builder
     *
     * @param  TQuery  $query
     * @param  list<string>  $wordColumns
     * @param  list<string>  $prefixColumns
     * @return TQuery
     */
    public static function applyWords($query, ?string $term, array $wordColumns, array $prefixColumns = [])
    {
        $term = trim((string) $term);

        if ($term === '') {
            return $query;
        }

        $escaped = self::escapeLike($term);

        return $query->where(function ($q) use ($wordColumns, $prefixColumns, $escaped): void {
            foreach ($wordColumns as $column) {
                $q->orWhere($column, 'like', $escaped.'%')->orWhere($column, 'like', '% '.$escaped.'%');
            }
            foreach ($prefixColumns as $column) {
                $q->orWhere($column, 'like', $escaped.'%');
            }
        });
    }

    public static function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }
}
