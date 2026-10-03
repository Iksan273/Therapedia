// @vitest-environment jsdom
// Konversi paket Finance: ledger, kuota cancel, jadwal mendatang dihapus, log invoice, saldo lebihan memotong invoice berikutnya.
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { usePackageConversionActions } from "@/features/finance/hooks/usePackageConversionActions";
import { useCredits } from "@/stores/creditsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useAuth } from "@/stores/authStore";
import { useAudit } from "@/stores/auditStore";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = { conv: usePackageConversionActions(), credits: useCredits(), schedules: useSchedules(), auth: useAuth(), audit: useAudit() };
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

// Invoice lunas yang paketnya masih punya sisa + paket tujuan yang nilainya cukup.
const pickCase = () => {
  const targets = ctx.credits.getMasterPackages();
  for (const invoice of ctx.credits.getAllInvoices()) {
    if (!ctx.conv.canConvert(invoice)) continue;
    const target = targets.find((t) => t.id !== invoice.packageId && ctx.conv.previewConversion({ invoice, target: t }).ok);
    if (target) return { invoice, target };
  }
  return null;
};

test("konversi otomatis: paket lama converted, paket baru + saldo, log invoice, jadwal mendatang dihapus", async () => {
  const picked = pickCase();
  expect(picked).toBeTruthy();
  const { invoice, target } = picked;
  const before = ctx.credits.getRawRecord(invoice.clientId);
  const preview = ctx.conv.previewConversion({ invoice, target });
  const upcoming = ctx.conv.upcomingSchedules(invoice.clientId).length;

  let res;
  await act(async () => { res = ctx.conv.convertInvoicePackage({ invoice, target }); });
  expect(res).toMatchObject({ ok: true, deletedSchedules: upcoming });

  const after = ctx.credits.getRawRecord(invoice.clientId);
  expect(after.packages.filter((p) => p.status === "converted")).toHaveLength(before.packages.filter((p) => p.status === "converted").length + 1);
  const created = after.packages[after.packages.length - 1];
  expect(created).toMatchObject({ totalCredit: preview.sessions, remainingCredit: preview.sessions });
  expect(after.balance || 0).toBe((before.balance || 0) + preview.leftover);
  expect(ctx.conv.upcomingSchedules(invoice.clientId)).toHaveLength(0);

  const log = ctx.credits.getAllInvoices().find((i) => i.id === invoice.id).logs.at(-1);
  expect(log).toMatchObject({ action: "converted", by: "Finance Uji" });
  expect(ctx.audit.auditLogs.some((a) => a.action === "invoice.package_converted" && a.entityId === invoice.id)).toBe(true);
});

test("konversi manual wajib alasan dan tidak boleh melebihi nilai sisa", async () => {
  const { invoice, target } = pickCase();
  const max = ctx.conv.previewConversion({ invoice, target }).maxSessions;
  let res;
  await act(async () => { res = ctx.conv.convertInvoicePackage({ invoice, target, sessions: 1 }); });
  expect(res.ok).toBe(false);
  await act(async () => { res = ctx.conv.convertInvoicePackage({ invoice, target, sessions: max + 1, reason: "uji" }); });
  expect(res.ok).toBe(false);
  await act(async () => { res = ctx.conv.convertInvoicePackage({ invoice, target, sessions: 1, reason: "kesepakatan ortu" }); });
  expect(res.ok).toBe(true);
  expect(res.result.mode).toBe("manual");
});

test("saldo lebihan memotong invoice paket berikutnya dan dikembalikan bila invoice belum lunas dihapus", async () => {
  const { invoice, target } = pickCase();
  await act(async () => { ctx.conv.convertInvoicePackage({ invoice, target, sessions: 1, reason: "uji saldo" }); });
  const balance = ctx.credits.getCreditBalance(invoice.clientId);
  expect(balance).toBeGreaterThan(0);

  await act(async () => ctx.credits.issueInvoice({
    clientId: invoice.clientId, clientName: invoice.clientName, branchId: invoice.branchId,
    type: "package", typeCode: "REG", packageId: target.id, packageName: target.name, credits: target.credits, amount: target.price, by: "Finance Uji",
  }));
  const issued = ctx.credits.getAllInvoices()[0];
  const applied = Math.min(balance, target.price);
  expect(issued).toMatchObject({ balanceApplied: applied, grossAmount: target.price, amount: target.price - applied });
  expect(issued.logs.map((l) => l.action)).toEqual(["issued", "balance_applied"]);
  expect(ctx.credits.getCreditBalance(invoice.clientId)).toBe(balance - applied);

  await act(async () => ctx.credits.deleteInvoices([issued.id], "Finance Uji"));
  expect(ctx.credits.getCreditBalance(invoice.clientId)).toBe(balance);
});
