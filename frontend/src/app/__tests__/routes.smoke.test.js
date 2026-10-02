// @vitest-environment jsdom
// Smoke test: setiap route utama dirender dengan role yang sesuai tanpa crash / error boundary.
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { STORAGE_PREFIX } from "@/services/storage/localStore";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// API browser yang tidak ada di jsdom
beforeAll(() => {
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  window.ResizeObserver = window.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
  window.scrollTo = () => {};
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
});

const CASES = [
  { role: { role: "master", staffName: "Master" }, paths: ["/master/revenue", "/master/branch-performance", "/master/users", "/master/rbac", "/master/audit-logs", "/finance"] },
  { role: { role: "admin_inquiry", staffName: "Rina", branchId: "branch-sby-timur" }, paths: ["/admin-inquiry", "/admin-inquiry/pipeline", "/admin-inquiry/pipeline/c-009", "/admin-inquiry/assessments", "/admin-inquiry/master-data", "/admin-inquiry/parent-assessment/c-009"] },
  { role: { role: "admin_schedule", staffName: "Fajar", branchId: "branch-sby-timur" }, paths: ["/admin-schedule", "/admin-schedule/calendar", "/admin-schedule/clients", "/admin-schedule/clients/c-009"] },
  { role: { role: "therapist", therapistId: "t-001", staffName: "Maya", branchId: "branch-sby-timur" }, paths: ["/therapist", "/therapist/summary", "/therapist/clients/c-009", "/print/client/c-009"] },
  { role: { role: "client", clientId: "c-009" }, paths: ["/client"] },
  { role: { role: "manager", branchId: "branch-sby-timur", staffName: "Manager" }, paths: ["/manager/revenue", "/manager/audit-logs"] },
  { role: null, paths: ["/", "/roles", "/login", "/assessment"] },
];

const waitFor = async (check, timeout = 8000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (check()) return true;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 25));
    });
  }
  return false;
};

describe.each(CASES)("role $role.role", ({ role, paths }) => {
  test.each(paths)("render %s", async (path) => {
    window.localStorage.clear();
    window.localStorage.setItem(STORAGE_PREFIX + "auth", JSON.stringify({ therapistId: null, clientId: null, branchId: null, staffName: null, ...(role || { role: null }) }));
    await ensureSeedsIfNeeded();
    window.history.pushState({}, "", path);

    const errors = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args) => errors.push(args.map(String).join(" ")));
    const { default: App } = await import("@/app/App");
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<App />);
    });
    // Tunggu chunk lazy selesai (skeleton hilang) lalu pastikan masih di path yang sama (tidak di-redirect guard)
    const loaded = await waitFor(() => container.textContent.length > 0 && !container.querySelector('[aria-busy="true"]'));
    const finalPath = window.location.pathname;

    act(() => root.unmount());
    container.remove();
    spy.mockRestore();

    expect(loaded).toBe(true);
    expect(finalPath).toBe(path);
    expect(errors.filter((e) => !/act\(|not wrapped|Warning:/.test(e))).toEqual([]);
  }, 20000);
});
