// @vitest-environment jsdom
// Regresi bug B1: bulk complete / bulk cancel "leave" dulu memanggil fungsi yang tidak ada (TypeError).
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { useSessionActions } from "@/features/schedule";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { useClients } from "@/stores/clientsStore";
import { useAudit } from "@/stores/auditStore";
import { CANCEL_QUOTA } from "@/domain/credit";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = { actions: useSessionActions(), schedules: useSchedules(), credits: useCredits(), audit: useAudit(), clients: useClients() };
  return null;
}

let root;
beforeEach(async () => {
  window.localStorage.clear();
  await ensureSeedsIfNeeded();
  const el = document.createElement("div");
  root = createRoot(el);
  await act(async () => root.render(<AppProviders><Probe /></AppProviders>));
});
afterEach(() => act(() => root.unmount()));

// Sesi therapy terjadwal milik client yang masih punya kredit
const pickSessions = (n) => {
  const list = ctx.schedules.schedules.filter((s) => {
    if (s.type !== "therapy" || s.status !== "scheduled") return false;
    const rec = ctx.credits.getRecordForClient(s.clientId);
    return rec && rec.remainingCredit >= n;
  });
  const clientId = list[0].clientId;
  return list.filter((s) => s.clientId === clientId).slice(0, n);
};

test("bulkComplete memotong 1 kredit per sesi therapy dan menandai completed", async () => {
  const sessions = pickSessions(2);
  expect(sessions).toHaveLength(2);
  const clientId = sessions[0].clientId;
  const before = ctx.credits.getRecordForClient(clientId).remainingCredit;

  const auditBefore = ctx.audit.auditLogs.length;
  await act(async () => ctx.actions.bulkComplete(sessions.map((s) => s.id)));

  // Audit: 1 ringkasan bulk + per sesi (completed + credit.used), satu batch
  const added = ctx.audit.auditLogs.slice(0, ctx.audit.auditLogs.length - auditBefore);
  expect(added.map((e) => e.action).sort()).toEqual(["credit.used", "credit.used", "schedule.bulk_completed", "schedule.completed", "schedule.completed"]);
  expect(new Set(added.map((e) => e.batchId)).size).toBe(1);

  expect(ctx.credits.getRecordForClient(clientId).remainingCredit).toBe(before - 2);
  const updated = ctx.schedules.schedules.filter((s) => sessions.some((x) => x.id === s.id));
  expect(updated.every((s) => s.status === "completed")).toBe(true);

  // Idempoten: complete ulang tidak memotong lagi
  await act(async () => ctx.actions.bulkComplete(sessions.map((s) => s.id)));
  expect(ctx.credits.getRecordForClient(clientId).remainingCredit).toBe(before - 2);
});

describe("createSessions: sesi asesmen memajukan status client", () => {
  const mk = (clientId, type) => ({
    id: `new-${type}`, clientId, therapistId: "t-001", date: "2030-01-07", startTime: "09:00", endTime: "10:00",
    type, status: "scheduled", branchId: "branch-sby-timur", creditPackageId: null,
  });
  const pickClient = (statuses) => ctx.clients.clients.find((c) => statuses.includes(c.status));

  test("inquiry / service_selected → assessment_scheduled tanpa wajib melewati tahap lain", async () => {
    const client = pickClient(["inquiry", "service_selected"]);
    expect(client).toBeTruthy();
    let result;
    await act(async () => { result = ctx.actions.createSessions([mk(client.id, "assessment")]); });
    expect(result.assessmentScheduled).toBe(true);
    expect(ctx.clients.getClient(client.id).status).toBe("assessment_scheduled");
    expect(ctx.schedules.schedules.some((s) => s.id === "new-assessment")).toBe(true);
    const actions = ctx.audit.auditLogs.slice(0, 2).map((e) => e.action).sort();
    expect(actions).toEqual(["client.status_changed", "schedule.created"]);
  });

  test("sesi terapi tidak mengubah status; status lanjut tidak mundur", async () => {
    const early = pickClient(["inquiry", "service_selected"]);
    await act(async () => ctx.actions.createSessions([mk(early.id, "therapy")]));
    expect(ctx.clients.getClient(early.id).status).toBe(early.status);

    const advanced = pickClient(["assessment_done", "admitted"]);
    let result;
    await act(async () => { result = ctx.actions.createSessions([mk(advanced.id, "assessment")]); });
    expect(result.assessmentScheduled).toBe(false);
    expect(ctx.clients.getClient(advanced.id).status).toBe(advanced.status);
  });
});

