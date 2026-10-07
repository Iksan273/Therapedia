// @vitest-environment jsdom
// Kalender tim tampilan HARI: satu kalender berisi semua terapis (kolom per terapis), nama client tampil.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { TeamDayGrid } from "@/features/therapist/components/TeamDayGrid";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test("TeamDayGrid: kolom per terapis dan sesi di jam yang benar", async () => {
  const therapists = [
    { id: "t1", name: "Terapis Satu", specialty: "OT" },
    { id: "t2", name: "Terapis Dua", specialty: "ST" },
  ];
  const schedules = [
    { id: "a", therapistId: "t1", clientId: "c1", date: "2026-10-22", startTime: "09:00", endTime: "10:00", status: "scheduled", type: "therapy" },
    { id: "b", therapistId: "t2", clientId: "c2", date: "2026-10-22", startTime: "13:00", endTime: "14:00", status: "completed", type: "therapy" },
  ];
  const names = { c1: "Aira", c2: "Bima" };
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<TeamDayGrid day={new Date(2026, 9, 22)} therapists={therapists} schedules={schedules} getClientName={(id) => names[id]} />));

  expect(container.querySelector('[data-testid="team-col-t1"]').textContent).toContain("Terapis Satu");
  expect(container.querySelector('[data-testid="team-col-t2"]').textContent).toContain("Terapis Dua");
  expect(container.querySelector('[data-testid="team-session-a"]').textContent).toContain("Aira");
  expect(container.querySelector('[data-testid="team-session-b"]').textContent).toContain("Bima");
  expect(container.querySelector('[data-testid="team-day-count"]').textContent).toContain("2 sesi");
  act(() => root.unmount());
  container.remove();
});
