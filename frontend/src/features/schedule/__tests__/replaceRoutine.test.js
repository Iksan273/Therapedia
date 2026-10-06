// @vitest-environment jsdom
// Use-case ganti / hapus jadwal rutin: sesi lama terhapus, sesi baru dibuat, sesi lain tidak tersentuh.
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { useSessionActions } from "@/features/schedule/hooks/useSessionActions";
import { useSchedules } from "@/stores/schedulesStore";
import { planRoutineChange, routineKeyOf } from "@/domain/schedule";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = { actions: useSessionActions(), sch: useSchedules() };
  return null;
}
let root;
beforeEach(async () => {
  window.localStorage.clear();
  await ensureSeedsIfNeeded();
  root = createRoot(document.createElement("div"));
  await act(async () => root.render(<AppProviders><Probe /></AppProviders>));
});
afterEach(() => act(() => root.unmount()));

const mk = (id, date, extra = {}) => ({ id, clientId: "rt-client", type: "therapy", status: "scheduled", date, startTime: "09:00", endTime: "10:00", therapistId: "rt-th", isRecurring: true, recurrenceRule: "weekly", ...extra });

test("replaceRoutine menghapus sesi pola lama & membuat pola baru; completed dan client lain utuh", async () => {
  const old = ["2030-03-04", "2030-03-11", "2030-03-18"].map((d, i) => mk(`rt-${i}`, d)); // Senin
  const keep = [mk("rt-done", "2030-03-04", { status: "completed", startTime: "11:00", endTime: "12:00" }), mk("other", "2030-03-11", { clientId: "other-client", therapistId: "other-th" })];
  await act(async () => ctx.sch.addSchedules([...old, ...keep]));

  const plan = planRoutineChange({
    sessions: ctx.sch.schedules, from: "2030-03-04", weeks: 2, therapists: [{ id: "rt-th", name: "T" }],
    rows: [{ originalKey: routineKeyOf(old[0]), weekday: 3, startTime: "10:00", endTime: "11:00", therapistId: "rt-th" }],
    template: { clientId: "rt-client", branchId: "branch-sby-timur", creditPackageId: null },
  });
  expect(plan.conflicts).toEqual([]);
  let res;
  await act(async () => { res = ctx.actions.replaceRoutine(plan); });
  expect(res).toEqual({ removed: 3, created: 2 });

  const mine = ctx.sch.schedules.filter((s) => s.clientId === "rt-client");
  expect(mine.filter((s) => s.status === "scheduled").map((s) => s.date).sort()).toEqual(["2030-03-06", "2030-03-13"]);
  expect(mine.some((s) => s.id === "rt-done")).toBe(true);
  expect(ctx.sch.schedules.some((s) => s.id === "other")).toBe(true);

  await act(async () => ctx.actions.deleteRoutineSessions(mine.filter((s) => s.status === "scheduled").map((s) => s.id)));
  expect(ctx.sch.schedules.filter((s) => s.clientId === "rt-client").map((s) => s.id)).toEqual(["rt-done"]);
});
