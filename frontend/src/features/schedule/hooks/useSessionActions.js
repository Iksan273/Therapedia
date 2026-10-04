import { useClients } from "@/stores/clientsStore";
import { useCredits } from "@/stores/creditsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useTherapists } from "@/stores/therapistsStore";
import { useAuth } from "@/stores/authStore";
import { advanceStatus } from "@/domain/client";
import { CANCEL_QUOTA, findLiveSessionEntry, resolveSessionPackage } from "@/domain/credit";
import { nowIso, todayStr } from "@/shared/lib/id";
import {
  CLEAR_PENDING_PATCH,
  RESCHEDULE_DROPPED,
  buildReportPatch,
  canRevertSession,
  checkConflicts,
  getOriginSlot,
  restoreSlotOf,
  restoreStatusOf,
  scheduleSlot,
} from "@/domain/schedule";

// Use-case sesi terapi/asesmen. Satu-satunya tempat yang merangkai perubahan lintas store
// (jadwal → kredit → status client). Komponen hanya memanggil fungsi ini + menampilkan toast.
// Fase API: tiap fungsi diganti satu request ke endpoint transaksional (docs/guide/10):
//   completeSession → POST /schedules/{id}/complete, cancelSession → POST /schedules/{id}/cancel, dst.
// Jejak perubahan: kolom `updated_by` + ledger kredit (tanpa audit log). Perubahan status client otomatis oleh sesi
// asesmen disimpan di sesi (`clientStatusFrom`) agar revert bisa memulihkannya.
export function useSessionActions() {
  const { schedules, addSchedule, addSchedules, updateSchedule, updateSchedulesMany, rescheduleSchedulesBulk, deleteSchedules } = useSchedules();
  const { auth } = useAuth();
  const { getClient, updateClient } = useClients();
  const { getRecordForClient, spendPackageCredit, handleScheduleCancellation, revertSessionCredit } = useCredits();
  const { therapists } = useTherapists();

  // Paket sesi: yang dipilih saat menjadwalkan bila masih bersisa, selain itu paket aktif tertua (otomatis setelah renewal)
  const findPackage = (record_, schedule) => resolveSessionPackage(record_, schedule);

  // Efek kredit & pipeline saat satu sesi selesai (tanpa mengubah dokumen sesi).
  // `clientStatusFrom` = status client sebelum dimajukan otomatis (null bila tidak berubah).
  const applyCompletionEffects = (schedule) => {
    const client = getClient(schedule.clientId);
    const creditRecord = client ? getRecordForClient(client.id) : null;
    let creditSpent = false;
    let assessmentDone = false;
    let clientStatusFrom = null;

    if (schedule.type === "therapy" && creditRecord) {
      const pkg = findPackage(creditRecord, schedule);
      spendPackageCredit({ clientId: client.id, packageId: pkg?.id, scheduleId: schedule.id, date: schedule.date });
      creditSpent = true;
    }

    if (schedule.type === "assessment" && client) {
      const next = advanceStatus(client.status, "assessment_done");
      if (next !== client.status) {
        updateClient(client.id, { status: next });
        assessmentDone = true;
        clientStatusFrom = client.status;
      }
    }
    return { client, creditSpent, assessmentDone, clientStatusFrom, clientStatusTo: assessmentDone ? advanceStatus(client.status, "assessment_done") : null };
  };

  // Buat satu atau beberapa sesi (milik satu client). Sesi asesmen otomatis memajukan client ke
  // "assessment_scheduled" (maju saja; boleh melompat dari inquiry / service_selected).
  const createSessions = (list) => {
    if (list.length === 0) return { assessmentScheduled: false };
    const first = list[0];
    if (list.length === 1) addSchedule(first);
    else addSchedules(list);

    let assessmentScheduled = false;
    const client = getClient(first.clientId);
    if (client && list.some((s) => s.type === "assessment")) {
      const next = advanceStatus(client.status, "assessment_scheduled");
      if (next !== client.status) {
        updateClient(client.id, { status: next });
        assessmentScheduled = true;
      }
    }
    return { assessmentScheduled };
  };

  const saveReport = (schedule, report) => {
    updateSchedule(schedule.id, buildReportPatch(report));
  };

  // Sesi selesai: simpan laporan, potong 1 kredit (therapy), majukan pipeline (assessment)
  const completeSession = (schedule, report) => {
    const result = applyCompletionEffects(schedule);
    updateSchedule(schedule.id, {
      status: "completed",
      previousStatus: schedule.status,
      revertedAt: null,
      clientStatusFrom: result.clientStatusFrom,
      clientStatusTo: result.clientStatusTo,
      ...buildReportPatch(report),
    });
    return result;
  };

  // Kuota cancel PER PAKET (hanya penghitung). Admin WAJIB memilih potong kredit atau tidak (`deductCredit` boolean).
  // Dipakai cancel biasa dan pembatalan sesi yang menggantung (drop pending).
  const requireDeductChoice = (deductCredit) => {
    if (typeof deductCredit !== "boolean") throw new Error("Keputusan potong kredit wajib dipilih (deductCredit true/false).");
  };

  const applyCancelCredit = (schedule, cancelReason, deductCredit) => {
    const client = getClient(schedule.clientId);
    const creditRecord = client ? getRecordForClient(client.id) : null;
    const pkg = findPackage(creditRecord, schedule);
    const deducted = deductCredit && Boolean(pkg) && pkg.remainingCredit > 0;
    const cancelCount = (pkg?.cancelCount || 0) + 1;
    handleScheduleCancellation({
      clientId: schedule.clientId,
      packageId: pkg?.id,
      scheduleId: schedule.id,
      cancelReason,
      date: schedule.date,
      deductCredit,
    });
    return { cancelCount, deducted, quotaExceeded: cancelCount > CANCEL_QUOTA };
  };

  // Cancel: admin memilih potong kredit atau tidak. Kuota 3 per paket hanya penghitung (UI memberi peringatan bila lewat).
  const cancelSession = (schedule, { cancelReason, note, deductCredit }) => {
    requireDeductChoice(deductCredit);
    updateSchedule(schedule.id, { status: "cancelled", previousStatus: schedule.status, revertedAt: null, cancelReason, cancelNote: note?.trim() || null });
    const { cancelCount, deducted, quotaExceeded } = applyCancelCredit(schedule, cancelReason, deductCredit);
    return { cancelCount, deducted, penalized: deducted, quotaExceeded };
  };

  // Pindah ke slot baru. Validasi bentrok dilakukan pemanggil (checkConflicts) sebelum memanggil ini.
  const rescheduleSession = (schedule, { date, startTime, endTime, therapistId }) => {
    updateSchedule(schedule.id, {
      date,
      startTime,
      endTime,
      therapistId,
      status: "rescheduled",
      rescheduledFrom: getOriginSlot(schedule) || scheduleSlot(schedule),
      rescheduledPrev: scheduleSlot(schedule), // slot tepat sebelum pemindahan ini (target revert)
      rescheduledAt: nowIso(),
      revertedAt: null,
      ...CLEAR_PENDING_PATCH,
    });
  };

  // Reschedule menggantung: slot pengganti belum ada. Kredit & kuota cancel tidak berubah.
  const markPending = (schedule, { reason, note }) => {
    updateSchedule(schedule.id, {
      status: "reschedule_pending",
      previousStatus: schedule.status,
      revertedAt: null,
      pendingFrom: scheduleSlot(schedule),
      pendingAt: nowIso(),
      pendingReason: reason,
      pendingNote: note?.trim() || null,
    });
  };

  // Batalkan sesi yang menggantung. Sama dengan cancel: admin memilih potong kredit atau tidak (alasan sistem tetap dicatat).
  const dropPending = (schedule, { note, deductCredit }) => {
    requireDeductChoice(deductCredit);
    updateSchedule(schedule.id, {
      status: "cancelled",
      previousStatus: schedule.status,
      revertedAt: null,
      cancelReason: RESCHEDULE_DROPPED,
      cancelNote: note?.trim() || null,
      ...CLEAR_PENDING_PATCH,
    });
    const { cancelCount, deducted, quotaExceeded } = applyCancelCredit(schedule, RESCHEDULE_DROPPED, deductCredit);
    return { cancelCount, deducted, quotaExceeded };
  };

  // ---- Revert: batalkan completed / cancel (salah klik) ----
  // Efek revert yang akan terjadi (dipakai pratinjau di UI dan oleh revertSession itu sendiri)
  const previewRevert = (schedule) => {
    const kind = { completed: "completion", cancelled: "cancellation", rescheduled: "reschedule", reschedule_pending: "pending" }[schedule.status];
    const client = getClient(schedule.clientId);
    const creditRecord = client ? getRecordForClient(client.id) : null;
    // Reschedule dan tandai pending tidak punya efek kredit (netral), jadi tidak ada mutasi ledger yang dibalik
    const entry = kind === "reschedule" || kind === "pending" ? null : findLiveSessionEntry(creditRecord, schedule.id);

    // Transisi status client yang terjadi otomatis di aksi asal (asesmen completed → assessment_done), disimpan di sesi.
    // Hanya dipulihkan bila status client masih hasil transisi itu (belum diubah manual sesudahnya).
    const clientRestore =
      kind === "completion" && schedule.type === "assessment" && client && schedule.clientStatusFrom && client.status === schedule.clientStatusTo
        ? { to: schedule.clientStatusFrom }
        : null;
    return {
      kind,
      client,
      entry,
      clientRestore,
      toStatus: restoreStatusOf(schedule),
      toSlot: restoreSlotOf(schedule),
      creditChange: entry && entry.action !== "cancel_excused" ? 1 : 0,
      quotaChange: entry && entry.action !== "used" ? -1 : 0,
    };
  };

  // Terapkan revert satu sesi ke store
  const applyRevert = (schedule, note) => {
    const { kind, client, entry, clientRestore, toStatus, toSlot, creditChange, quotaChange } = previewRevert(schedule);

    // revertedAt: revert hanya 1x; diblokir sampai ada transisi baru pada sesi ini
    const patch = { status: toStatus, previousStatus: schedule.status, revertedAt: nowIso(), clientStatusFrom: null, clientStatusTo: null };
    if (kind === "cancellation") Object.assign(patch, { cancelReason: null, cancelNote: null });
    if (kind === "pending") Object.assign(patch, CLEAR_PENDING_PATCH);
    if (kind === "reschedule") {
      Object.assign(patch, { date: toSlot.date, startTime: toSlot.startTime, endTime: toSlot.endTime, therapistId: toSlot.therapistId, rescheduledPrev: null });
      // Kembali ke jadwal asal pertama: jejak pemindahan dihapus (ghost chip ikut hilang). Kembali ke slot perantara
      // (sudah 2x reschedule): jadwal asal tetap tercatat.
      if (toStatus === "scheduled") Object.assign(patch, { rescheduledFrom: null, rescheduledAt: null });
    }
    if (toStatus === "reschedule_pending") Object.assign(patch, { pendingFrom: scheduleSlot(schedule), pendingAt: nowIso() });
    updateSchedule(schedule.id, patch);

    if (entry) revertSessionCredit({ clientId: schedule.clientId, scheduleId: schedule.id, date: todayStr(), reason: note });
    if (clientRestore) updateClient(client.id, { status: clientRestore.to });

    return { result: { kind, toStatus, toSlot, creditChange, quotaChange, clientStatusRestored: clientRestore?.to || null } };
  };

  const revertSession = (schedule, { reason }) => applyRevert(schedule, reason.trim()).result;

  // Hapus sesi (soft delete; tombol hanya untuk role `canDelete`). Sesi completed harus di-revert dulu agar kredit konsisten.
  const deleteSession = (schedule) => {
    if (schedule.status === "completed") return { deleted: false, reason: "completed" };
    deleteSchedules([schedule.id], auth?.staffName || auth?.role || null);
    return { deleted: true };
  };

  const pick = (ids) => schedules.filter((s) => ids.includes(s.id));

  // Bulk complete: aturan sama dengan complete tunggal (kredit idempoten per sesi)
  const bulkComplete = (ids) => {
    const list = pick(ids);
    updateSchedulesMany(ids, { status: "completed", revertedAt: null });
    list.forEach((s) => {
      const { clientStatusFrom, clientStatusTo } = applyCompletionEffects(s);
      if (clientStatusFrom) updateSchedule(s.id, { clientStatusFrom, clientStatusTo });
    });
  };

  // Bulk cancel. `mode` hanya menentukan alasan ("leave" = izin keluarga, "other" = lainnya). Admin WAJIB memilih potong
  // kredit atau tidak (`deductCredit`); berlaku untuk seluruh sesi dalam batch, dengan aturan yang sama seperti cancel tunggal.
  const bulkCancel = (ids, { mode, note, deductCredit }) => {
    requireDeductChoice(deductCredit);
    const list = pick(ids);
    const cancelNote = note ? `Bulk Cancel: ${note}` : "Bulk Cancelled";
    const cancelReason = mode === "leave" ? "izin_keluarga" : "lainnya";
    list.forEach((s) => applyCancelCredit(s, cancelReason, deductCredit));
    updateSchedulesMany(ids, { status: "cancelled", cancelReason, cancelNote, revertedAt: null });
  };

  // Bulk reschedule: geser N hari / ke tanggal tertentu, opsional ganti terapis
  const bulkReschedule = (itemsMap) => {
    rescheduleSchedulesBulk(itemsMap);
  };

  // Bulk revert (completed / cancelled / rescheduled). Sesi yang tidak bisa di-revert dilewati; sesi yang slot-nya
  // sudah terisi (termasuk oleh sesi lain dalam batch yang sama) dilewati dan dilaporkan.
  const bulkRevert = (ids, { reason }) => {
    const note = reason.trim();
    const working = schedules.map((s) => ({ ...s }));
    const reverted = [];
    const skipped = [];
    let creditChange = 0;
    let quotaChange = 0;

    pick(ids).forEach((s) => {
      if (!canRevertSession(s)) {
        skipped.push({ schedule: s, cause: "status" });
        return;
      }
      const { toStatus, toSlot } = previewRevert(s);
      if (["scheduled", "rescheduled"].includes(toStatus)) {
        const clash = checkConflicts({ therapistId: toSlot.therapistId, date: toSlot.date, startTime: toSlot.startTime, endTime: toSlot.endTime, schedules: working, therapists, excludeId: s.id });
        if (clash.length > 0) {
          skipped.push({ schedule: s, cause: "conflict" });
          return;
        }
        const idx = working.findIndex((w) => w.id === s.id);
        working[idx] = { ...working[idx], ...toSlot, status: toStatus };
      }
      reverted.push({ schedule: s, ...applyRevert(s, note) });
    });

    reverted.forEach((r) => {
      creditChange += r.result.creditChange;
      quotaChange += r.result.quotaChange;
    });
    return { reverted: reverted.length, skipped, creditChange, quotaChange };
  };

  return {
    createSessions,
    saveReport,
    completeSession,
    cancelSession,
    rescheduleSession,
    markPending,
    dropPending,
    deleteSession,
    previewRevert,
    revertSession,
    bulkRevert,
    bulkComplete,
    bulkCancel,
    bulkReschedule,
  };
}
