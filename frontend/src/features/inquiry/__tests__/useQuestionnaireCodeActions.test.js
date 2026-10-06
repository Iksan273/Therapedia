// @vitest-environment jsdom
// Hapus kode kuesioner: hanya yang belum diisi ortu; status client tidak mundur.
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { useQuestionnaireCodeActions } from "@/features/inquiry/hooks/useQuestionnaireCodeActions";
import { useClients } from "@/stores/clientsStore";
import { useCredits } from "@/stores/creditsStore";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = { actions: useQuestionnaireCodeActions(), clients: useClients(), credits: useCredits() };
  return null;
}

let root;
beforeEach(async () => {
  window.localStorage.clear();
  await ensureSeedsIfNeeded();
  const el = document.createElement("div");
  root = createRoot(el);
  await act(async () => root.render(<AppProviders><Probe /></AppProviders>));
});
afterEach(() => act(() => root.unmount()));

const clientWith = (codes, extra = {}) => {
  const base = ctx.clients.clients.find((c) => c.status === "inquiry" || c.status === "service_selected");
  return { ...base, assessmentAnswers: [], assessmentCodes: codes, ...extra };
};

test("kode yang belum diisi dihapus, status client tetap", async () => {
  const issued = { code: "ASM-TEST1", categoryId: "cat-001", name: "Sensory Profile", status: "issued" };
  const keep = { code: "ASM-TEST2", categoryId: "cat-002", name: "School Companion", status: "issued" };
  const client = clientWith([issued, keep], { status: "assessment_scheduled" });
  await act(async () => ctx.clients.updateClient(client.id, { assessmentCodes: client.assessmentCodes, assessmentAnswers: [], status: "assessment_scheduled" }));

  const fresh = ctx.clients.getClient(client.id);
  let result;
  await act(async () => { result = ctx.actions.deleteCode(fresh, issued); });
  expect(result).toEqual({ deleted: true });

  const after = ctx.clients.getClient(client.id);
  expect(after.assessmentCodes.map((c) => c.code)).toEqual(["ASM-TEST2"]);
  expect(after.status).toBe("assessment_scheduled");

});

test("kode yang sudah diisi ortu tidak bisa dihapus", async () => {
  const submitted = { code: "ASM-TEST3", categoryId: "cat-001", name: "Sensory Profile", status: "submitted" };
  const client = clientWith([submitted]);
  await act(async () => ctx.clients.updateClient(client.id, { assessmentCodes: [submitted] }));

  let result;
  await act(async () => { result = ctx.actions.deleteCode(ctx.clients.getClient(client.id), submitted); });
  expect(result).toEqual({ deleted: false, reason: "filled" });
  expect(ctx.clients.getClient(client.id).assessmentCodes).toHaveLength(1);
});

test("terbit kode = otomatis membuat invoice assessment (unpaid) terhubung ke kode; hapus kode menghapus invoice-nya", async () => {
  const client = clientWith([]);
  await act(async () => ctx.clients.updateClient(client.id, { assessmentCodes: [], assessmentAnswers: [] }));
  const category = { id: "cat-001", categoryName: "Sensory Profile", typeCode: "SP2" };

  let item;
  await act(async () => { item = ctx.actions.issueCode(ctx.clients.getClient(client.id), category, { servicePackage: { id: "pkg-x", name: "Regular Therapist", price: 1750000 } }); });
  const invoices = ctx.credits.getInvoicesForClient(client.id).filter((i) => i.assessmentCode === item.code);
  expect(invoices).toHaveLength(1);
  expect(invoices[0]).toMatchObject({ type: "assessment", status: "unpaid", clientId: client.id });
  expect(invoices[0].amount).toBe(1750000); // harga layanan (master paket) yang dipilih
  expect(invoices[0].packageName).toMatch(/Regular Therapist/);
  expect(invoices[0].invoiceNumber).toMatch(/^INV-ASM-/);

  await act(async () => { ctx.actions.deleteCode(ctx.clients.getClient(client.id), item); });
  expect(ctx.credits.getInvoicesForClient(client.id).some((i) => i.assessmentCode === item.code)).toBe(false);
});
