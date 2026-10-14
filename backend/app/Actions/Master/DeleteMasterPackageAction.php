<?php

namespace App\Actions\Master;

use App\Exceptions\ApiException;
use App\Models\ClientPackage;
use App\Models\Invoice;
use App\Models\MasterPackage;
use Illuminate\Support\Facades\DB;

/** Hapus master paket. Sudah dipakai invoice atau paket client → 409 `in_use` (nonaktifkan saja). */
class DeleteMasterPackageAction
{
    public function __invoke(int $id): void
    {
        DB::transaction(function () use ($id): void {
            $package = MasterPackage::query()->lockForUpdate()->findOrFail($id);

            $invoices = Invoice::withoutGlobalScopes()->where('master_package_id', $id)->count();
            $packages = ClientPackage::withoutGlobalScopes()->where('master_package_id', $id)->count();

            if ($invoices + $packages > 0) {
                throw ApiException::inUse("Paket \"{$package->name}\" dipakai di {$invoices} invoice dan {$packages} paket client. Nonaktifkan saja bila tidak dijual lagi.");
            }

            $package->delete();
        });
    }
}
