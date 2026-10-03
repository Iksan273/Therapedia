import { format } from "date-fns";
import { useClients } from "@/stores/clientsStore";
import { useCredits } from "@/stores/creditsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useTherapists } from "@/stores/therapistsStore";
import { useMasterData } from "@/stores/masterDataStore";
import { useAudit } from "@/stores/auditStore";
import { useAuth } from "@/stores/authStore";
import { useAuditLogger } from "@/features/audit";
import { advanceStatus } from "@/domain/client";
import { CANCEL_QUOTA, findLiveSessionEntry } from "@/domain/credit";
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
// (jadwal → kredit → status client → audit log). Komponen hanya memanggil fungsi ini + menampilkan toast.
// Fase API: tiap fungsi diganti satu request ke endpoint transaksional (docs/guide/10):
//   completeSession → POST /schedules/{id}/complete, cancelSession → POST /schedules/{id}/cancel, dst.
// Audit log ditulis backend di transaksi yang sama; useAuditLogger hanya untuk mode demo.
export function useSessionActions() {
  const { schedules, addSchedule, addSchedules, updateSchedule, updateSchedulesMany, rescheduleSchedulesBulk, deleteSchedules } = useSchedules();
  const { auth } = useAuth();
  const { getClient, updateClient } = useClients();
  const { getRecordForClient, spendPackageCredit, handleScheduleCancellation, revertSessionCredit } = useCredits();
  const { record } = useAuditLogger();
  const { auditLogs } = useAudit();
  const { therapists } = useTherapists();
  const { getCancelReasonLabel } = useMasterData();

  // Field audit standar untuk satu sesi (objek = sesi, induk = client)
  const auditFields = (schedule) => {
    const client = getClient(schedule.clientId);
    const name = client?.clientName || schedule.clientId;
    return {
      branchId: schedule.branchId || client?.branchId || null,
      entityType: "schedule",
      entityId: schedule.id,
      entityLabel: `Sesi ${name} • ${format(new Date(`${schedule.date}T00:00:00`), "dd/MM")} ${schedule.startTime}`,
      subjectType: "client",
      subjectId: schedule.clientId,
      subjectLabel: name,
    };
  };
  const creditFields = (schedule, suffix) => ({
    ...auditFields(schedule),
    entityType: "credit_ledger",
    entityId: `led-${suffix}-${schedule.id}`,
    entityLabel: `Kredit ${getClient(schedule.clientId)?.clientName || schedule.clientId}`,
  });

  const findPackage = (record_, schedule) =>
    record_?.packages.find((p) => p.id === schedule.creditPackageId || p.packageId === schedule.creditPackageId) || record_?.packages[0];

  // Efek kredit & pipeline saat satu sesi selesai (tanpa mengubah dokumen sesi). Mengembalikan entri audit.
  const applyCompletionEffects = (schedule) => {
    const client = getClient(schedule.clientId);
    const creditRecord = client ? getRecordForClient(client.id) : null;
    const audits = [];
    let creditSpent = false;
    let assessmentDone = false;

    if (schedule.type === "therapy" && creditRecord) {
      const pkg = findPackage(creditRecord, schedule);
      spendPackageCredit({ clientId: client.id, packageId: schedule.creditPackageId || pkg?.id, scheduleId: schedule.id, date: schedule.date });
      creditSpent = true;
      audits.push({ ...creditFields(schedule, "u"), action: "credit.used", meta: { creditChange: -1, scheduleId: schedule.id } });
    }

    if (schedule.type === "assessment" && client) {
      const next = advanceStatus(client.status, "assessment_done");
      if (next !== client.status) {
        updateClient(client.id, { status: next });
        assessmentDone = true;
        audits.push({
          ...auditFields(schedule),
          action: "client.status_changed",
          entityType: "client",
          entityId: client.id,
          entityLabel: client.clientName,
          oldValues: { status: client.status },
          newValues: { status: next },
        });
      }
    }
    return { client, creditSpent, assessmentDone, audits };
  };

  // Buat satu atau beberapa sesi (milik satu client). Sesi asesmen otomatis memajukan client ke
  // "assessment_scheduled" (maju saja; boleh melompat dari inquiry / service_selected).
  const createSessions = (list) => {
    if (list.length === 0) return { assessmentScheduled: false };
    const first = list[0];
    if (list.length === 1) addSchedule(first);
    else addSchedules(list);

    const audits = [
      {
        ...auditFields(first),
        action: list.length > 1 ? "schedule.series_created" : "schedule.created",
        newValues: { type: first.type, count: list.length },
        meta: { type: first.type, count: list.length },
      },
    ];

    let assessmentScheduled = false;
    const client = getClient(first.clientId);
    if (client && list.some((s) => s.type === "assessment")) {
      const next = advanceStatus(client.status, "assessment_scheduled");
      if (next !== client.status) {
        updateClient(client.id, { status: next });
        assessmentScheduled = true;
        audits.push({
          ...auditFields(first),
          action: "client.status_changed",
          entityType: "client",
          entityId: client.id,
          entityLabel: client.clientName,
          oldValues: { status: client.status },
          newValues: { status: next },
          meta: { trigger: "assessment_scheduled" },
        });
      }
    }
    record(audits);
    return { assessmentScheduled };
  };

  const completedAudit = (schedule, creditSpent) => ({
    ...auditFields(schedule),
    action: "schedule.completed",
    oldValues: { status: schedule.status },
    newValues: { status: "completed" },
    meta: { type: schedule.type, ...(creditSpent ? { creditChange: -1 } : {}) },
  });

  const saveReport = (schedule, report) => {
    updateSchedule(schedule.id, buildReportPatch(report));
    record({ ...auditFields(schedule), action: "schedule.report_saved", newValues: { activitySection: report.activitySection ? "terisi" : "kosong", noteSection: report.noteSection ? "terisi" : "kosong", homeworkSection: report.homeworkSection ? "terisi" : "kosong" } });
  };

  // Sesi selesai: simpan laporan, potong 1 kredit (therapy), majukan pipeline (assessment)
  const completeSession = (schedule, report) => {
    updateSchedule(schedule.id, { status: "completed", previousStatus: schedule.status, revertedAt: null, ...buildReportPatch(report) });
    const result = applyCompletionEffects(schedule);
    record([completedAudit(schedule, result.creditSpent), ...result.audits]);
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
      packageId: schedule.creditPackageId || pkg?.id,
      scheduleId: schedule.id,
      cancelReason,
      date: schedule.date,
      deductCredit,
    });
    const creditAudit = creditRecord && {
      ...creditFields(schedule, "c"),
      action: deducted ? "credit.cancel_penalty" : "credit.cancel_excused",
      meta: { creditChange: deducted ? -1 : 0, cancelCount, quota: CANCEL_QUOTA, deductCredit: deducted },
    };
    return { cancelCount, deducted, quotaExceeded: cancelCount > CANCEL_QUOTA, creditAudit };
  };

  // Cancel: admin memilih potong kredit atau tidak. Kuota 3 per paket hanya penghitung (UI memberi peringatan bila lewat).
  const cancelSession = (schedule, { cancelReason, note, deductCredit }) => {
    requireDeductChoice(deductCredit);
    updateSchedule(schedule.id, { status: "cancelled", previousStatus: schedule.status, revertedAt: null, cancelReason, notes: note?.trim() || null });
    const { cancelCount, deducted, quotaExceeded, creditAudit } = applyCancelCredit(schedule, cancelReason, deductCredit);
    record([
      {
        ...auditFields(schedule),
        action: "schedule.cancelled",
        oldValues: { status: schedule.status },
        newValues: { status: "cancelled", cancelReason },
        reason: [getCancelReasonLabel(cancelReason), note?.trim()].filter(Boolean).join(" — "),
        meta: { cancelCount, deductCredit: deducted, quotaExceeded },
      },
      creditAudit,
    ].filter(Boolean));
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
    record({
      ...auditFields(schedule),
      action: "schedule.rescheduled",
      oldValues: { date: schedule.date, startTime: schedule.startTime, therapist: schedule.therapistId },
      newValues: { date, startTime, therapist: therapistId },
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
    record({
      ...auditFields(schedule),
      action: "schedule.marked_pending",
      oldValues: { status: schedule.status },
      newValues: { status: "reschedule_pending" },
      reason: [getCancelReasonLabel(reason), note?.trim()].filter(Boolean).join(" — "),
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
      notes: note?.trim() || null,
      ...CLEAR_PENDING_PATCH,
    });
    const { cancelCount, deducted, quotaExceeded, creditAudit } = applyCancelCredit(schedule, RESCHEDULE_DROPPED, deductCredit);
    record([
      {
        ...auditFields(schedule),
        action: "schedule.pending_dropped",
        oldValues: { status: schedule.status },
        newValues: { status: "cancelled", cancelReason: RESCHEDULE_DROPPED },
        reason: note?.trim() || getCancelReasonLabel(RESCHEDULE_DROPPED),
        meta: { cancelCount, deductCredit: deducted, quotaExceeded },
      },
      creditAudit,
    ].filter(Boolean));
    return { cancelCount, deducted, quotaExceeded };
  };

  // ---- Revert: batalkan completed / cancel (salah klik) ----
  // Log asal terbaru untuk sesi ini yang belum pernah dibatalkan (auditLogs terurut terbaru dulu)
  const findOriginAudit = (schedule, actions) => {
    const reverted = new Set(auditLogs.filter((e) => e.revertsAuditId).map((e) => e.revertsAuditId));
    return auditLogs.find((e) => e.entityType === "schedule" && e.entityId === schedule.id && actions.includes(e.action) && !reverted.has(e.id)) || null;
  };

  // Efek revert yang akan terjadi (dipakai pratinjau di UI dan oleh revertSession itu sendiri)
  const previewRevert = (schedule) => {
    const kind = { completed: "completion", cancelled: "cancellation", rescheduled: "reschedule", reschedule_pending: "pending" }[schedule.status];
    const client = getClient(schedule.clientId);
    const creditRecord = client ? getRecordForClient(client.id) : null;
    // Reschedule dan tandai pending tidak punya efek kredit (netral), jadi tidak ada mutasi ledger yang dibalik
    const entry = kind === "reschedule" || kind === "pending" ? null : findLiveSessionEntry(creditRecord, schedule.id);
    const originActions = {
      completion: ["schedule.completed"],
      cancellation: ["schedule.cancelled", "schedule.pending_dropped"],
      reschedule: ["schedule.rescheduled"],
      pending: ["schedule.marked_pending"],
    }[kind];
    const origin = findOriginAudit(schedule, originActions);

    // Transisi status client yang terjadi otomatis di aksi asal (asesmen completed → assessment_done)
    let clientRestore = null;
    if (kind === "completion" && schedule.type === "assessment" && client && origin?.batchId) {
      const change = auditLogs.find((e) => e.batchId === origin.batchId && e.action === "client.status_changed" && e.entityId === client.id);
      if (change && client.status === change.newValues?.status && change.oldValues?.status) clientRestore = { audit: change, to: change.oldValues.status };
    }
    return {
      kind,
      client,
      entry,
      origin,
      clientRestore,
      toStatus: restoreStatusOf(schedule),
      toSlot: restoreSlotOf(schedule),
      creditChange: entry && entry.action !== "cancel_excused" ? 1 : 0,
      quotaChange: entry && entry.action !== "used" ? -1 : 0,
    };
  };

  // Terapkan revert satu sesi ke store dan kembalikan entri audit-nya (dicatat pemanggil: satu aksi atau satu batch bulk)
  const applyRevert = (schedule, note) => {
    const { kind, client, entry, origin, clientRestore, toStatus, toSlot, creditChange, quotaChange } = previewRevert(schedule);

    // revertedAt: revert hanya 1x; diblokir sampai ada transisi baru pada sesi ini
    const patch = { status: toStatus, previousStatus: schedule.status, revertedAt: nowIso() };
    if (kind === "cancellation") Object.assign(patch, { cancelReason: null, notes: null });
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

    const creditOrigin = entry
      ? auditLogs.find((e) => origin?.batchId && e.batchId === origin.batchId && e.action.startsWith("credit.") && String(e.entityId).endsWith(schedule.id))
      : null;
    const audits = [
        {
          ...auditFields(schedule),
          action: { completion: "schedule.completion_reverted", cancellation: "schedule.cancellation_reverted", reschedule: "schedule.reschedule_reverted", pending: "schedule.pending_reverted" }[kind],
          oldValues: kind === "reschedule" ? { date: schedule.date, startTime: schedule.startTime, therapist: schedule.therapistId } : { status: schedule.status },
          newValues: kind === "reschedule" ? { date: toSlot.date, startTime: toSlot.startTime, therapist: toSlot.therapistId } : { status: toStatus },
          reason: note,
          revertsAuditId: origin?.id || null,
          meta: { creditChange, quotaChange },
        },
        entry && {
          ...creditFields(schedule, "r"),
          action: "credit.reversed",
          reason: note,
          revertsAuditId: creditOrigin?.id || null,
          meta: { creditChange, reversesLedgerId: entry.id },
        },
        clientRestore && {
          ...auditFields(schedule),
          action: "client.status_changed",
          entityType: "client",
          entityId: client.id,
          entityLabel: client.clientName,
          oldValues: { status: client.status },
          newValues: { status: clientRestore.to },
          reason: note,
          revertsAuditId: clientRestore.audit.id,
        },
      ].filter(Boolean);
    return { audits, result: { kind, toStatus, toSlot, creditChange, quotaChange, clientStatusRestored: clientRestore?.to || null } };
  };

  const revertSession = (schedule, { reason }) => {
    const { audits, result } = applyRevert(schedule, reason.trim());
    record(audits);
    return result;
  };

  // Hapus sesi (soft delete; tombol hanya untuk role `canDelete`). Sesi completed harus di-revert dulu agar kredit konsisten.
  const deleteSession = (schedule) => {
    if (schedule.status === "completed") return { deleted: false, reason: "completed" };
    deleteSchedules([schedule.id], auth?.staffName || auth?.role || null);
    record({
      ...auditFields(schedule),
      action: "schedule.deleted",
      oldValues: { status: schedule.status, date: schedule.date, startTime: schedule.startTime },
    });
    return { deleted: true };
  };

  const pick = (ids) => schedules.filter((s) => ids.includes(s.id));
  const bulkSummary = (action, list, extra = {}) => ({
    action,
    branchId: list[0]?.branchId || null,
    entityType: "schedule",
    entityId: null,
    entityLabel: `${list.length} sesi`,
    meta: { count: list.length, scheduleIds: list.map((s) => s.id) },
    ...extra,
  });

  // Bulk complete: aturan sama dengan complete tunggal (kredit idempoten per sesi)
  const bulkComplete = (ids) => {
    const list = pick(ids);
    const audits = list.flatMap((s) => {
      const { creditSpent, audits: effects } = applyCompletionEffects(s);
      return [completedAudit(s, creditSpent), ...effects];
    });
    updateSchedulesMany(ids, { status: "completed", revertedAt: null });
    record([bulkSummary("schedule.bulk_completed", list), ...audits]);
  };

  // Bulk cancel. `mode` hanya menentukan alasan ("leave" = izin keluarga, "other" = lainnya). Admin WAJIB memilih potong
  // kredit atau tidak (`deductCredit`); berlaku untuk seluruh sesi dalam batch, dengan aturan yang sama seperti cancel tunggal.
  const bulkCancel = (ids, { mode, note, deductCredit }) => {
    requireDeductChoice(deductCredit);
    const list = pick(ids);
    const notes = note ? ` | Bulk Cancel: ${note}` : " | Bulk Cancelled";
    const cancelReason = mode === "leave" ? "izin_keluarga" : "lainnya";
    const creditAudits = [];
    list.forEach((s) => {
      const { creditAudit } = applyCancelCredit(s, cancelReason, deductCredit);
      if (creditAudit) creditAudits.push(creditAudit);
    });
    updateSchedulesMany(ids, { status: "cancelled", cancelReason, notes, revertedAt: null });
    record([
      bulkSummary("schedule.bulk_cancelled", list, { reason: note || null, meta: { count: list.length, mode, deductCredit } }),
      ...list.map((s) => ({
        ...auditFields(s),
        action: "schedule.cancelled",
        oldValues: { status: s.status },
        newValues: { status: "cancelled", cancelReason },
        reason: note || getCancelReasonLabel(cancelReason),
        meta: { bulk: true, deductCredit },
      })),
      ...creditAudits,
    ]);
  };

  // Bulk reschedule: geser N hari / ke tanggal tertentu, opsional ganti terapis
  const bulkReschedule = (itemsMap) => {
    const list = pick(Object.keys(itemsMap));
    rescheduleSchedulesBulk(itemsMap);
    record([
      bulkSummary("schedule.bulk_rescheduled", list),
      ...list.map((s) => ({
        ...auditFields(s),
        action: "schedule.rescheduled",
        oldValues: { date: s.date, therapist: s.therapistId },
        newValues: { date: itemsMap[s.id].date, therapist: itemsMap[s.id].therapistId },
        meta: { bulk: true },
      })),
    ]);
  };

  // Bulk revert (completed / cancelled / rescheduled). Sesi yang tidak bisa di-revert dilewati; sesi yang slot-nya
  // sudah terisi (termasuk oleh sesi lain dalam batch yang sama) dilewati dan dilaporkan. Satu batch audit.
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
    if (reverted.length > 0) {
      const list = reverted.map((r) => r.schedule);
      record([
        bulkSummary("schedule.bulk_reverted", list, { reason: note, meta: { count: list.length, scheduleIds: list.map((x) => x.id), creditChange, quotaChange, skipped: skipped.length } }),
        ...reverted.flatMap((r) => r.audits.map((a) => ({ ...a, meta: { ...(a.meta || {}), bulk: true } }))),
      ]);
    }
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
