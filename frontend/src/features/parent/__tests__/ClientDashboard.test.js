// @vitest-environment jsdom
// Portal ortu: View Report nonaktif bila laporan kosong, daftar kuesioner belum diisi, dan invoice assessment menahan akses.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import ClientDashboard from "@/features/parent/pages/ClientDashboard";
import { useClients } from "@/stores/clientsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { useAuth } from "@/stores/authStore";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = { clients: useClients(), schedules: useSchedules(), credits: useCredits(), auth: useAuth() };
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
  await act(async () =>
    root.render(
      <AppProviders>
        <Probe />
        <MemoryRouter>
          <ClientDashboard />
        </MemoryRouter>
      </AppProviders>
    )
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const q = (id) => container.querySelector(`[data-testid="${id}"]`);

test("View Report nonaktif untuk sesi completed tanpa laporan, aktif bila laporan terisi", async () => {
  const completed = ctx.schedules.schedules.filter((s) => s.status === "completed");
  const clientId = completed.map((s) => s.clientId).find((id) => completed.filter((s) => s.clientId === id).length >= 2);
  // Urutan tampil di portal: terbaru dulu; dua sesi teratas dipakai agar pasti ada di halaman pertama
  const [first, second] = completed
    .filter((s) => s.clientId === clientId)
    .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
  await act(async () => ctx.schedules.updateSchedule(first.id, { activitySection: "", noteSection: "", homeworkSection: "", progressNote: "" }));
  await act(async () => ctx.schedules.updateSchedule(second.id, { activitySection: "Latihan keseimbangan", noteSection: "", homeworkSection: "", progressNote: "" }));
  await act(async () => ctx.auth.login({ role: "client", clientId }));

  expect(q(`view-report-${first.id}`).disabled).toBe(true);
  expect(q(`report-pending-${first.id}`)).toBeTruthy();
  expect(q(`export-report-${first.id}`).disabled).toBe(true);
  expect(q(`view-report-${second.id}`).disabled).toBe(false);
  expect(q(`report-pending-${second.id}`)).toBeNull();
  expect(q(`export-report-${second.id}`).disabled).toBe(false);
});

test("kuesioner belum diisi tampil; invoice assessment belum lunas mengunci, lunas membuka", async () => {
  const client = ctx.clients.clients.find((c) => c.status === "service_selected" || c.status === "assessment_scheduled");
  const code = { code: "SP2-ABC234", categoryId: "cat-001", name: "Child Sensory Profile 2", status: "issued", expiresAt: null };
  await act(async () => ctx.clients.updateClient(client.id, { assessmentCodes: [code], assessmentAnswers: [] }));
  await act(async () => ctx.auth.login({ role: "client", clientId: client.id }));

  expect(q("parent-questionnaires-card")).toBeTruthy();
  expect(q("fill-questionnaire-SP2-ABC234")).toBeTruthy();
  expect(q("questionnaire-locked-SP2-ABC234")).toBeNull();

  // Finance menerbitkan invoice assessment → kuesioner terkunci
  await act(async () =>
    ctx.credits.issueInvoice({ clientId: client.id, clientName: client.clientName, branchId: client.branchId, type: "assessment", typeCode: "ASM", packageName: "Assessment", credits: 0, amount: 350000 })
  );
  expect(q("questionnaire-locked-SP2-ABC234")).toBeTruthy();
  expect(q("fill-questionnaire-SP2-ABC234")).toBeNull();
  expect(container.textContent).toMatch(/INV-ASM-/);

  // Finance memverifikasi pembayaran → kuesioner terbuka lagi
  const invoice = ctx.credits.getInvoicesForClient(client.id).find((i) => i.type === "assessment");
  await act(async () => ctx.credits.verifyPaymentProof({ invoiceId: invoice.id, status: "paid" }));
  expect(q("questionnaire-locked-SP2-ABC234")).toBeNull();
  expect(q("fill-questionnaire-SP2-ABC234")).toBeTruthy();
  // invoice assessment tidak membuat paket kredit
  expect((ctx.credits.getRecordForClient(client.id)?.packages || []).some((p) => p.packageName === "Assessment")).toBe(false);
});

test("kode kedaluwarsa tidak bisa dibuka dari portal ortu", async () => {
  const client = ctx.clients.clients.find((c) => c.status === "service_selected" || c.status === "assessment_scheduled");
  const expired = { code: "SP2-OLD234", categoryId: "cat-001", name: "Child Sensory Profile 2", status: "issued", expiresAt: "2020-01-01T00:00:00.000Z" };
  await act(async () => ctx.clients.updateClient(client.id, { assessmentCodes: [expired], assessmentAnswers: [] }));
  await act(async () => ctx.auth.login({ role: "client", clientId: client.id }));
  expect(q("questionnaire-locked-SP2-OLD234")).toBeTruthy();
  expect(q("fill-questionnaire-SP2-OLD234")).toBeNull();
});
