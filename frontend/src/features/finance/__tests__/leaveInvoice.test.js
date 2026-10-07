// @vitest-environment jsdom
// Invoice cuti diterbitkan Finance (nominal manual), opsional tertaut ke log cuti; lunas tanpa efek kredit/paket.
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { useCredits } from "@/stores/creditsStore";
import { useLeaves } from "@/stores/leavesStore";
import { LeaveDetailDialog } from "@/features/finance/components/leave/LeaveDetailDialog";
import { invoiceType, invoicesOfLeave, invoiceTypeLabel } from "@/domain/credit";
import { leaveOptionLabel, linkableLeaves } from "@/domain/leave";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe({ detail }) {
  ctx = { credits: useCredits(), leaves: useLeaves() };
  return detail ? <LeaveDetailDialog leave={ctx.leaves.leaves.find((l) => l.id === detail)} clientName="Uji" open onOpenChange={() => {}} /> : null;
}
let root;
let container;
const mount = async (detail) => {
  window.localStorage.clear();
  await ensureSeedsIfNeeded();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<AppProviders><Probe detail={detail} /></AppProviders>));
};
beforeAll(() => { window.ResizeObserver = window.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} }; });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

const issue = (leave, extra = {}) =>
  ctx.credits.issueInvoice({ clientId: leave.clientId, clientName: "Uji", branchId: leave.branchId, type: "leave", typeCode: "CUT", packageName: "Cuti", amount: 300000, leaveId: leave.id, by: "Finance Uji", ...extra });

test("invoice cuti tertaut log: nominal manual, unpaid, nomor CUT; lunas tanpa membuat paket", async () => {
  await mount();
  const leave = ctx.leaves.leaves.find((l) => l.id === "lv-seed-1"); // log cuti aktif dari seed
  const before = (ctx.credits.getRawRecord(leave.clientId)?.packages || []).length;
  await act(async () => { issue(leave); });
  const inv = ctx.credits.getInvoicesForClient(leave.clientId).find((i) => i.leaveId === leave.id);
  expect(inv).toMatchObject({ type: "leave", status: "unpaid", amount: 300000, credits: 0, leaveId: leave.id });
  expect(inv.invoiceNumber).toMatch(/^INV-CUT-/);
  expect(invoiceType(inv)).toBe("leave");
  expect(invoiceTypeLabel(inv)).toBe("Cuti");
  expect(invoicesOfLeave(ctx.credits.getAllInvoices(), leave.id).map((i) => i.id)).toEqual([inv.id]);

  await act(async () => ctx.credits.verifyPaymentProof({ invoiceId: inv.id, status: "paid", by: "Finance Uji" }));
  expect(ctx.credits.getInvoicesForClient(leave.clientId).find((i) => i.id === inv.id).status).toBe("paid");
  expect((ctx.credits.getRawRecord(leave.clientId)?.packages || []).length).toBe(before); // tanpa paket/kredit baru
});

test("invoice cuti boleh mandiri (tanpa hubungan) dan langsung lunas; void tidak ikut dihitung sebagai terkait", async () => {
  await mount();
  const leave = ctx.leaves.leaves.find((l) => l.id === "lv-seed-1");
  await act(async () => { issue(leave, { leaveId: null, paidDirect: true, amount: 150000 }); });
  const standalone = ctx.credits.getInvoicesForClient(leave.clientId).find((i) => i.type === "leave" && !i.leaveId);
  expect(standalone).toMatchObject({ status: "paid", amount: 150000, leaveId: null });
  expect(invoicesOfLeave(ctx.credits.getAllInvoices(), leave.id)).toEqual([]);
});

test("log yang bisa disambungkan: belum di-void, terbaru dulu; label ringkas", async () => {
  await mount();
  const all = ctx.leaves.leaves;
  const opts = linkableLeaves(all, "c-033"); // seed: selesai lebih awal
  expect(opts.map((l) => l.id)).toEqual(["lv-seed-2"]);
  expect(linkableLeaves(all, "c-044")).toEqual([]); // hanya yang di-void
  expect(leaveOptionLabel(opts[0], (d) => d)).toMatch(/hari • Selesai lebih awal$/);
});

test("Detail cuti menampilkan invoice yang tertaut", async () => {
  await mount("lv-seed-1");
  await act(async () => { issue(ctx.leaves.leaves.find((l) => l.id === "lv-seed-1")); });
  const section = document.querySelector('[data-testid="leave-detail-invoices"]');
  expect(section.textContent).toMatch(/INV-CUT-/);
  expect(section.textContent).toContain("Invoice cuti terkait (1)");
});
