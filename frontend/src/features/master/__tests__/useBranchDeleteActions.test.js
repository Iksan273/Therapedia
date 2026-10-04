// @vitest-environment jsdom
// Hapus cabang permanen: client, sesi, invoice, kredit, staf, terapis, hari libur cabang itu hilang; cabang lain & master utuh.
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { useBranchDeleteActions } from "@/features/master/hooks/useBranchDeleteActions";
import { useBranches } from "@/stores/branchesStore";
import { useClients } from "@/stores/clientsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { useTherapists } from "@/stores/therapistsStore";
import { useAuth } from "@/stores/authStore";
import { BRANCHES } from "@/domain/branch";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = { del: useBranchDeleteActions(), branches: useBranches(), clients: useClients(), schedules: useSchedules(), credits: useCredits(), therapists: useTherapists(), auth: useAuth() };
  return null;
}

let root;
let container;
beforeEach(async () => {
  window.localStorage.clear();
  await ensureSeedsIfNeeded();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<AppProviders><Probe /></AppProviders>));
  await act(async () => ctx.auth.login({ role: "master", staffName: "Master Uji" }));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

test("hapus cabang: seluruh isinya terhapus, cabang lain dan akun master tetap", async () => {
  const target = ctx.branches.branches.find((b) => b.id === "branch-citraland");
  const other = ctx.branches.branches.find((b) => b.id === "branch-sby-timur");
  const impact = ctx.del.impactOf(target.id);
  expect(impact.clients).toBeGreaterThan(0);
  const otherClients = ctx.clients.clients.filter((c) => c.branchId === other.id).length;
  const otherSessions = ctx.schedules.schedules.filter((s) => s.branchId === other.id).length;
  const masterUsers = ctx.auth.staffUsers.filter((u) => u.role === "master").length;

  await act(async () => { ctx.del.deleteBranchCascade(target); });

  expect(ctx.branches.branches.some((b) => b.id === target.id)).toBe(false);
  expect(BRANCHES.some((b) => b.id === target.id)).toBe(false);
  expect(ctx.clients.clients.some((c) => c.branchId === target.id)).toBe(false);
  expect(ctx.schedules.schedules.some((s) => s.branchId === target.id)).toBe(false);
  expect(ctx.credits.getAllInvoices().some((i) => i.branchId === target.id)).toBe(false);
  expect((ctx.credits.credits.records || []).some((r) => r.branchId === target.id)).toBe(false);
  expect(ctx.therapists.therapists.some((t) => t.branchId === target.id)).toBe(false);
  expect(ctx.auth.staffUsers.some((u) => u.branchId === target.id)).toBe(false);

  expect(ctx.clients.clients.filter((c) => c.branchId === other.id)).toHaveLength(otherClients);
  expect(ctx.schedules.schedules.filter((s) => s.branchId === other.id)).toHaveLength(otherSessions);
  expect(ctx.auth.staffUsers.filter((u) => u.role === "master")).toHaveLength(masterUsers);
});