describe("revertSession: batalkan completed / cancel", () => {
  const sched = (id) => ctx.schedules.schedules.find((s) => s.id === id);
  const remaining = (clientId) => ctx.credits.getRecordForClient(clientId).remainingCredit;

  test("completed → revert mengembalikan kredit & status; complete lagi memotong dengan baris baru", async () => {
    const [s] = pickSessions(1);
    const before = remaining(s.clientId);

    await act(async () => ctx.actions.completeSession(s, {}));
    expect(remaining(s.clientId)).toBe(before - 1);
    expect(sched(s.id).previousStatus).toBe("scheduled");

    let result;
    await act(async () => { result = ctx.actions.revertSession(sched(s.id), { reason: "Salah klik" }); });
    expect(result).toMatchObject({ toStatus: "scheduled", creditChange: 1 });
    expect(sched(s.id).status).toBe("scheduled");
    expect(remaining(s.clientId)).toBe(before);

    // Ledger append-only: 'used' + 'reversal' keduanya ada, reversal menunjuk 'used'
    const history = ctx.credits.getRecordForClient(s.clientId).history.filter((h) => h.scheduleId === s.id);
    expect(history.map((h) => h.action)).toEqual(["used", "reversal"]);
    expect(history[1].reversesId).toBe(history[0].id);

    // Audit: log pembatalan menunjuk log asal
    const reverted = ctx.audit.auditLogs.find((e) => e.action === "schedule.completion_reverted" && e.entityId === s.id);
    const origin = ctx.audit.auditLogs.find((e) => e.action === "schedule.completed" && e.entityId === s.id);
    expect(reverted).toMatchObject({ reason: "Salah klik", revertsAuditId: origin.id });
    expect(ctx.audit.auditLogs.some((e) => e.action === "credit.reversed" && e.entityId === `led-r-${s.id}`)).toBe(true);

    // Complete lagi: sah, baris 'used' baru
    await act(async () => ctx.actions.completeSession(sched(s.id), {}));
    expect(remaining(s.clientId)).toBe(before - 1);
    expect(ctx.credits.getRecordForClient(s.clientId).history.filter((h) => h.scheduleId === s.id && h.action === "used")).toHaveLength(2);
  });

  test("cancel → revert: status kembali, kuota cancel kembali", async () => {
    const [s] = pickSessions(1);
    const quotaBefore = ctx.credits.getRecordForClient(s.clientId).cancelCountTotal;
    const creditBefore = remaining(s.clientId);

    await act(async () => ctx.actions.cancelSession(s, { cancelReason: "Anak ujian sekolah", note: "" }));
    expect(sched(s.id)).toMatchObject({ status: "cancelled", cancelReason: "Anak ujian sekolah" });
    expect(ctx.credits.getRecordForClient(s.clientId).cancelCountTotal).toBe(quotaBefore + 1);

    await act(async () => ctx.actions.revertSession(sched(s.id), { reason: "Ortu ternyata hadir" }));
    expect(sched(s.id)).toMatchObject({ status: "scheduled", cancelReason: null });
    expect(ctx.credits.getRecordForClient(s.clientId).cancelCountTotal).toBe(quotaBefore);
    expect(remaining(s.clientId)).toBe(creditBefore);
    expect(ctx.audit.auditLogs.some((e) => e.action === "schedule.cancellation_reverted" && e.entityId === s.id)).toBe(true);
  });

  test("reschedule → revert: kembali ke slot & terapis asal, jejak dihapus, kredit tidak berubah", async () => {
    const [s] = pickSessions(1);
    const creditBefore = remaining(s.clientId);
    const orig = { date: s.date, startTime: s.startTime, endTime: s.endTime, therapistId: s.therapistId };

    await act(async () => ctx.actions.rescheduleSession(s, { date: "2031-03-03", startTime: "13:00", endTime: "14:00", therapistId: "t-002" }));
    expect(sched(s.id)).toMatchObject({ status: "rescheduled", date: "2031-03-03", therapistId: "t-002" });
    expect(sched(s.id).rescheduledFrom).toMatchObject(orig);

    let result;
    await act(async () => { result = ctx.actions.revertSession(sched(s.id), { reason: "Ortu batal pindah" }); });
    expect(result).toMatchObject({ kind: "reschedule", toStatus: "scheduled", creditChange: 0 });
    expect(sched(s.id)).toMatchObject({ status: "scheduled", ...orig, rescheduledFrom: null });
    expect(remaining(s.clientId)).toBe(creditBefore);

    const reverted = ctx.audit.auditLogs.find((e) => e.action === "schedule.reschedule_reverted" && e.entityId === s.id);
    const origin = ctx.audit.auditLogs.find((e) => e.action === "schedule.rescheduled" && e.entityId === s.id);
    expect(reverted).toMatchObject({ reason: "Ortu batal pindah", revertsAuditId: origin.id });
  });

  test("asesmen completed → revert mengembalikan tahap client; tidak ada mutasi kredit", async () => {
    const client = ctx.clients.clients.find((c) => c.status === "inquiry" || c.status === "service_selected");
    const a = {
      id: "rv-assess", clientId: client.id, therapistId: "t-001", date: "2030-02-04", startTime: "09:00", endTime: "10:00",
      type: "assessment", status: "scheduled", branchId: client.branchId, creditPackageId: null,
    };
    await act(async () => ctx.actions.createSessions([a]));
    const stageBefore = ctx.clients.getClient(client.id).status; // assessment_scheduled
    await act(async () => ctx.actions.completeSession(sched(a.id), {}));
    expect(ctx.clients.getClient(client.id).status).toBe("assessment_done");

    let result;
    await act(async () => { result = ctx.actions.revertSession(sched(a.id), { reason: "Salah sesi" }); });
    expect(result.creditChange).toBe(0);
    expect(result.clientStatusRestored).toBe(stageBefore);
    expect(ctx.clients.getClient(client.id).status).toBe(stageBefore);
  });
});

