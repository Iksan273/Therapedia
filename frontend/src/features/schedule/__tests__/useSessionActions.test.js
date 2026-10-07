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
import { leaveRemainingOf } from "@/domain/credit";
import { canRevertSession } from "@/domain/schedule";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = { actions: useSessionActions(), schedules: useSchedules(), credits: useCredits(), clients: useClients() };
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

// Paket yang dipakai sesi (sama dengan aturan hook: paket sesi, fallback paket pertama)
const pkgOf = (s) => {
  const rec = ctx.credits.getRecordForClient(s.clientId);
  return rec.packages.find((p) => p.id === s.creditPackageId || p.packageId === s.creditPackageId) || rec.packages[0];
};

test("bulkComplete memotong 1 kredit per sesi therapy dan menandai completed", async () => {
  const sessions = pickSessions(2);
  expect(sessions).toHaveLength(2);
  const clientId = sessions[0].clientId;
  const before = ctx.credits.getRecordForClient(clientId).remainingCredit;

  await act(async () => ctx.actions.bulkComplete(sessions.map((s) => s.id)));

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

    // Complete lagi: sah, baris 'used' baru
    await act(async () => ctx.actions.completeSession(sched(s.id), {}));
    expect(remaining(s.clientId)).toBe(before - 1);
    expect(ctx.credits.getRecordForClient(s.clientId).history.filter((h) => h.scheduleId === s.id && h.action === "used")).toHaveLength(2);
  });

  test("cancel wajib memilih potong atau tidak (tanpa pilihan ditolak)", async () => {
    const [s] = pickSessions(1);
    expect(() => ctx.actions.cancelSession(s, { cancelReason: "sakit", note: "" })).toThrow(/wajib dipilih/);
    expect(sched(s.id).status).toBe("scheduled");
  });

  test("cancel tanpa potong → revert: status kembali, kuota paket kembali, kredit utuh", async () => {
    const [s] = pickSessions(1);
    const quotaBefore = pkgOf(s).cancelCount || 0;
    const creditBefore = remaining(s.clientId);

    let result;
    await act(async () => { result = ctx.actions.cancelSession(s, { cancelReason: "Anak ujian sekolah", note: "", deductCredit: false }); });
    expect(result).toMatchObject({ deducted: false, cancelCount: quotaBefore + 1 });
    expect(sched(s.id)).toMatchObject({ status: "cancelled", cancelReason: "Anak ujian sekolah" });
    expect(pkgOf(s).cancelCount).toBe(quotaBefore + 1);
    expect(remaining(s.clientId)).toBe(creditBefore);

    await act(async () => ctx.actions.revertSession(sched(s.id), { reason: "Ortu ternyata hadir" }));
    expect(sched(s.id)).toMatchObject({ status: "scheduled", cancelReason: null });
    expect(pkgOf(s).cancelCount).toBe(quotaBefore);
    expect(remaining(s.clientId)).toBe(creditBefore);
  });

  test("cancel dengan potong: credit leave paket dipakai dulu (kredit sesi utuh); revert mengembalikan credit leave", async () => {
    const [s] = pickSessions(1);
    const creditBefore = remaining(s.clientId);
    const leaveBefore = leaveRemainingOf(pkgOf(s));
    let result;
    await act(async () => { result = ctx.actions.cancelSession(s, { cancelReason: "sakit", note: "", deductCredit: true }); });
    expect(result).toMatchObject({ deducted: false, usedLeave: true });
    expect(remaining(s.clientId)).toBe(creditBefore);
    expect(leaveRemainingOf(pkgOf(s))).toBe(leaveBefore - 1);
    expect(ctx.credits.getRecordForClient(s.clientId).history.some((h) => h.scheduleId === s.id && h.action === "cancel_leave")).toBe(true);

    await act(async () => ctx.actions.revertSession(sched(s.id), { reason: "Salah pilih" }));
    expect(remaining(s.clientId)).toBe(creditBefore);
    expect(leaveRemainingOf(pkgOf(s))).toBe(leaveBefore);
  });

  test("cancel dengan potong saat credit leave habis: 1 kredit sesi dipotong; revert mengembalikannya", async () => {
    const [s] = pickSessions(1);
    const raw = ctx.credits.getRawRecord(s.clientId);
    await act(async () => ctx.credits.addRecord({ ...raw, packages: raw.packages.map((p) => ({ ...p, leaveTotal: 0 })) })); // paket tanpa credit leave
    const creditBefore = remaining(s.clientId);
    let result;
    await act(async () => { result = ctx.actions.cancelSession(s, { cancelReason: "sakit", note: "", deductCredit: true }); });
    expect(result).toMatchObject({ deducted: true, usedLeave: false });
    expect(remaining(s.clientId)).toBe(creditBefore - 1);
    expect(ctx.credits.getRecordForClient(s.clientId).history.some((h) => h.scheduleId === s.id && h.action === "cancel_penalty")).toBe(true);

    await act(async () => ctx.actions.revertSession(sched(s.id), { reason: "Salah pilih" }));
    expect(remaining(s.clientId)).toBe(creditBefore);
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

  test("bulk complete lalu bulk revert: semua kredit kembali; sesi tak eligible dilewati", async () => {
    const sessions = pickSessions(2);
    const clientId = sessions[0].clientId;
    const before = ctx.credits.getRecordForClient(clientId).remainingCredit;
    await act(async () => ctx.actions.bulkComplete(sessions.map((s) => s.id)));
    expect(ctx.credits.getRecordForClient(clientId).remainingCredit).toBe(before - 2);

    // Sesi ke-3 masih scheduled (tidak eligible) ikut dipilih
    const stillScheduled = ctx.schedules.schedules.find((s) => s.status === "scheduled" && !sessions.some((x) => x.id === s.id));
    const ids = [...sessions.map((s) => s.id), stillScheduled.id];

    let result;
    await act(async () => { result = ctx.actions.bulkRevert(ids, { reason: "Salah pilih sesi" }); });
    expect(result).toMatchObject({ reverted: 2, creditChange: 2 });
    expect(result.skipped).toEqual([expect.objectContaining({ cause: "status" })]);
    expect(ctx.credits.getRecordForClient(clientId).remainingCredit).toBe(before);
    expect(sessions.every((s) => sched(s.id).status === "scheduled")).toBe(true);
  });

  test("slot yang sudah terisi sesi lain dilewati (tidak dibatalkan)", async () => {
    const [s] = pickSessions(1);
    await act(async () => ctx.actions.cancelSession(s, { cancelReason: "sakit", note: "", deductCredit: false }));
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

test("bulkCancel: admin memilih potong (credit leave dulu); tanpa keputusan ditolak", async () => {
  const [a, b] = pickSessions(2);
  const clientId = a.clientId;
  expect(() => ctx.actions.bulkCancel([a.id], { mode: "leave", note: "" })).toThrow(/wajib dipilih/);

  const creditBefore = ctx.credits.getRecordForClient(clientId).remainingCredit;
  const countBefore = pkgOf(a).cancelCount || 0;

  await act(async () => ctx.actions.bulkCancel([a.id], { mode: "leave", note: "", deductCredit: false }));
  expect(pkgOf(a).cancelCount).toBe(countBefore + 1);
  expect(ctx.credits.getRecordForClient(clientId).remainingCredit).toBe(creditBefore);
  expect(ctx.schedules.schedules.find((s) => s.id === a.id)).toMatchObject({ status: "cancelled", cancelReason: "FM" });

  const leaveBefore = leaveRemainingOf(pkgOf(b));
  await act(async () => ctx.actions.bulkCancel([b.id], { mode: "other", note: "x", deductCredit: true }));
  expect(ctx.credits.getRecordForClient(clientId).remainingCredit).toBe(creditBefore); // credit leave dipakai, kredit sesi utuh
  expect(leaveRemainingOf(pkgOf(b))).toBe(leaveBefore - 1);
  expect(ctx.schedules.schedules.find((s) => s.id === b.id)).toMatchObject({ status: "cancelled", cancelReason: "LN" });
});

describe("drop pending: admin memilih potong atau tidak", () => {
  const sched = (id) => ctx.schedules.schedules.find((s) => s.id === id);

  test("pending → drop tanpa potong; dengan potong memakai credit leave; keduanya tercatat di ledger", async () => {
    const [a, b] = pickSessions(2);
    await act(async () => ctx.actions.markPending(a, { reason: "sakit", note: "" }));
    await act(async () => ctx.actions.markPending(b, { reason: "sakit", note: "" }));
    expect(() => ctx.actions.dropPending(sched(a.id), { note: "" })).toThrow(/wajib dipilih/);

    const creditBefore = ctx.credits.getRecordForClient(a.clientId).remainingCredit;
    await act(async () => ctx.actions.dropPending(sched(a.id), { note: "", deductCredit: false }));
    expect(ctx.credits.getRecordForClient(a.clientId).remainingCredit).toBe(creditBefore);
    await act(async () => ctx.actions.dropPending(sched(b.id), { note: "", deductCredit: true }));
    expect(ctx.credits.getRecordForClient(a.clientId).remainingCredit).toBe(creditBefore); // credit leave dipakai
    const hist = ctx.credits.getRecordForClient(a.clientId).history.filter((h) => [a.id, b.id].includes(h.scheduleId));
    expect(hist.map((h) => h.action).sort()).toEqual(["cancel_excused", "cancel_leave"]);
    expect(sched(a.id)).toMatchObject({ status: "cancelled", cancelReason: "RD" });
  });
});

describe("revert hanya 1x", () => {
  const sched = (id) => ctx.schedules.schedules.find((s) => s.id === id);
  const slot = (s) => ({ date: s.date, startTime: s.startTime, endTime: s.endTime, therapistId: s.therapistId });

  test("revert kedua langsung ditolak; setelah aksi baru bisa di-revert lagi", async () => {
    const [s] = pickSessions(1);
    await act(async () => ctx.actions.completeSession(s, {}));
    expect(canRevertSession(sched(s.id))).toBe(true);

    await act(async () => ctx.actions.revertSession(sched(s.id), { reason: "Salah klik" }));
    expect(sched(s.id).revertedAt).toBeTruthy();
    expect(canRevertSession(sched(s.id))).toBe(false);

    // Aksi baru (complete lagi) mengosongkan penanda sehingga bisa di-revert sekali lagi
    await act(async () => ctx.actions.completeSession(sched(s.id), {}));
    expect(sched(s.id).revertedAt).toBeNull();
    expect(canRevertSession(sched(s.id))).toBe(true);
  });

  test("reschedule 2x → revert kembali ke jadwal tersimpan terakhir (bukan jadwal asal)", async () => {
    const [s] = pickSessions(1);
    const orig = slot(s);
    await act(async () => ctx.actions.rescheduleSession(s, { date: "2031-03-03", startTime: "13:00", endTime: "14:00", therapistId: "t-002" }));
    const first = slot(sched(s.id));
    await act(async () => ctx.actions.rescheduleSession(sched(s.id), { date: "2031-04-07", startTime: "15:00", endTime: "16:00", therapistId: "t-002" }));
    expect(sched(s.id).rescheduledFrom).toMatchObject(orig);
    expect(sched(s.id).rescheduledPrev).toMatchObject(first);

    let result;
    await act(async () => { result = ctx.actions.revertSession(sched(s.id), { reason: "Salah geser" }); });
    expect(result).toMatchObject({ kind: "reschedule", toStatus: "rescheduled" });
    expect(sched(s.id)).toMatchObject({ status: "rescheduled", ...first });
    expect(sched(s.id).rescheduledFrom).toMatchObject(orig); // jadwal asal tetap tercatat
    expect(canRevertSession(sched(s.id))).toBe(false); // hanya 1x
  });

  test("reschedule 1x → revert kembali ke jadwal asal berstatus scheduled", async () => {
    const [s] = pickSessions(1);
    const orig = slot(s);
    await act(async () => ctx.actions.rescheduleSession(s, { date: "2031-03-03", startTime: "13:00", endTime: "14:00", therapistId: "t-002" }));
    await act(async () => ctx.actions.revertSession(sched(s.id), { reason: "Batal pindah" }));
    expect(sched(s.id)).toMatchObject({ status: "scheduled", ...orig, rescheduledFrom: null });
  });

  test("reschedule pending → revert kembali ke jadwal asal (scheduled), tanpa efek kredit", async () => {
    const [s] = pickSessions(1);
    const creditBefore = ctx.credits.getRecordForClient(s.clientId).remainingCredit;
    await act(async () => ctx.actions.markPending(s, { reason: "sakit", note: "" }));
    expect(sched(s.id).status).toBe("reschedule_pending");
    expect(canRevertSession(sched(s.id))).toBe(true);

    let result;
    await act(async () => { result = ctx.actions.revertSession(sched(s.id), { reason: "Salah tandai" }); });
    expect(result).toMatchObject({ kind: "pending", toStatus: "scheduled", creditChange: 0 });
    expect(sched(s.id)).toMatchObject({ status: "scheduled", pendingFrom: null, pendingReason: null });
    expect(ctx.credits.getRecordForClient(s.clientId).remainingCredit).toBe(creditBefore);
    expect(canRevertSession(sched(s.id))).toBe(false);
  });
});

describe("bulkReschedule atomik", () => {
  test("tujuan beda per sesi tersimpan semua; ada yang bermasalah → tidak ada yang berubah", async () => {
    const [a, b] = pickSessions(2);
    const ok = [
      { id: a.id, date: "2031-03-03", startTime: "08:00", endTime: "09:00", therapistId: a.therapistId },
      { id: b.id, date: "2031-03-05", startTime: "10:00", endTime: "11:00", therapistId: b.therapistId },
    ];
    // baris kedua dikosongkan → seluruh batch ditolak
    const bad = [ok[0], { ...ok[1], date: "" }];
    let res;
    await act(async () => { res = ctx.actions.bulkReschedule(bad); });
    expect(res.ok).toBe(false);
    const after = ctx.schedules.schedules.find((s) => s.id === a.id);
    expect(after.date).toBe(a.date);
    expect(after.status).toBe("scheduled");

    await act(async () => { res = ctx.actions.bulkReschedule(ok); });
    expect(res.ok).toBe(true);
    const sa = ctx.schedules.schedules.find((s) => s.id === a.id);
    const sb = ctx.schedules.schedules.find((s) => s.id === b.id);
    expect([sa.date, sb.date]).toEqual(["2031-03-03", "2031-03-05"]);
    expect([sa.status, sb.status]).toEqual(["rescheduled", "rescheduled"]);
  });
});

test("cancelForLeave (cuti Finance): tidak memotong kredit sesi maupun credit leave; revert memulihkan", async () => {
  const [s] = pickSessions(1);
  const pkgBefore = pkgOf(s);
  expect(() => ctx.actions.cancelForLeave(s, { note: "", leaveId: "lv-1" })).toThrow(/wajib dipilih/);

  await act(async () => { ctx.actions.cancelForLeave(s, { note: "Cuti keluarga", deductCredit: true, leaveId: "lv-1" }); });
  const cancelled = ctx.schedules.schedules.find((x) => x.id === s.id);
  expect(cancelled).toMatchObject({ status: "cancelled", cancelReason: "OL", cancelNote: "Cuti keluarga", leaveId: "lv-1" });
  const pkgAfter = pkgOf(s);
  expect(pkgAfter.remainingCredit).toBe(pkgBefore.remainingCredit);
  expect(leaveRemainingOf(pkgAfter)).toBe(leaveRemainingOf(pkgBefore));
  expect(pkgAfter.cancelCount || 0).toBe(pkgBefore.cancelCount || 0);
  expect(canRevertSession(cancelled)).toBe(true);

  let r;
  await act(async () => { r = ctx.actions.revertSession(cancelled, { reason: "salah klik" }); });
  expect(r).toMatchObject({ kind: "cancellation", creditChange: 0, quotaChange: 0 });
  const back = ctx.schedules.schedules.find((x) => x.id === s.id);
  expect(back.status).toBe("scheduled");
  expect(back.cancelReason).toBeNull();
  expect(back.leaveId).toBeNull();
  expect(pkgOf(s).remainingCredit).toBe(pkgBefore.remainingCredit);
});

test("Cancel / Off adalah satu mekanisme: alasan Off (S, SCA, ...) memakai cancelSession dan ikut kuota cancel", async () => {
  const [s] = pickSessions(1);
  const before = pkgOf(s);
  await act(async () => { ctx.actions.cancelSession(s, { cancelReason: "SCA", note: "Kegiatan sekolah", deductCredit: false }); });
  const after = pkgOf(s);
  expect(after.remainingCredit).toBe(before.remainingCredit);
  expect(after.cancelCount || 0).toBe((before.cancelCount || 0) + 1);
  expect(ctx.schedules.schedules.find((x) => x.id === s.id)).toMatchObject({ status: "cancelled", cancelReason: "SCA" });
});
