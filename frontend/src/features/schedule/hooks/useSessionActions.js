import { format } from "date-fns";
import { useClients } from "@/stores/clientsStore";
import { useCredits } from "@/stores/creditsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useAuditLogger } from "@/features/audit";
import { advanceStatus } from "@/domain/client";
import { CANCEL_QUOTA } from "@/domain/credit";
import {
  CLEAR_PENDING_PATCH,
  RESCHEDULE_DROPPED,
  buildReportPatch,
  cancelReasonLabel,
  getOriginSlot,
  scheduleSlot,
} from "@/domain/schedule";

// Use-case sesi terapi/asesmen. Satu-satunya tempat yang merangkai perubahan lintas store
// (jadwal → kredit → status client → audit log). Komponen hanya memanggil fungsi ini + menampilkan toast.
// Fase API: tiap fungsi diganti satu request ke endpoint transaksional (docs/guide/10):
//   completeSession → POST /schedules/{id}/complete, cancelSession → POST /schedules/{id}/cancel, dst.
// Audit log ditulis backend di transaksi yang sama; useAuditLogger hanya untuk mode demo.
export function useSessionActions() {
  const { schedules, updateSchedule, updateSchedulesMany, rescheduleSchedulesBulk } = useSchedules();
  const { getClient, updateClient } = useClients();
  const { getRecordForClient, spendPackageCredit, handleScheduleCancellation } = useCredits();
  const { record } = useAuditLogger();

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
    updateSchedule(schedule.id, { status: "completed", ...buildReportPatch(report) });
    const result = applyCompletionEffects(schedule);
    record([completedAudit(schedule, result.creditSpent), ...result.audits]);
    return result;
  };

  // Cancel biasa: masuk kuota cancel client; lewat kuota → penalti 1 kredit
  const cancelSession = (schedule, { cancelReason, note }) => {
    const client = getClient(schedule.clientId);
    const creditRecord = client ? getRecordForClient(client.id) : null;
    const cancelCount = (creditRecord?.cancelCountTotal || 0) + 1;
    const pkg = findPackage(creditRecord, schedule);
    const penalized = cancelCount > CANCEL_QUOTA;

    updateSchedule(schedule.id, { status: "cancelled", cancelReason, notes: note?.trim() || null });
    handleScheduleCancellation({
      clientId: schedule.clientId,
      packageId: schedule.creditPackageId || pkg?.id,
      scheduleId: schedule.id,
      cancelReason,
      date: schedule.date,
    });
    record([
      {
        ...auditFields(schedule),
        action: "schedule.cancelled",
        oldValues: { status: schedule.status },
        newValues: { status: "cancelled", cancelReason },
        reason: [cancelReasonLabel(cancelReason), note?.trim()].filter(Boolean).join(" — "),
        meta: { cancelCount },
      },
      creditRecord && {
        ...creditFields(schedule, "c"),
        action: penalized ? "credit.cancel_penalty" : "credit.cancel_excused",
        meta: { creditChange: penalized ? -1 : 0, cancelCount, quota: CANCEL_QUOTA },
      },
    ].filter(Boolean));
    return { cancelCount, penalized };
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
      rescheduledAt: new Date().toISOString(),
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
      pendingFrom: scheduleSlot(schedule),
      pendingAt: new Date().toISOString(),
      pendingReason: reason,
      pendingNote: note?.trim() || null,
    });
    record({
      ...auditFields(schedule),
      action: "schedule.marked_pending",
      oldValues: { status: schedule.status },
      newValues: { status: "reschedule_pending" },
      reason: [cancelReasonLabel(reason), note?.trim()].filter(Boolean).join(" — "),
    });
  };

  // Batalkan sesi menggantung tanpa memotong kredit / kuota (credit-neutral)
  const dropPending = (schedule, { note }) => {
    updateSchedule(schedule.id, {
      status: "cancelled",
      cancelReason: RESCHEDULE_DROPPED,
      notes: note?.trim() || null,
      ...CLEAR_PENDING_PATCH,
    });
    record({
      ...auditFields(schedule),
      action: "schedule.pending_dropped",
      oldValues: { status: schedule.status },
      newValues: { status: "cancelled", cancelReason: RESCHEDULE_DROPPED },
      reason: note?.trim() || cancelReasonLabel(RESCHEDULE_DROPPED),
    });
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
    updateSchedulesMany(ids, { status: "completed" });
    record([bulkSummary("schedule.bulk_completed", list), ...audits]);
  };

  // Bulk cancel. mode "leave" = dihitung ke kuota cancel (aturan sama dengan cancel tunggal);
  // mode "other" = tanpa perubahan kredit/kuota.
  const bulkCancel = (ids, { mode, note }) => {
    const list = pick(ids);
    const notes = note ? ` | Bulk Cancel: ${note}` : " | Bulk Cancelled";
    const cancelReason = mode === "leave" ? "izin_keluarga" : "lainnya";
    if (mode === "leave") {
      list.forEach((s) => {
        handleScheduleCancellation({ clientId: s.clientId, packageId: s.creditPackageId, scheduleId: s.id, cancelReason, date: s.date });
      });
    }
    updateSchedulesMany(ids, { status: "cancelled", cancelReason, notes });
    record([
      bulkSummary("schedule.bulk_cancelled", list, { reason: note || null, meta: { count: list.length, mode } }),
      ...list.map((s) => ({
        ...auditFields(s),
        action: "schedule.cancelled",
        oldValues: { status: s.status },
        newValues: { status: "cancelled", cancelReason },
        reason: note || cancelReasonLabel(cancelReason),
        meta: { bulk: true, countsTowardQuota: mode === "leave" },
      })),
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

  return {
    saveReport,
    completeSession,
    cancelSession,
    rescheduleSession,
    markPending,
    dropPending,
    bulkComplete,
    bulkCancel,
    bulkReschedule,
  };
}
