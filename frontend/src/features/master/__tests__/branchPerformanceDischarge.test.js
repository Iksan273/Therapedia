// @vitest-environment jsdom
// Performa Inquiry & Intake All-Branch: KPI Total Discharged + Report Discharge per Alasan.
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

test("master melihat Total Discharged dan Report Discharge per Alasan di performa all-branch", async () => {
  window.localStorage.clear();
  window.localStorage.setItem(STORAGE_PREFIX + "auth", JSON.stringify({ therapistId: null, clientId: null, branchId: null, staffName: "Master", role: "master" }));
  await ensureSeedsIfNeeded();
  window.history.pushState({}, "", "/master/branch-performance");
  const { default: App } = await import("@/app/App");
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<App />));
  for (let i = 0; i < 400 && !container.querySelector('[data-testid="discharge-report"]'); i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 25)); });
  }
  expect(container.querySelector('[data-testid="branch-kpi-discharged"]')).toBeTruthy();
  expect(container.querySelector('[data-testid="discharge-report"]')).toBeTruthy();
  const total = Number(container.querySelector('[data-testid="discharge-report-total"]').textContent.replace(/\D/g, ""));
  const kpi = Number(container.querySelector('[data-testid="branch-kpi-discharged"] p.text-2xl').textContent.replace(/\D/g, ""));
  expect(total).toBeGreaterThan(0); // seed punya client discharged
  expect(kpi).toBe(total); // KPI dan report konsisten
  act(() => root.unmount());
  container.remove();
}, 60000);