describe("bulkRevert", () => {
  const sched = (id) => ctx.schedules.schedules.find((s) => s.id === id);

  test("bulk complete lalu bulk revert: semua kredit kembali dalam satu batch audit; sesi tak eligible dilewati", async () => {
    const sessions = pickSessions(2);
    const clientId = sessions[0].clientId;
    const before = ctx.credits.getRecordForClient(clientId).remainingCredit;
    await act(async () => ctx.actions.bulkComplete(sessions.map((s) => s.id)));
    expect(ctx.credits.getRecordForClient(clientId).remainingCredit).toBe(before - 2);

    // Sesi ke-3 masih scheduled (tidak eligible) ikut dipilih
    const stillScheduled = ctx.schedules.schedules.find((s) => s.status === "scheduled" && !sessions.some((x) => x.id === s.id));
    const ids = [...sessions.map((s) => s.id), stillScheduled.id];
    const auditBefore = ctx.audit.auditLogs.length;

    let result;
    await act(async () => { result = ctx.actions.bulkRevert(ids, { reason: "Salah pilih sesi" }); });
    expect(result).toMatchObject({ reverted: 2, creditChange: 2 });
    expect(result.skipped).toEqual([expect.objectContaining({ cause: "status" })]);
    expect(ctx.credits.getRecordForClient(clientId).remainingCredit).toBe(before);
    expect(sessions.every((s) => sched(s.id).status === "scheduled")).toBe(true);

    const added = ctx.audit.auditLogs.slice(0, ctx.audit.auditLogs.length - auditBefore);
    expect(added.filter((e) => e.action === "schedule.bulk_reverted")).toHaveLength(1);
    expect(added.filter((e) => e.action === "schedule.completion_reverted")).toHaveLength(2);
    expect(new Set(added.map((e) => e.batchId)).size).toBe(1);
  });

  test("slot yang sudah terisi sesi lain dilewati (tidak dibatalkan)", async () => {
    const [s] = pickSessions(1);
    await act(async () => ctx.actions.cancelSession(s, { cancelReason: "sakit", note: "" }));
    // Terapis yang sama menempati slot itu dengan sesi lain
    const other = ctx.schedules.schedules.find((x) => x.id !== s.id && x.clientId !== s.clientId && x.status === "scheduled");
    await act(async () => ctx.schedules.updateSchedule(other.id, { therapistId: s.therapistId, date: s.date, startTime: s.startTime, endTime: s.endTime }));

    let result;
    await act(async () => { result = ctx.actions.bulkRevert([s.id], { reason: "Koreksi" }); });
    expect(result.reverted).toBe(0);
    expect(result.skipped).toEqual([expect.objectContaining({ cause: "conflict" })]);
    expect(sched(s.id).status).toBe("cancelled");
  });
});

test("bulkCancel mode leave menambah kuota cancel; mode other tidak", async () => {
  const [a, b] = pickSessions(2);
  const clientId = a.clientId;
  const beforeCount = ctx.credits.getRecordForClient(clientId).cancelCountTotal;

  await act(async () => ctx.actions.bulkCancel([a.id], { mode: "leave", note: "" }));
  const afterLeave = ctx.credits.getRecordForClient(clientId).cancelCountTotal;
  expect(afterLeave).toBe(beforeCount + 1);

  await act(async () => ctx.actions.bulkCancel([b.id], { mode: "other", note: "x" }));
  expect(ctx.credits.getRecordForClient(clientId).cancelCountTotal).toBe(afterLeave);
  expect(ctx.schedules.schedules.find((s) => s.id === b.id)).toMatchObject({ status: "cancelled", cancelReason: "lainnya" });
  expect(CANCEL_QUOTA).toBe(3);
});
