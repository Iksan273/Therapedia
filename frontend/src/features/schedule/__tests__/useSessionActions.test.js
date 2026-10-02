// @vitest-environment jsdom
// Regresi bug B1: bulk complete / bulk cancel "leave" dulu memanggil fungsi yang tidak ada (TypeError).
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { useSessionActions } from "@/features/schedule";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { useAudit } from "@/stores/auditStore";
import { CANCEL_QUOTA } from "@/domain/credit";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = { actions: useSessionActions(), schedules: useSchedules(), credits: useCredits(), audit: useAudit() };
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
