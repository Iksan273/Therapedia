<?php

namespace App\Services;

/**
 * Cek bentrok jadwal terapis dan hari libur (schema.md §6.4).
 *
 * SKELETON setup: belum ada logika. Tanggung jawab:
 * - `SELECT ... FOR UPDATE` sesi aktif terapis di tanggal itu (idx_sch_therapist), cek overlap jam; 409 `schedule_conflict` kecuali `force`.
 * - Tolak tanggal di `holidays` (cabang itu atau semua cabang) dan hari efektif cuti client (`client_on_leave`).
 * - Aturan acuan: frontend/src/domain/schedule.js.
 */
class ScheduleConflictService
{
    //
}
