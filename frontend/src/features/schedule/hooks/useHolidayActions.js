import { useHolidays } from "@/stores/holidaysStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useAuth } from "@/stores/authStore";
import { isApiMode } from "@/config/env";
import { HOLIDAY_CANCEL_REASON, holidayAffectedSessions } from "@/domain/holiday";

// Use-case hari libur. Dua implementasi dengan bentuk keluaran yang sama:
//   { previewAffected, previewAffectedMany, createHolidays, changeHoliday }
// `createHolidays` / `changeHoliday` mengembalikan `{ cancelled, affected }` (Promise di mode API, nilai langsung di demo).
//   cancelled = sesi yang dibatalkan otomatis, affected = sesi terjadwal di tanggal libur yang TIDAK dibatalkan otomatis.

// ---- Mode demo (2 store: libur + jadwal). Menetapkan libur membatalkan semua sesi aktif di tanggal itu (kecuali completed /
// cancelled / rescheduled): status `cancelled`, alasan H, catatan nama libur. TIDAK memotong kredit maupun credit leave dan tidak
// menambah kuota cancel (libur bukan kesalahan client), jadi tidak ada baris ledger. Toast tetap di komponen.
function useHolidayActionsLocal() {
  const { holidays, addHoliday, updateHoliday } = useHolidays();
  const { schedules, updateSchedulesMany } = useSchedules();
  const { auth } = useAuth();
  const by = auth?.staffName || auth?.role || null;

  // Pratinjau sesi yang akan dibatalkan (tanpa mengubah data)
  const previewAffected = (holiday) => holidayAffectedSessions(schedules, holiday);

  const cancelAffected = (holiday) => {
    const affected = previewAffected(holiday);
    if (affected.length === 0) return { cancelled: 0, affected: 0 };
    // `previousStatus` per sesi berbeda (scheduled / reschedule_pending) → satu patch per kelompok status
    [...new Set(affected.map((s) => s.status))].forEach((status) => {
      updateSchedulesMany(
        affected.filter((s) => s.status === status).map((s) => s.id),
        { status: "cancelled", previousStatus: status, revertedAt: null, cancelReason: HOLIDAY_CANCEL_REASON, cancelNote: `Hari libur: ${holiday.name}`, cancelledBy: by }
      );
    });
    return { cancelled: affected.length, affected: 0 };
  };

  const createHoliday = (holiday) => {
    addHoliday(holiday);
    return cancelAffected(holiday);
  };

  // Libur berentang: satu baris libur per tanggal; sesi aktif di semua tanggal itu dibatalkan (tanggal berbeda → tidak tumpang tindih).
  const previewAffectedMany = (list) => list.flatMap(previewAffected);
  const createHolidays = (list) => ({ cancelled: list.reduce((n, h) => n + createHoliday(h).cancelled, 0), affected: 0 });

  // Ubah tanggal/cabang libur: sesi di tanggal/cabang BARU ikut dibatalkan; sesi yang sudah dibatalkan oleh libur lama tidak dikembalikan.
  const changeHoliday = (id, patch) => {
    const current = holidays.find((h) => h.id === id);
    updateHoliday(id, patch);
    return cancelAffected({ ...current, ...patch });
  };

  return { previewAffected, previewAffectedMany, createHoliday, createHolidays, changeHoliday };
}

// ---- Mode API: libur disimpan server (satu baris per tanggal; rentang dikirim sekali). Pembatalan sesi oleh libur belum
// dipasang di server (Sprint 2), jadi tidak ada pratinjau/konfirmasi pembatalan dan `cancelled` selalu 0; server hanya
// menghitung `affectedSessions` (sesi terjadwal di tanggal itu) agar admin bisa membatalkannya manual di kalender.
function useHolidayActionsApi() {
  const { createHolidayRange, updateHoliday } = useHolidays();

  const createHolidays = async (list) => {
    // `list` = tanggal berurutan hasil expandHolidayRange dengan nama & cabang yang sama
    const first = list[0];
    const created = await createHolidayRange({ date: first.date, endDate: list[list.length - 1].date, name: first.name, branchId: first.branchId });
    return { cancelled: 0, affected: created.reduce((n, h) => n + (h.affectedSessions || 0), 0) };
  };

  const changeHoliday = async (id, patch) => {
    const updated = await updateHoliday(id, patch);
    return { cancelled: 0, affected: updated.affectedSessions || 0 };
  };

  return { previewAffected: () => [], previewAffectedMany: () => [], createHolidays, changeHoliday };
}

export const useHolidayActions = isApiMode() ? useHolidayActionsApi : useHolidayActionsLocal;
