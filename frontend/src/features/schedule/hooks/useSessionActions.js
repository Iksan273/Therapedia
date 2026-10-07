import { useClients } from "@/stores/clientsStore";
import { useCredits } from "@/stores/creditsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useTherapists } from "@/stores/therapistsStore";
import { useHolidays } from "@/stores/holidaysStore";
import { useAuth } from "@/stores/authStore";
import { advanceStatus } from "@/domain/client";
import { findLiveSessionEntry, leaveRemainingOf, resolveSessionPackage } from "@/domain/credit";
import { LEAVE_OFF_REASON } from "@/domain/leave";
import { nowIso, todayStr } from "@/shared/lib/id";
import {
  CLEAR_PENDING_PATCH,
  RESCHEDULE_DROPPED,
  buildReportPatch,
  canRevertSession,
  checkConflicts,
  getOriginSlot,
  planBulkReschedule,
  restoreSlotOf,
  restoreStatusOf,
  scheduleSlot,
  OTHER_REASON,
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
  const by = auth?.staffName || auth?.role || null; // pelaku mutasi kredit (credit_ledger.created_by)
  const { holidays } = useHolidays();

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
      spendPackageCredit({ clientId: client.id, packageId: pkg?.id, scheduleId: schedule.id, date: schedule.date, by });
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

  const applyCancelCredit = (schedule, cancelReason, deductCredit, kind = "cancel") => {
    const client = getClient(schedule.clientId);
    const creditRecord = client ? getRecordForClient(client.id) : null;
    const pkg = findPackage(creditRecord, schedule);
    // Pilihan potong: credit leave paket dipakai lebih dulu (kredit sesi utuh); bila habis baru 1 kredit sesi dipotong
    const wantsCut = Boolean(deductCredit) && Boolean(pkg) && kind !== "off";
    const usedLeave = wantsCut && leaveRemainingOf(pkg) > 0;
    const deducted = wantsCut && !usedLeave && pkg.remainingCredit > 0;
    const cancelCount = (pkg?.cancelCount || 0) + (kind === "off" ? 0 : 1);
    handleScheduleCancellation({
      clientId: schedule.clientId,
      packageId: pkg?.id,
      scheduleId: schedule.id,
      cancelReason,
      date: schedule.date,
      deductCredit,
      kind,
      by,
    });
    return { cancelCount, deducted, usedLeave, leaveLeft: pkg ? leaveRemainingOf(pkg) - (usedLeave ? 1 : 0) : 0 };
  };

  // Cancel / Off: admin memilih potong atau tidak. Potong = pakai credit leave paket (kredit sesi utuh); credit leave habis = potong 1 kredit sesi.
  const cancelSession = (schedule, { cancelReason, note, deductCredit }) => {
    requireDeductChoice(deductCredit);
    updateSchedule(schedule.id, { status: "cancelled", previousStatus: schedule.status, revertedAt: null, cancelReason, cancelNote: note?.trim() || null });
    const { cancelCount, deducted, usedLeave, leaveLeft } = applyCancelCredit(schedule, cancelReason, deductCredit);
    return { cancelCount, deducted, usedLeave, leaveLeft, penalized: deducted };
  };

  // Cancel dan Off adalah SATU mekanisme (revisi 7 Okt 2026): `cancelSession` dengan alasan dari daftar gabungan. Pembatalan
  // karena CUTI dari Finance memakai fungsi ini: status `cancelled`, alasan OL, `leaveId` = log cuti. Admin/Finance tetap
  // WAJIB memilih potong kredit atau tidak; pembatalan cuti TIDAK menambah kuota cancel paket (ledger `off_*`).
  const cancelForLeave = (schedule, { note, deductCredit, leaveId }) => {
    requireDeductChoice(deductCredit);
    updateSchedule(schedule.id, {
      status: "cancelled",
      previousStatus: schedule.status,
      revertedAt: null,
      cancelReason: LEAVE_OFF_REASON,
      cancelNote: note?.trim() || null,
      leaveId: leaveId || null,
    });
    const { deducted } = applyCancelCredit(schedule, LEAVE_OFF_REASON, deductCredit, "off");
    return { deducted };
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
    const { cancelCount, deducted, usedLeave, leaveLeft } = applyCancelCredit(schedule, RESCHEDULE_DROPPED, deductCredit);
    return { cancelCount, deducted, usedLeave, leaveLeft };
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
      creditChange: entry && !["cancel_excused", "off_excused"].includes(entry.action) ? 1 : 0,
      quotaChange: entry && ["cancel_excused", "cancel_penalty", "cancel_leave"].includes(entry.action) ? -1 : 0,
    };
  };

  // Terapkan revert satu sesi ke store
  // `releaseFromLeave` = sesi Off cuti dikembalikan oleh Finance (akhiri cuti lebih awal / void): koreksi cuti, bukan revert
  // sesi, sehingga `revertedAt` tetap kosong (tidak memakan jatah "revert 1x" sesi itu).
  const applyRevert = (schedule, note, { releaseFromLeave = false } = {}) => {
    const { kind, client, entry, clientRestore, toStatus, toSlot, creditChange, quotaChange } = previewRevert(schedule);

    // revertedAt: revert hanya 1x; diblokir sampai ada transisi baru pada sesi ini
    const patch = { status: toStatus, previousStatus: schedule.status, revertedAt: releaseFromLeave ? null : nowIso(), clientStatusFrom: null, clientStatusTo: null };
    // Kembali jadi jadwal aktif: bila sesi ini pembatalan cuti, hari cutinya otomatis berhenti dihitung (leaveId dilepas)
    if (kind === "cancellation") Object.assign(patch, { cancelReason: null, cancelNote: null, leaveId: null });
    if (kind === "pending") Object.assign(patch, CLEAR_PENDING_PATCH);
    if (kind === "reschedule") {
      Object.assign(patch, { date: toSlot.date, startTime: toSlot.startTime, endTime: toSlot.endTime, therapistId: toSlot.therapistId, rescheduledPrev: null });
      // Kembali ke jadwal asal pertama: jejak pemindahan dihapus (ghost chip ikut hilang). Kembali ke slot perantara
      // (sudah 2x reschedule): jadwal asal tetap tercatat.
      if (toStatus === "scheduled") Object.assign(patch, { rescheduledFrom: null, rescheduledAt: null });
    }
    if (toStatus === "reschedule_pending") Object.assign(patch, { pendingFrom: scheduleSlot(schedule), pendingAt: nowIso() });
    updateSchedule(schedule.id, patch);

    if (entry) revertSessionCredit({ clientId: schedule.clientId, scheduleId: schedule.id, date: todayStr(), reason: note, by });
    if (clientRestore) updateClient(client.id, { status: clientRestore.to });

    return { result: { kind, toStatus, toSlot, creditChange, quotaChange, clientStatusRestored: clientRestore?.to || null } };
  };

  const revertSession = (schedule, { reason }) => applyRevert(schedule, reason.trim()).result;

  // Kembalikan sesi cuti (cancelled, alasan OL) ke jadwal aktif (dipanggil useLeaveActions; slot sudah dicek `planEarlyReturn`).
  // Kredit: baris `reversal` bila Off tadi tercatat di ledger (penalty dibalik, excused netral).
  const releaseFromLeave = (list, { reason }) => {
    let creditChange = 0;
    list.forEach((s) => {
      if (s.status !== "cancelled") return;
      creditChange += applyRevert(s, reason, { releaseFromLeave: true }).result.creditChange;
    });
    return { released: list.length, creditChange };
  };

  // Hapus sesi (soft delete; tombol hanya untuk role `canDelete`). Sesi completed harus di-revert dulu agar kredit konsisten.
  const deleteSession = (schedule) => {
    if (schedule.status === "completed") return { deleted: false, reason: "completed" };
    deleteSchedules([schedule.id], auth?.staffName || auth?.role || null);
    return { deleted: true };
  };

  // Ganti jadwal rutin client: sesi lama (hasil `planRoutineChange`) dihapus lalu sesi baru dibuat dalam satu langkah.
  // Fase API: POST /clients/{id}/routine-replace (satu transaksi; cek bentrok ulang di server).
  const replaceRoutine = ({ removeIds = [], createList = [] }) => {
    if (removeIds.length > 0) deleteSchedules(removeIds);
    if (createList.length > 0) createSessions(createList);
    return { removed: removeIds.length, created: createList.length };
  };

  // Hapus jadwal rutin (sesi `scheduled` pada pola itu); tombol hanya untuk role `canDelete`.
  const deleteRoutineSessions = (ids) => {
    if (ids.length > 0) deleteSchedules(ids);
    return { removed: ids.length };
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
    const cancelReason = mode === "leave" ? "FM" : OTHER_REASON;
    list.forEach((s) => applyCancelCredit(s, cancelReason, deductCredit));
    updateSchedulesMany(ids, { status: "cancelled", cancelReason, cancelNote, revertedAt: null });
  };

  // Bulk reschedule ATOMIK: tiap baris punya tujuan sendiri ({ id, date, startTime, endTime, therapistId }).
  // Divalidasi ulang di sini; bila ada satu saja yang bermasalah (bentrok / libur / kosong) TIDAK ADA yang disimpan.
  // Fase API: POST /schedules/bulk-reschedule dalam 1 transaksi (semua atau tidak sama sekali, 422 + error per baris).
  const bulkReschedule = (rows) => {
    const plan = planBulkReschedule({ rows, schedules, therapists, holidays });
    if (!plan.ok) return { ok: false, issues: plan.issues };
    const at = nowIso();
    const itemsMap = {};
    const byId = new Map(schedules.map((s) => [s.id, s]));
    rows.forEach((r) => {
      const s = byId.get(r.id);
      itemsMap[r.id] = {
        date: r.date,
        startTime: r.startTime,
        endTime: r.endTime,
        therapistId: r.therapistId,
        status: "rescheduled",
        rescheduledFrom: getOriginSlot(s) || scheduleSlot(s),
        rescheduledPrev: scheduleSlot(s),
        rescheduledAt: at,
        revertedAt: null,
        ...CLEAR_PENDING_PATCH,
      };
    });
    rescheduleSchedulesBulk(itemsMap); // satu dispatch = satu pembaruan state
    return { ok: true, count: rows.length };
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
    replaceRoutine,
    deleteRoutineSessions,
    saveReport,
    completeSession,
    cancelSession,
    cancelForLeave,
    rescheduleSession,
    markPending,
    dropPending,
    deleteSession,
    previewRevert,
    revertSession,
    releaseFromLeave,
    bulkRevert,
    bulkComplete,
    bulkCancel,
    bulkReschedule,
  };
}
