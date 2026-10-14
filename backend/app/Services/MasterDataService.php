<?php

namespace App\Services;

use App\Models\CancelReason;
use App\Models\SensoryQuadrant;
use App\Models\Service;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * Master data berkunci `code` (M3): services, sensory_quadrants, cancel_reasons, discharge_reasons.
 * `$model` = kelas model. Hapus yang punya pemakai memakai Action sendiri (DeleteServiceAction, DeleteQuadrantAction);
 * alasan Cancel/Off dan Discharge tersimpan sebagai string di transaksi, jadi boleh dihapus bebas.
 * Master paket dan hari libur: MasterPackageService, HolidayService.
 */
class MasterDataService
{
    /**
     * Daftar kecil tanpa paginasi (dropdown), urut `sort_order`. Filter: `?active=1`, `?therapist_off=0|1` (cancel_reasons).
     *
     * @param  class-string<Model>  $model
     * @return Collection<int, Model>
     */
    public function all(string $model, Request $request): Collection
    {
        $query = $this->withUsage($model::query())->orderBy('sort_order')->orderBy('code');

        if (filter_var($request->query('active'), FILTER_VALIDATE_BOOLEAN)) {
            $query->where('is_active', true);
        }

        if ($model === CancelReason::class && in_array($request->query('therapist_off'), ['0', '1', 0, 1], true)) {
            $query->where('is_therapist_off', (bool) $request->query('therapist_off'));
        }

        return $query->get();
    }

    /** @param  class-string<Model>  $model */
    public function find(string $model, string $code): Model
    {
        return $this->withUsage($model::query())->findOrFail($code);
    }

    /**
     * Jumlah pemakaian asli dari database (semua cabang, tanpa BranchScope) untuk halaman Master Data: layanan
     * (`client_count`, `schedule_count`) dan kuadran (`question_count`, `score_count`). Master lain tidak punya hitungan.
     *
     * @param  Builder<Model>  $query
     * @return Builder<Model>
     */
    private function withUsage(Builder $query): Builder
    {
        $unscoped = fn ($q) => $q->withoutGlobalScopes();

        return match ($query->getModel()::class) {
            Service::class => $query->withCount([
                'clientServicesViaServiceCode as client_count' => $unscoped,
                'schedulesViaServiceCode as schedule_count' => $unscoped,
            ]),
            SensoryQuadrant::class => $query->withCount([
                'assessmentQuestionsViaQuadrantCode as question_count' => $unscoped,
                'assessmentQuadrantScoresViaQuadrantCode as score_count' => $unscoped,
            ]),
            default => $query,
        };
    }

    /** @param  class-string<Model>  $model */
    public function create(string $model, array $data): Model
    {
        $data['sort_order'] ??= ((int) $model::query()->max('sort_order')) + 1;

        // refresh(): ambil nilai bawaan database (mis. `is_active`, `color`) yang tidak ada di input, agar respons lengkap
        return $model::query()->create($this->clean($data))->refresh();
    }

    /** @param  class-string<Model>  $model */
    public function update(string $model, string $code, array $data): Model
    {
        $entry = $model::query()->findOrFail($code);
        unset($data['code']);
        $entry->fill($this->clean($data))->save();

        return $entry;
    }

    /** @param  class-string<Model>  $model */
    public function delete(string $model, string $code): void
    {
        $model::query()->findOrFail($code)->delete();
    }

    /** @return array<string, mixed> */
    private function clean(array $data): array
    {
        foreach (['description', 'category'] as $field) {
            if (array_key_exists($field, $data) && is_string($data[$field])) {
                $data[$field] = trim($data[$field]) === '' && $field === 'description' ? null : trim($data[$field]);
            }
        }

        return $data;
    }
}
