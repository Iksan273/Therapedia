<?php

namespace App\Support;

use App\Exceptions\ApiException;
use Illuminate\Contracts\Database\Eloquent\Builder as EloquentBuilderContract;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Request;

/**
 * Pagination seragam (implementation_detail.md §1.1). Filter & pencarian dijalankan SEBELUM memanggil helper ini.
 *
 * - offset : `?page=&per_page=` (default 10, maks 50) → `{ data, meta:{ total, page, per_page, last_page } }`
 * - keyset : `?cursor=&per_page=` untuk riwayat yang terus bertambah (credit-ledger, invoice logs, riwayat sesi)
 *            → `{ data, meta:{ next_cursor } }` (`next_cursor` null bila habis)
 *
 * `$transform` = kelas JsonResource (`FooResource::class`) atau closure (Collection $items): array. Bila null, item
 * dikembalikan apa adanya (toArray model).
 */
final class Paginate
{
    public const DEFAULT_PER_PAGE = 10;

    public const MAX_PER_PAGE = 50;

    public static function perPage(Request $request): int
    {
        $value = (int) $request->query('per_page', self::DEFAULT_PER_PAGE);

        return min(max($value, 1), self::MAX_PER_PAGE);
    }

    public static function page(Request $request): int
    {
        return max((int) $request->query('page', 1), 1);
    }

    /**
     * @param  Builder|QueryBuilder|Relation  $query
     * @return array{data: array<int, mixed>, meta: array<string, int>}
     */
    public static function offset(EloquentBuilderContract|QueryBuilder|Relation $query, Request $request, string|\Closure|null $transform = null): array
    {
        $perPage = self::perPage($request);
        $paginator = $query->paginate($perPage, ['*'], 'page', self::page($request));

        return [
            'data' => self::transform($paginator->getCollection(), $request, $transform),
            'meta' => [
                'total' => $paginator->total(),
                'page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'last_page' => $paginator->lastPage(),
            ],
        ];
    }

    /**
     * Keyset pada kolom unik monoton (default `id`). Terbaru dulu bila `$desc = true`.
     *
     * @param  Builder|QueryBuilder|Relation  $query
     * @return array{data: array<int, mixed>, meta: array{next_cursor: ?string}}
     */
    public static function keyset(EloquentBuilderContract|QueryBuilder|Relation $query, Request $request, string|\Closure|null $transform = null, string $column = 'id', bool $desc = true): array
    {
        $perPage = self::perPage($request);

        if (($cursor = $request->query('cursor')) !== null && $cursor !== '') {
            $query->where($column, $desc ? '<' : '>', self::decodeCursor((string) $cursor));
        }

        $items = $query->orderBy($column, $desc ? 'desc' : 'asc')->limit($perPage + 1)->get();

        $nextCursor = null;
        if ($items->count() > $perPage) {
            $items = $items->take($perPage);
            $nextCursor = self::encodeCursor(data_get($items->last(), $column));
        }

        return [
            'data' => self::transform($items, $request, $transform),
            'meta' => ['next_cursor' => $nextCursor],
        ];
    }

    public static function encodeCursor(mixed $value): string
    {
        return rtrim(strtr(base64_encode((string) $value), '+/', '-_'), '=');
    }

    public static function decodeCursor(string $cursor): string
    {
        $decoded = base64_decode(strtr($cursor, '-_', '+/'), true);

        if ($decoded === false || $decoded === '') {
            throw ApiException::validation(['cursor' => ['Cursor tidak valid.']]);
        }

        return $decoded;
    }

    /** @return array<int, mixed> */
    private static function transform(iterable $items, Request $request, string|\Closure|null $transform): array
    {
        $collection = collect($items);

        if ($transform instanceof \Closure) {
            return $transform($collection);
        }

        if (is_string($transform) && is_subclass_of($transform, JsonResource::class)) {
            return $transform::collection($collection)->resolve($request);
        }

        return $collection->values()->toArray();
    }
}
