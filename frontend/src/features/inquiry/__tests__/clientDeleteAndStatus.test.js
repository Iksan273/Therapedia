// @vitest-environment jsdom
// Hapus client (permanen + cascade sesi & invoice), ubah status manual, dan tombol hapus (operasional = akses modul, data penting = master).
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { useClientOutcomeActions, useClientDeleteActions } from "@/features/inquiry";
import { DeleteButton } from "@/shared/components/DeleteControls";
import { useClients } from "@/stores/clientsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { useAuth } from "@/stores/authStore";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = {
    outcome: useClientOutcomeActions(),
    del: useClientDeleteActions(),
    clients: useClients(),
    schedules: useSchedules(),
    credits: useCredits(),
    auth: useAuth(),
  };
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
  await act(async () => root.render(<AppProviders><Probe /><DeleteButton module="finance" label="Hapus Uji" testId="probe-delete" onConfirm={() => {}} /><DeleteButton module="finance" masterOnly label="Hapus Penting" testId="probe-delete-critical" onConfirm={() => {}} /></AppProviders>));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

test("hapus client: client, sesi, dan invoice-nya hilang dari semua daftar (permanen)", async () => {
  const client = ctx.clients.clients.find((c) => ctx.schedules.schedules.some((s) => s.clientId === c.id) && ctx.credits.getInvoicesForClient(c.id).length > 0);
  expect(client).toBeTruthy();
  const sessions = ctx.schedules.schedules.filter((s) => s.clientId === client.id).length;
  const invoices = ctx.credits.getInvoicesForClient(client.id).length;

  await act(async () => ctx.auth.login({ role: "master", staffName: "Master Uji" }));
  let result;
  await act(async () => { result = ctx.del.deleteClientCascade(client); });
  expect(result).toEqual({ sessions, invoices });

  expect(ctx.clients.getClient(client.id)).toBeUndefined();
  expect(ctx.clients.clients.some((c) => c.id === client.id)).toBe(false);
  expect(ctx.schedules.schedules.some((s) => s.clientId === client.id)).toBe(false);
  expect(ctx.credits.getInvoicesForClient(client.id)).toHaveLength(0);
  expect(ctx.credits.getAllInvoices().some((i) => i.clientId === client.id)).toBe(false);
});

test("changeStatus: kembali ke tahap awal dan ke discontinued mencatat tanggalnya", async () => {
  const client = ctx.clients.clients.find((c) => c.status === "admitted");
  await act(async () => ctx.outcome.changeStatus(client, "assessment_done"));
  expect(ctx.clients.getClient(client.id)).toMatchObject({ status: "assessment_done", finalOutcome: null });

  await act(async () => ctx.outcome.changeStatus(ctx.clients.getClient(client.id), "discontinued", { reason: "pindah kota" }));
  const after = ctx.clients.getClient(client.id);
  expect(after).toMatchObject({ status: "discontinued", dischargeNote: "pindah kota" });
  expect(after.dateOfDiscontinue).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  let same;
  await act(async () => { same = ctx.outcome.changeStatus(after, "discontinued"); });
  expect(same).toEqual({ changed: false });
});

test("discontinue memakai dateOfDiscontinue (bukan dateOfDischarge)", async () => {
  const client = ctx.clients.clients.find((c) => c.status === "assessment_done");
  await act(async () => ctx.outcome.discontinue(client, "Biaya"));
  const after = ctx.clients.getClient(client.id);
  expect(after.dateOfDiscontinue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(after.dateOfDischarge).toBeNull();
});

test("hapus operasional mengikuti akses modul; hapus data penting hanya master", async () => {
  const visible = (id) => Boolean(container.querySelector(`[data-testid="${id}"]`));

  await act(async () => ctx.auth.login({ role: "master", staffName: "Master" }));
  expect(visible("probe-delete")).toBe(true);
  expect(visible("probe-delete-critical")).toBe(true);

  // finance punya akses modul finance: hapus operasional boleh, hapus data penting tidak
  await act(async () => ctx.auth.login({ role: "finance", branchId: "branch-sby-timur" }));
  expect(visible("probe-delete")).toBe(true);
  expect(visible("probe-delete-critical")).toBe(false);

  // admin_inquiry tidak punya akses modul finance → keduanya tersembunyi
  await act(async () => ctx.auth.login({ role: "admin_inquiry", branchId: "branch-sby-timur" }));
  expect(visible("probe-delete")).toBe(false);
  expect(visible("probe-delete-critical")).toBe(false);
});
