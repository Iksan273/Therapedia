import { useHolidays } from "@/stores/holidaysStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useAuth } from "@/stores/authStore";
import { HOLIDAY_CANCEL_REASON, holidayAffectedSessions } from "@/domain/holiday";

// Use-case hari libur (2 store: libur + jadwal). Menetapkan libur membatalkan semua sesi aktif di tanggal itu (kecuali completed /
// cancelled / rescheduled): status `cancelled`, alasan H, catatan nama libur. TIDAK memotong kredit maupun credit leave dan tidak
// menambah kuota cancel (libur bukan kesalahan client), jadi tidak ada baris ledger. Toast tetap di komponen.
// Fase API: satu transaksi di POST /holidays (dan PATCH bila tanggal/cabang berubah).
export function useHolidayActions() {
  const { holidays, addHoliday, updateHoliday } = useHolidays();
  const { schedules, updateSchedulesMany } = useSchedules();
  const { auth } = useAuth();
  const by = auth?.staffName || auth?.role || null;

  // Pratinjau sesi yang akan dibatalkan (tanpa mengubah data)
  const previewAffected = (holiday) => holidayAffectedSessions(schedules, holiday);

  const cancelAffected = (holiday) => {
    const affected = previewAffected(holiday);
    if (affected.length === 0) return { cancelled: 0 };
    // `previousStatus` per sesi berbeda (scheduled / reschedule_pending) → satu patch per kelompok status
    [...new Set(affected.map((s) => s.status))].forEach((status) => {
      updateSchedulesMany(
        affected.filter((s) => s.status === status).map((s) => s.id),
        { status: "cancelled", previousStatus: status, revertedAt: null, cancelReason: HOLIDAY_CANCEL_REASON, cancelNote: `Hari libur: ${holiday.name}`, cancelledBy: by }
      );
    });
    return { cancelled: affected.length };
  };

  const createHoliday = (holiday) => {
    addHoliday(holiday);
    return cancelAffected(holiday);
  };

  // Libur berentang: satu baris libur per tanggal; sesi aktif di semua tanggal itu dibatalkan (tanggal berbeda → tidak tumpang tindih).
  const previewAffectedMany = (list) => list.flatMap(previewAffected);
  const createHolidays = (list) => ({ cancelled: list.reduce((n, h) => n + createHoliday(h).cancelled, 0) });

  // Ubah tanggal/cabang libur: sesi di tanggal/cabang BARU ikut dibatalkan; sesi yang sudah dibatalkan oleh libur lama tidak dikembalikan.
  const changeHoliday = (id, patch) => {
    const current = holidays.find((h) => h.id === id);
    updateHoliday(id, patch);
    return cancelAffected({ ...current, ...patch });
  };

  return { previewAffected, previewAffectedMany, createHoliday, createHolidays, changeHoliday };
}
