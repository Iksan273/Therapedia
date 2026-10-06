// @vitest-environment jsdom
// Finance mengunggah / mengganti bukti manual: tanpa batas ortu (4x), juga untuk invoice lunas, tidak untuk void.
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { useCredits } from "@/stores/creditsStore";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = useCredits();
  return null;
}

let root;
beforeEach(async () => {
  window.localStorage.clear();
  await ensureSeedsIfNeeded();
  root = createRoot(document.createElement("div"));
  await act(async () => root.render(<AppProviders><Probe /></AppProviders>));
});
afterEach(() => act(() => root.unmount()));

const proof = (n) => ({ proofUrl: `data:image/jpeg;base64,${n}`, fileName: `m${n}.jpg`, fileType: "image/jpeg", fileSize: 10 });

test("Finance upload bukti baru lalu ganti berkali-kali (melewati batas 4x ortu); tercatat di log invoice", async () => {
  await act(async () => ctx.issueInvoice({ clientId: "c-001", clientName: "X", branchId: "branch-sby-timur", type: "assessment", typeCode: "ASM", packageName: "Assessment", amount: 100000, by: "Finance" }));
  const id = ctx.getAllInvoices()[0].id;
  for (let n = 1; n <= 6; n += 1) {
    await act(async () => ctx.uploadPaymentProof({ invoiceId: id, ...proof(n), byFinance: true, by: "Dewi" }));
  }
  const inv = ctx.getAllInvoices().find((i) => i.id === id);
  expect(inv.proofUploadCount).toBe(6);
  expect(inv.proofUrl).toContain("base64,6");
  expect(inv.status).toBe("unpaid");
  expect(JSON.stringify(inv.logs || [])).toMatch(/oleh Finance/);
});

test("upload ortu tetap dibatasi 4x", async () => {
  await act(async () => ctx.issueInvoice({ clientId: "c-001", clientName: "X", branchId: "branch-sby-timur", type: "assessment", typeCode: "ASM", packageName: "Assessment", amount: 100000, by: "Finance" }));
  const id = ctx.getAllInvoices()[0].id;
  for (let n = 1; n <= 6; n += 1) await act(async () => ctx.uploadPaymentProof({ invoiceId: id, ...proof(n) }));
  expect(ctx.getAllInvoices().find((i) => i.id === id).proofUploadCount).toBe(4);
});
