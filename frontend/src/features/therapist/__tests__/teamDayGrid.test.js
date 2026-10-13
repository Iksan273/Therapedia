// @vitest-environment jsdom
// Kalender tim tampilan HARI: satu kalender berisi semua terapis (kolom per terapis), nama client tampil.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { TeamDayGrid } from "@/shared/components/TeamDayGrid";

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

test("TeamDayGrid: onSessionClick membuat sesi bisa diklik (Weekly Calendar admin)", async () => {
  const clicked = [];
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const therapists = [{ id: "t1", name: "Terapis Satu", specialty: "OT" }];
  const schedules = [{ id: "a", therapistId: "t1", clientId: "c1", date: "2026-10-22", startTime: "09:00", endTime: "10:00", status: "scheduled", type: "therapy" }];
  await act(async () => root.render(<TeamDayGrid day={new Date(2026, 9, 22)} therapists={therapists} schedules={schedules} getClientName={() => "Aira"} onSessionClick={(s) => clicked.push(s.id)} />));
  await act(async () => container.querySelector('[data-testid="team-session-a"]').click());
  expect(clicked).toEqual(["a"]);
  act(() => root.unmount());
  container.remove();
});

test("TeamDayGrid: jam bawaan 09:00–18:00 dan melebar mengikuti sesi hari itu; area scroll tersedia", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const therapists = [{ id: "t1", name: "Terapis Satu", specialty: "OT" }];
  const render = (schedules) => act(async () => root.render(<TeamDayGrid day={new Date(2026, 9, 22)} therapists={therapists} schedules={schedules} getClientName={() => "Aira"} />));

  await render([]);
  expect(container.querySelector('[data-testid="team-hour-09:00"]')).toBeTruthy();
  expect(container.querySelector('[data-testid="team-hour-17:00"]')).toBeTruthy();
  expect(container.querySelector('[data-testid="team-hour-08:00"]')).toBeNull();
  expect(container.querySelector('[data-testid="team-hour-18:00"]')).toBeNull();
  expect(container.querySelector('[data-testid="team-day-scroll"]').className).toContain("overflow-auto");

  await render([{ id: "e", therapistId: "t1", clientId: "c1", date: "2026-10-22", startTime: "08:00", endTime: "09:00", status: "scheduled", type: "therapy" }, { id: "l", therapistId: "t1", clientId: "c1", date: "2026-10-22", startTime: "18:00", endTime: "19:00", status: "scheduled", type: "therapy" }]);
  expect(container.querySelector('[data-testid="team-hour-08:00"]')).toBeTruthy();
  expect(container.querySelector('[data-testid="team-hour-18:00"]')).toBeTruthy();
  act(() => root.unmount());
  container.remove();
});
