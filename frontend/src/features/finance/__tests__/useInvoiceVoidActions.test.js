// @vitest-environment jsdom
// Void invoice lunas (hanya bila kredit belum terpakai, kredit selalu dipertahankan), refund sisa kredit, invoice pengganti memakai ulang paket, hapus invoice belum lunas.
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { useInvoiceVoidActions } from "@/features/finance/hooks/useInvoiceVoidActions";
import { useInvoiceRefundActions } from "@/features/finance/hooks/useInvoiceRefundActions";
import { usePackageActivationActions } from "@/features/finance/hooks/usePackageActivationActions";
import { useCredits } from "@/stores/creditsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useAuth } from "@/stores/authStore";
import { newCreditRecord, revenueMetrics } from "@/domain/credit";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = { void: useInvoiceVoidActions(), refund: useInvoiceRefundActions(), act: usePackageActivationActions(), credits: useCredits(), schedules: useSchedules(), auth: useAuth() };
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
  await act(async () => ctx.auth.login({ role: "finance", staffName: "Finance Uji" }));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const CLIENT = "c-void";
const renew = (credits = 10) =>
  ctx.act.renewDirect({
    clientId: CLIENT, clientName: "Uji", branchId: "branch-sby-timur", packageId: "pkg-reguler", packageName: `Regular Therapist (${credits}x)`,
    typeCode: "REG", credits, amount: 2500000, reason: "Tunai", justification: "Dibayar tunai di kasir",
  });
const session = (id, patch = {}) => ({
  id, clientId: CLIENT, therapistId: "t-1", branchId: "branch-sby-timur", type: "therapy", status: "scheduled",
  date: "2099-01-05", startTime: "09:00", endTime: "10:00", ...patch,
});
const invoices = () => ctx.credits.getAllInvoices().filter((i) => i.clientId === CLIENT);
const sessionOf = (id) => ctx.schedules.schedules.find((s) => s.id === id);

test("void harus punya alasan", async () => {
  await act(async () => { renew(); });
  const inv = invoices()[0];
  expect(ctx.void.voidInvoiceAction(inv, { reason: "" }).ok).toBe(false);
  expect(invoices()[0].status).toBe("paid");
});

test("void (kredit belum terpakai): invoice void, paket & jadwal utuh, kredit dipertahankan", async () => {
  await act(async () => { renew(); });
  const inv = invoices()[0];
  const pkg = ctx.credits.getRawRecord(CLIENT).packages[0];
  await act(async () => ctx.schedules.addSchedules([session("s-up", { creditPackageId: pkg.id })]));
  expect(ctx.void.previewVoid(inv).voidBlocked).toBeNull();

  let res;
  await act(async () => { res = ctx.void.voidInvoiceAction(inv, { reason: "Nominal salah ketik" }); });
  expect(res.ok).toBe(true);

  expect(invoices()[0]).toMatchObject({ status: "void", voidReason: "Nominal salah ketik", voidCreditAction: "keep" });
  const after = ctx.credits.getRawRecord(CLIENT).packages[0];
  expect(after).toMatchObject({ remainingCredit: 10, status: "active" });
  expect(sessionOf("s-up").creditPackageId).toBe(pkg.id);
});

test("void ditolak bila kredit invoice sudah terpakai", async () => {
  await act(async () => { renew(); });
  const inv = invoices()[0];
  const pkg = ctx.credits.getRawRecord(CLIENT).packages[0];
  await act(async () => ctx.credits.spendPackageCredit({ clientId: CLIENT, packageId: pkg.id, scheduleId: "s-used", date: "2026-10-01", by: "Admin" }));
  expect(ctx.void.previewVoid(inv).voidBlocked).toMatch(/sudah terpakai/);
  let res;
  await act(async () => { res = ctx.void.voidInvoiceAction(inv, { reason: "Salah input" }); });
  expect(res.ok).toBe(false);
  expect(invoices()[0].status).toBe("paid");
});

test("refund tanpa paket aktif lain: sisa kredit dinolkan, jadwal mendatang Frozen, nominal otomatis; revenue verified berkurang, gross tetap", async () => {
  await act(async () => { renew(); });
  const inv = invoices()[0];
  const pkg = ctx.credits.getRawRecord(CLIENT).packages[0];
  await act(async () => ctx.credits.spendPackageCredit({ clientId: CLIENT, packageId: pkg.id, scheduleId: "s-used", date: "2026-10-01", by: "Admin" }));
  await act(async () =>
    ctx.schedules.addSchedules([session("s-up", { creditPackageId: pkg.id }), session("s-done", { status: "completed", date: "2020-01-01", creditPackageId: pkg.id })])
  );

  const plan = ctx.refund.previewRefund(inv);
  expect(plan).toMatchObject({ ok: true, credits: 9, suggestedAmount: 2250000 });
  expect(ctx.refund.refundInvoiceAction(inv, { amount: 0, reason: "x" }).ok).toBe(false);
  expect(ctx.refund.refundInvoiceAction(inv, { amount: 2250000, reason: "" }).ok).toBe(false);

  let res;
  await act(async () => { res = ctx.refund.refundInvoiceAction(inv, { amount: 2000000, reason: "Pindah kota" }); }); // Finance menyesuaikan nominal
  expect(res).toMatchObject({ ok: true, credits: 9, relinked: 0, frozen: 1 });

  expect(invoices()[0]).toMatchObject({ status: "paid", refundAmount: 2000000, refundReason: "Pindah kota", refundCredits: 9 });
  expect(invoices()[0].logs.at(-1)).toMatchObject({ action: "refunded" });
  const rec = ctx.credits.getRawRecord(CLIENT);
  expect(rec.packages[0]).toMatchObject({ remainingCredit: 0, status: "voided", refunded: true });
  expect(rec.history.at(-1)).toMatchObject({ action: "refund", creditChange: -9 });
  expect(sessionOf("s-up").creditPackageId).toBeNull();
  expect(sessionOf("s-done").creditPackageId).toBe(pkg.id);

  expect(revenueMetrics(invoices())).toMatchObject({ grossRevenue: 2500000, refundTotal: 2000000, verifiedRevenue: 500000 });
  expect(ctx.refund.refundInvoiceAction(invoices()[0], { amount: 100, reason: "lagi" }).ok).toBe(false); // sekali per invoice
  expect(ctx.void.previewVoid(invoices()[0]).voidBlocked).toMatch(/direfund/);
});

