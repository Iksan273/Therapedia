<?php

namespace App\Services;

use App\Exceptions\NotImplementedException;

/**
 * Penjadwalan (M6): sesi, seri berulang, aksi sesi, revert 1x, laporan sesi. Memakai ScheduleConflictService & CreditService.
 *
 * SKELETON setup: tanda tangan method saja; logika (transaksi, aturan bisnis) diisi per use-case.
 * Acuan aturan: schema.md §06 dan frontend/src/domain/*.
 */
class ScheduleService
{
    /** list ber-pagination (default 10, maks 50), pencarian prefix, BranchScope */
    public function paginate(array $filters = []): mixed
    {
        throw new NotImplementedException('ScheduleService::paginate');
    }

    public function find(string $id): mixed
    {
        throw new NotImplementedException('ScheduleService::find');
    }

    public function create(array $data): mixed
    {
        throw new NotImplementedException('ScheduleService::create');
    }

    /** kirim `version` bila entity ber-optimistic-lock */
    public function update(string $id, array $data): mixed
    {
        throw new NotImplementedException('ScheduleService::update');
    }

    public function delete(string $id): void
    {
        throw new NotImplementedException('ScheduleService::delete');
    }

    /** CompleteSessionAction */
    public function complete(string $id, array $data): mixed
    {
        throw new NotImplementedException('ScheduleService::complete');
    }

    /** CancelSessionAction (wajib `deduct_credit`) */
    public function cancel(string $id, array $data): mixed
    {
        throw new NotImplementedException('ScheduleService::cancel');
    }

    /** RescheduleSessionAction */
    public function reschedule(string $id, array $data): mixed
    {
        throw new NotImplementedException('ScheduleService::reschedule');
    }

    /** RevertSessionAction (hanya 1x) */
    public function revert(string $id, array $data): mixed
    {
        throw new NotImplementedException('ScheduleService::revert');
    }

    public function paginateReports(array $filters = []): mixed
    {
        throw new NotImplementedException('ScheduleService::paginateReports');
    }

    public function findReport(string $id): mixed
    {
        throw new NotImplementedException('ScheduleService::findReport');
    }

    /** SaveSessionReportAction */
    public function saveReport(array $data): mixed
    {
        throw new NotImplementedException('ScheduleService::saveReport');
    }

    public function updateReport(string $id, array $data): mixed
    {
        throw new NotImplementedException('ScheduleService::updateReport');
    }
}
