// @vitest-environment jsdom
// Menetapkan hari libur: sesi aktif di tanggal itu dibatalkan (alasan H, tanpa potong kredit); completed/cancelled/rescheduled tetap.
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { useHolidayActions } from "@/features/schedule/hooks/useHolidayActions";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { useHolidays } from "@/stores/holidaysStore";
import { makeHoliday, holidayAffectedSessions } from "@/domain/holiday";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = { actions: useHolidayActions(), schedules: useSchedules(), credits: useCredits(), holidays: useHolidays() };
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

const mk = (id, status, branchId = "branch-sby-timur") => ({ id, clientId: "c-001", branchId, therapistId: "t-001", date: "2099-05-05", startTime: "09:00", endTime: "10:00", type: "therapy", status });

test("domain: hanya scheduled & reschedule_pending di tanggal/cabang libur yang terdampak", () => {
  const list = [mk("a", "scheduled"), mk("b", "reschedule_pending"), mk("c", "completed"), mk("d", "cancelled"), mk("e", "rescheduled"), mk("f", "scheduled", "branch-sby-barat"), { ...mk("g", "scheduled"), date: "2099-05-06" }];
  expect(holidayAffectedSessions(list, { date: "2099-05-05", branchId: null }).map((s) => s.id)).toEqual(["a", "b", "f"]);
  expect(holidayAffectedSessions(list, { date: "2099-05-05", branchId: "branch-sby-timur" }).map((s) => s.id)).toEqual(["a", "b"]);
});

test("createHoliday membatalkan sesi aktif tanpa menyentuh kredit atau sesi riwayat", async () => {
  await act(async () => ctx.schedules.addSchedules([mk("a", "scheduled"), mk("b", "reschedule_pending"), mk("c", "completed"), mk("d", "cancelled"), mk("e", "rescheduled")]));
  const creditsBefore = JSON.stringify(ctx.credits.credits.records);
  let res;
  await act(async () => { res = ctx.actions.createHoliday(makeHoliday({ date: "2099-05-05", name: "Libur Uji" })); });
  expect(res.cancelled).toBe(2);
  const byId = Object.fromEntries(ctx.schedules.schedules.filter((s) => ["a", "b", "c", "d", "e"].includes(s.id)).map((s) => [s.id, s]));
  expect(byId.a).toMatchObject({ status: "cancelled", previousStatus: "scheduled", cancelReason: "H", cancelNote: "Hari libur: Libur Uji" });
  expect(byId.b).toMatchObject({ status: "cancelled", previousStatus: "reschedule_pending" });
  expect([byId.c.status, byId.d.status, byId.e.status]).toEqual(["completed", "cancelled", "rescheduled"]);
  expect(JSON.stringify(ctx.credits.credits.records)).toBe(creditsBefore);
  expect(ctx.holidays.holidays.some((h) => h.name === "Libur Uji")).toBe(true);
});
