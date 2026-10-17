// @vitest-environment jsdom
// New Intake: pilihan "Cabang Tujuan" hanya cabang AKTIF (master/akun semua cabang); akun terikat cabang hanya melihat cabangnya.
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import InquiryPipeline from "@/features/inquiry/pages/InquiryPipeline";
import { BRANCHES, DEFAULT_BRANCHES, syncBranches } from "@/domain/branch";
import { useAuth } from "@/stores/authStore";
import { useBranches } from "@/stores/branchesStore";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
globalThis.scrollTo = globalThis.scrollTo || (() => {});
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || (() => false);

let ctx;
function Probe() {
  ctx = { auth: useAuth(), branches: useBranches() };
  return null;
}

let root;
let container;
beforeEach(async () => {
  window.localStorage.clear();
  await ensureSeedsIfNeeded();
  syncBranches(DEFAULT_BRANCHES.map((b) => ({ ...b })));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  syncBranches(DEFAULT_BRANCHES.map((b) => ({ ...b })));
});

const mount = async (session) => {
  await act(async () => root.render(<AppProviders><Probe /><MemoryRouter><InquiryPipeline /></MemoryRouter></AppProviders>));
  await act(async () => ctx.auth.login(session));
  await act(async () => document.querySelector('[data-testid="add-new-intake-button"]').click());
  await act(async () => document.querySelector('[data-testid="intake-branch-select"]').click());
  await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
};
const optionTexts = () => [...document.querySelectorAll('[role="option"]')].map((o) => o.textContent);

test("master: cabang nonaktif tidak muncul di pilihan Cabang Tujuan", async () => {
  await act(async () => root.render(<AppProviders><Probe /><MemoryRouter><InquiryPipeline /></MemoryRouter></AppProviders>));
  await act(async () => ctx.branches.setBranchActive("branch-sby-barat", false, "Master Uji")); // nonaktifkan lewat store cabang (sumber BRANCHES)
  const inactiveName = BRANCHES.find((b) => b.id === "branch-sby-barat").name;
  expect(BRANCHES.find((b) => b.id === "branch-sby-barat").isActive).toBe(false);

  await mount({ role: "master", staffName: "Master Uji" });

  const texts = optionTexts();
  expect(texts.length).toBe(BRANCHES.filter((b) => b.isActive !== false).length);
  expect(texts.some((t) => t.includes(inactiveName))).toBe(false);
  expect(texts.some((t) => t.includes("East"))).toBe(true);
});

test("master: semua cabang aktif tampil", async () => {
  await mount({ role: "master", staffName: "Master Uji" });
  expect(optionTexts().length).toBe(BRANCHES.length);
});

test("akun terikat cabang: dropdown dikunci ke cabangnya saja", async () => {
  await mount({ role: "admin_inquiry", staffName: "Admin East", branchId: "branch-sby-timur", permissions: { inquiry_pipeline: true } });
  const trigger = document.querySelector('[data-testid="intake-branch-select"]');
  expect(trigger.disabled || trigger.getAttribute("data-disabled") !== null || trigger.hasAttribute("disabled")).toBe(true);
  expect(trigger.textContent).toContain("East");
});