test("refund dengan paket aktif lain: jadwal mendatang pindah ke paket itu", async () => {
  await act(async () => { renew(10); });
  await act(async () => { renew(5); });
  const [first, second] = ctx.credits.getRawRecord(CLIENT).packages;
  const firstInvoice = invoices().find((i) => i.id === first.invoiceId);
  await act(async () => ctx.schedules.addSchedules([session("s-up", { creditPackageId: first.id })]));

  let res;
  await act(async () => { res = ctx.refund.refundInvoiceAction(firstInvoice, { amount: 2500000, reason: "Pembayaran batal" }); });
  expect(res).toMatchObject({ ok: true, relinked: 1, frozen: 0 });
  expect(sessionOf("s-up").creditPackageId).toBe(second.id);
  expect(ctx.credits.getRawRecord(CLIENT).packages.find((p) => p.id === second.id).remainingCredit).toBe(5);
});

test("invoice pengganti: paket lama dipakai ulang, kredit tidak dobel", async () => {
  await act(async () => { renew(10); });
  const old = invoices()[0];
  const pkg = ctx.credits.getRawRecord(CLIENT).packages[0];
  await act(async () => { ctx.void.voidInvoiceAction(old, { reason: "Nominal salah" }); });

  await act(async () =>
    ctx.credits.issueInvoice({
      clientId: CLIENT, clientName: "Uji", branchId: "branch-sby-timur", type: "package", typeCode: "REG", packageId: "pkg-reguler",
      packageName: "Regular Therapist (10x)", credits: 10, amount: 2400000, replacesInvoiceId: old.id, by: "Finance Uji",
    })
  );
  const fresh = invoices().find((i) => i.replacesInvoiceId === old.id);
  expect(fresh).toBeTruthy();

  let res;
  await act(async () => { res = ctx.act.approvePackagePayment(fresh, {}); });
  expect(res.reused).toBe(true);

  const rec = ctx.credits.getRawRecord(CLIENT);
  expect(rec.packages).toHaveLength(1);
  expect(rec.packages[0]).toMatchObject({ id: pkg.id, invoiceId: fresh.id, remainingCredit: 10 });
  expect(invoices().find((i) => i.id === fresh.id).status).toBe("paid");
});

test("hapus invoice: hanya yang belum lunas; saldo lebihan yang dipakai kembali", async () => {
  await act(async () => { renew(); });
  const paid = invoices()[0];
  await act(async () => ctx.credits.deleteInvoices([paid.id]));
  expect(invoices().some((i) => i.id === paid.id)).toBe(true); // lunas tidak terhapus

  await act(async () => ctx.credits.addRecord({ ...newCreditRecord({ clientId: "c-bal", branchId: "branch-sby-timur" }), balance: 100000 }));
  await act(async () =>
    ctx.credits.issueInvoice({
      clientId: "c-bal", clientName: "Saldo", branchId: "branch-sby-timur", type: "package", typeCode: "REG", packageId: "pkg-reguler",
      packageName: "Regular Therapist (10x)", credits: 10, amount: 500000, by: "Finance Uji",
    })
  );
  const unpaid = ctx.credits.getAllInvoices().find((i) => i.clientId === "c-bal");
  expect(unpaid.balanceApplied).toBe(100000);
  expect(ctx.credits.getRawRecord("c-bal").balance).toBe(0);

  await act(async () => ctx.credits.deleteInvoices([unpaid.id]));
  expect(ctx.credits.getAllInvoices().some((i) => i.id === unpaid.id)).toBe(false);
  expect(ctx.credits.getRawRecord("c-bal").balance).toBe(100000);
});

test("renewal langsung yang menggantikan invoice void: paket lama dipakai ulang, tanpa kredit baru", async () => {
  await act(async () => { renew(10); });
  const old = invoices()[0];
  const pkg = ctx.credits.getRawRecord(CLIENT).packages[0];
  await act(async () => { ctx.void.voidInvoiceAction(old, { reason: "Nominal salah" }); });

  let res;
  await act(async () => {
    res = ctx.act.renewDirect({
      replacesInvoiceId: old.id, clientId: CLIENT, clientName: "Uji", branchId: "branch-sby-timur", packageId: "pkg-reguler",
      packageName: "Regular Therapist (10x)", typeCode: "REG", credits: 10, amount: 2400000, reason: "Tunai", justification: "Dibayar tunai di kasir",
    });
  });
  expect(res).toMatchObject({ relinked: 0, reused: true });

  const rec = ctx.credits.getRawRecord(CLIENT);
  const fresh = invoices().find((i) => i.replacesInvoiceId === old.id);
  expect(fresh).toMatchObject({ status: "paid", isRenewal: true });
  expect(rec.packages).toHaveLength(1);
  expect(rec.packages[0]).toMatchObject({ id: pkg.id, invoiceId: fresh.id, remainingCredit: 10 });
  expect(rec.history.filter((h) => h.action === "renewed")).toHaveLength(1); // hanya dari pembelian awal
});
