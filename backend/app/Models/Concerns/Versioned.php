<?php

namespace App\Models\Concerns;

use App\Exceptions\ApiException;
use Illuminate\Database\Eloquent\Model;

/**
 * Optimistic lock (implementation_detail.md §1.1): request mengirim `version`; tidak cocok → 409 `version_conflict`.
 * Dipakai entity ber-kolom `version`: clients, schedules, invoices, client_packages, session_reports,
 * assessment_categories, client_leaves.
 *
 * Pola di Action (di dalam DB::transaction, setelah lockForUpdate pada baris induk):
 *     $schedule = Schedule::lockForUpdate()->findOrFail($id);
 *     $schedule->assertVersion($request->input('version'));
 *     $schedule->fill([...])->save();   // `version` naik +1 otomatis, SEKALI per save
 * Satu use-case sebaiknya memanggil save() sekali per entity agar `version` hanya naik 1.
 */
trait Versioned
{
    public static function bootVersioned(): void
    {
        static::updating(function (Model $model): void {
            // Naik hanya bila ada perubahan nyata dan `version` tidak diatur manual.
            if ($model->isDirty() && ! $model->isDirty('version')) {
                $model->setAttribute('version', (int) $model->getOriginal('version') + 1);
            }
        });
    }

    /**
     * @throws ApiException 422 bila `version` tidak dikirim, 409 `version_conflict` bila tidak cocok
     */
    public function assertVersion(mixed $expected): void
    {
        if ($expected === null || $expected === '' || ! is_numeric($expected)) {
            throw ApiException::validation(['version' => ['Versi data wajib dikirim.']]);
        }

        if ((int) $expected !== (int) $this->getAttribute('version')) {
            throw ApiException::versionConflict();
        }
    }
}
