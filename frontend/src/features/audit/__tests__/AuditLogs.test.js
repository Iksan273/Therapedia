// @vitest-environment jsdom
// Halaman Audit Logs: akses per role (RBAC) dan cakupan data per cabang.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { STORAGE_PREFIX } from "@/services/storage/localStore";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  window.ResizeObserver = window.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
  window.scrollTo = () => {};
});

async function renderAt(path, auth) {
  window.localStorage.clear();
  window.localStorage.setItem(STORAGE_PREFIX + "auth", JSON.stringify({ therapistId: null, clientId: null, branchId: null, staffName: null, ...auth }));
  await ensureSeedsIfNeeded();
  window.history.pushState({}, "", path);
  const { default: App } = await import("@/app/App");
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<App />));
  for (let i = 0; i < 200 && (!container.textContent || container.querySelector('[aria-busy="true"]')); i += 1) {
    await act(async () => new Promise((r) => setTimeout(r, 25)));
  }
  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

const rowsText = (container) => [...container.querySelectorAll('[data-testid^="audit-row-"]')].map((r) => r.textContent);

test("manager hanya melihat log cabangnya (tanpa log global)", async () => {
  const { container, cleanup } = await renderAt("/manager/audit-logs?period=all", { role: "manager", branchId: "branch-sby-timur", staffName: "Manager East" });
  expect(window.location.pathname).toBe("/manager/audit-logs");
  const rows = rowsText(container);
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.every((t) => t.includes("East"))).toBe(true);
  expect(rows.some((t) => t.includes("Global") || t.includes("Citraland"))).toBe(false);
  cleanup();
}, 20000);

test("master melihat log dari semua cabang", async () => {
  const { container, cleanup } = await renderAt("/master/audit-logs?period=all", { role: "master", staffName: "Master" });
  expect(window.location.pathname).toBe("/master/audit-logs");
  expect(Number(container.querySelector('[data-testid="audit-stat-total"]').textContent.replace(/\D/g, ""))).toBeGreaterThan(100);
  const rows = rowsText(container);
  const branchesSeen = ["East", "Citraland", "West"].filter((b) => rows.some((t) => t.includes(b)));
  expect(branchesSeen.length).toBeGreaterThan(1);
  cleanup();
}, 20000);

test("role tanpa modul audit_logs dialihkan ke /roles", async () => {
  const { cleanup } = await renderAt("/master/audit-logs", { role: "admin_inquiry", branchId: "branch-sby-timur", staffName: "Rina" });
  expect(window.location.pathname).toBe("/roles");
  cleanup();
}, 20000);
