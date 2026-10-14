<?php

namespace App\Actions\Master;

use App\Exceptions\ApiException;
use App\Models\Holiday;
use App\Models\User;
use App\Services\HolidayService;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Tambah hari libur. Input `holiday_date` (satu hari) atau `start_date..end_date` (rentang) → 1 baris per tanggal
 * dalam satu transaksi. Duplikat (tanggal, cabang) → 422 sebelum ada yang tersimpan. `branch_id` NULL = semua cabang;
 * staf ber-cabang hanya boleh untuk cabangnya sendiri atau semua cabang.
 * Efek ke sesi (cancel `H`) dipasang di Sprint 2; di sini hanya dihitung (HolidayService::affectedSessions).
 */
class CreateHolidaysAction
{
    public function __construct(private readonly HolidayService $holidays) {}

    /** @return Collection<int, Holiday> */
    public function __invoke(User $actor, array $data): Collection
    {
        $branchId = $data['branch_id'] ?? null;
        $this->holidays->assertBranchAllowed($actor, $branchId);

        $dates = $this->dates($data);

        try {
            return DB::transaction(function () use ($dates, $branchId, $data): Collection {
                $taken = $this->holidays->takenDates($dates, $branchId);
                if ($taken !== []) {
                    throw $this->holidays->duplicate($taken);
                }

                return collect($dates)->map(fn (string $date) => Holiday::query()->create([
                    'branch_id' => $branchId,
                    'holiday_date' => $date,
                    'name' => $data['name'],
                ]));
            });
        } catch (UniqueConstraintViolationException) {
            throw $this->holidays->duplicate($dates);
        }
    }

    /** @return list<string> tanggal yyyy-MM-dd */
    private function dates(array $data): array
    {
        if (! empty($data['holiday_date'])) {
            return [CarbonImmutable::parse($data['holiday_date'])->format('Y-m-d')];
        }

        $end = CarbonImmutable::parse($data['end_date']);
        $dates = [];
        for ($d = CarbonImmutable::parse($data['start_date']); $d->lte($end); $d = $d->addDay()) {
            $dates[] = $d->format('Y-m-d');
        }

        return $dates;
    }
}
