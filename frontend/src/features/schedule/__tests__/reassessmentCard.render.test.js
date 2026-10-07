// @vitest-environment jsdom
// Kartu Re-assessment tampil di detail client aktif (Admin Schedule) lengkap dengan tombol terbitkan kode & jadwalkan asesmen.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { STORAGE_PREFIX } from "@/services/storage/localStore";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  window.ResizeObserver = window.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
  window.scrollTo = () => {};
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
});

test("detail client aktif: kartu Re-assessment + tombol di header", async () => {
  window.localStorage.clear();
  window.localStorage.setItem(STORAGE_PREFIX + "auth", JSON.stringify({ therapistId: null, clientId: null, branchId: "branch-sby-timur", staffName: "Fajar", role: "admin_schedule" }));
  await ensureSeedsIfNeeded();
  window.history.pushState({}, "", "/admin-schedule/clients/c-009");
  const { default: App } = await import("@/app/App");
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<App />));
  for (let i = 0; i < 400 && !container.querySelector('[data-testid="reassessment-card"]'); i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 25)); });
  }
  expect(container.querySelector('[data-testid="goto-reassessment"]')).toBeTruthy();
  expect(container.querySelector('[data-testid="reassessment-card"]')).toBeTruthy();
  expect(container.querySelector('[data-testid="reassessment-issue-code"]')).toBeTruthy();
  expect(container.querySelector('[data-testid="reassessment-schedule-button"]')).toBeTruthy();
  act(() => root.unmount());
  container.remove();
}, 60000);
