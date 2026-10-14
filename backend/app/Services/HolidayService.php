<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\Holiday;
use App\Models\Schedule;
use App\Models\User;
use App\Support\BranchContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;

/**
 * Hari libur (M3, modul holidays). `branch_id` NULL = berlaku semua cabang. Tambah (termasuk rentang): CreateHolidaysAction.
 * Libur tidak mengubah sesi yang sudah ada sampai Sprint 2 (cancel `H`); respons memuat `affected_sessions` sebagai info.
 */
class HolidayService
{
    /**
     * Filter: `?year=`, `?from=&to=`, `?branch_id=` (cabang itu + libur semua cabang; staf ber-cabang selalu cabangnya).
     *
     * @return Collection<int, Holiday>
     */
    public function all(Request $request): Collection
    {
        $query = Holiday::query()->orderBy('holiday_date')->orderBy('id');

        $branchId = BranchContext::resolve($request);
        if ($branchId !== null) {
            $query->where(fn ($q) => $q->where('branch_id', $branchId)->orWhereNull('branch_id'));
        }

        if (ctype_digit((string) $request->query('year'))) {
            $query->whereYear('holiday_date', (int) $request->query('year'));
        }
        if ($request->query('from')) {
            $query->whereDate('holiday_date', '>=', $request->query('from'));
        }
        if ($request->query('to')) {
            $query->whereDate('holiday_date', '<=', $request->query('to'));
        }

        return $query->get();
    }

    public function find(int $id): Holiday
    {
        return Holiday::query()->findOrFail($id);
    }

    public function update(User $actor, int $id, array $data): Holiday
    {
        $holiday = Holiday::query()->findOrFail($id);
        $this->assertBranchAllowed($actor, $holiday->branch_id);

        $branchId = array_key_exists('branch_id', $data) ? $data['branch_id'] : $holiday->branch_id;
        $date = isset($data['holiday_date']) ? CarbonImmutable::parse($data['holiday_date'])->format('Y-m-d') : $holiday->holiday_date->format('Y-m-d');

        $this->assertBranchAllowed($actor, $branchId);

        if ($this->takenDates([$date], $branchId, ignoreId: $holiday->id) !== []) {
            throw $this->duplicate([$date]);
        }

        $holiday->fill(['branch_id' => $branchId, 'holiday_date' => $date] + array_intersect_key($data, ['name' => true]))->save();

        return $holiday;
    }

    public function delete(User $actor, int $id): void
    {
        $holiday = Holiday::query()->findOrFail($id);
        $this->assertBranchAllowed($actor, $holiday->branch_id);

        $holiday->delete();
    }

    /** Sesi terjadwal (`scheduled`/`reschedule_pending`) di tanggal libur, pada cabang yang terkena. */
    public function affectedSessions(Holiday $holiday): int
    {
        return Schedule::withoutGlobalScopes()
            ->whereDate('session_date', $holiday->holiday_date)
            ->whereIn('status', ['scheduled', 'reschedule_pending'])
            ->when($holiday->branch_id !== null, fn ($q) => $q->where('branch_id', $holiday->branch_id))
            ->count();
    }

    /** Staf ber-cabang tidak boleh mengatur libur cabang lain (libur semua cabang boleh). */
    public function assertBranchAllowed(User $actor, ?int $branchId): void
    {
        if ($actor->branch_id !== null && $branchId !== null && (int) $branchId !== (int) $actor->branch_id) {
            throw ApiException::forbidden('Anda hanya dapat mengatur hari libur cabang sendiri.');
        }
    }

    /**
     * Tanggal (dari $dates) yang sudah punya libur pada cabang yang sama (NULL = sesama "semua cabang").
     *
     * @param  list<string>  $dates
     * @return list<string>
     */
    public function takenDates(array $dates, ?int $branchId, ?int $ignoreId = null): array
    {
        $taken = Holiday::withoutGlobalScopes()
            ->whereIn('holiday_date', $dates)
            ->when($branchId === null, fn ($q) => $q->whereNull('branch_id'), fn ($q) => $q->where('branch_id', $branchId))
            ->when($ignoreId !== null, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->pluck('holiday_date')
            ->map(fn ($d) => CarbonImmutable::parse($d)->format('Y-m-d'))
            ->all();

        return array_values(array_intersect($dates, $taken));
    }

    /** @param  list<string>  $dates */
    public function duplicate(array $dates): ApiException
    {
        $list = implode(', ', array_slice($dates, 0, 5)).(count($dates) > 5 ? ', …' : '');

        return ApiException::validation(['holiday_date' => ["Hari libur sudah ada untuk cabang ini pada: {$list}."]], 'Hari libur duplikat.');
    }
}
