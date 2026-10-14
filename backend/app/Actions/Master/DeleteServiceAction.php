<?php

namespace App\Actions\Master;

use App\Exceptions\ApiException;
use App\Models\ClientService;
use App\Models\Schedule;
use App\Models\Service;
use Illuminate\Support\Facades\DB;

/**
 * Hapus layanan intake. Masih dipakai client (`client_services`) atau jadwal (`schedules.service_code`) → 409 `in_use`
 * (FK RESTRICT sebagai jaring pengaman). Hitungan memakai query tanpa BranchScope agar mencakup semua cabang.
 */
class DeleteServiceAction
{
    public function __invoke(string $code): void
    {
        DB::transaction(function () use ($code): void {
            $service = Service::query()->lockForUpdate()->findOrFail($code);

            $clients = ClientService::query()->where('service_code', $code)->count();
            $schedules = Schedule::withoutGlobalScopes()->where('service_code', $code)->count();

            if ($clients + $schedules > 0) {
                throw ApiException::inUse("Layanan \"{$service->label}\" dipakai di {$clients} client dan {$schedules} jadwal. Nonaktifkan saja bila tidak dipakai lagi.");
            }

            $service->delete();
        });
    }
}
