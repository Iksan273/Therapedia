// @vitest-environment jsdom
// Regresi: lebar kolom hari tidak boleh berubah per baris walau satu sel berisi banyak sesi / teks panjang.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { WeeklyCalendar } from "@/features/schedule";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test("header & semua baris jam memakai template kolom yang sama dan terkunci", async () => {
  const weekStart = new Date("2026-09-28T00:00:00");
  const schedules = Array.from({ length: 6 }, (_, i) => ({
    id: `s-${i}`,
    clientId: `c-${i}`,
    therapistId: "t-1",
    date: "2026-10-01",
    startTime: "09:00",
    endTime: "10:00",
    type: "therapy",
    status: i % 2 ? "reschedule_pending" : "scheduled",
  }));
  const el = document.createElement("div");
  const root = createRoot(el);
  await act(async () =>
    root.render(<WeeklyCalendar weekStart={weekStart} schedules={schedules} getClientName={() => "Nama Client Yang Sangat Panjang Sekali Sampai Melebihi Kolom"} />)
  );

  const grids = [...el.querySelectorAll('[data-testid="weekly-calendar-grid"] .grid')];
  const templates = new Set(grids.map((g) => g.style.gridTemplateColumns));
  expect(grids.length).toBeGreaterThan(5);
  expect(templates.size).toBe(1);
  expect([...templates][0]).toContain("minmax(0, 1fr)");
  // Semua sesi tetap tampil (tidak disembunyikan)
  expect(el.querySelectorAll('[data-testid^="calendar-session-"]').length).toBe(6);
  act(() => root.unmount());
});

test("sesi terapis yang sama di jam overlap ditandai bentrok; terapis lain tidak", async () => {
  const weekStart = new Date("2026-09-28T00:00:00");
  const mk = (id, therapistId, startTime, endTime) => ({ id, clientId: id, therapistId, date: "2026-10-01", startTime, endTime, type: "therapy", status: "scheduled" });
  const schedules = [mk("a", "t-1", "09:00", "10:00"), mk("b", "t-1", "09:30", "10:30"), mk("c", "t-2", "09:00", "10:00"), mk("d", "t-1", "11:00", "12:00")];
  const el = document.createElement("div");
  const root = createRoot(el);
  await act(async () => root.render(<WeeklyCalendar weekStart={weekStart} schedules={schedules} getClientName={() => "Client"} />));

  const conflict = (id) => el.querySelector(`[data-testid="calendar-session-${id}"]`).getAttribute("data-conflict");
  expect(conflict("a")).toBe("true");
  expect(conflict("b")).toBe("true");
  expect(conflict("c")).toBeNull();
  expect(conflict("d")).toBeNull();
  act(() => root.unmount());
});
