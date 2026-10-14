// @vitest-environment jsdom
// Master paket (mode demo): saklar aktif menyaring pilihan form, hapus hanya untuk paket yang belum dipakai.
// Master data inquiry: kuadran yang belum dipakai boleh dihapus semua (tanpa batas minimal).
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { useCredits } from "@/stores/creditsStore";
import { useMasterData } from "@/stores/masterDataStore";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = { credits: useCredits(), master: useMasterData() };
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

const newPackage = { name: "Paket Uji", invoiceCode: "UJI", credits: 4, price: 100000, description: "", leaveQuota: 1, isSatuan: false, isAssessment: false };

test("paket nonaktif tidak muncul di pilihan aktif tetapi tetap terbaca untuk data lama", async () => {
  await act(async () => ctx.credits.addMasterPackage(newPackage));
  const added = ctx.credits.getMasterPackages().find((p) => p.name === "Paket Uji");
  expect(added.isActive).toBe(true);
  expect(ctx.credits.getActiveMasterPackages().some((p) => p.id === added.id)).toBe(true);

  await act(async () => ctx.credits.setMasterPackageActive(added.id, false));
  expect(ctx.credits.getActiveMasterPackages().some((p) => p.id === added.id)).toBe(false);
  expect(ctx.credits.getMasterPackages().some((p) => p.id === added.id)).toBe(true);
});

test("paket yang belum dipakai bisa dihapus; yang dipakai invoice / paket client ditolak", async () => {
  await act(async () => ctx.credits.addMasterPackage(newPackage));
  const added = ctx.credits.getMasterPackages().find((p) => p.name === "Paket Uji");
  await act(async () => ctx.credits.deleteMasterPackage(added.id));
  expect(ctx.credits.getMasterPackages().some((p) => p.id === added.id)).toBe(false);

  const used = ctx.credits.credits.invoices.find((i) => i.packageId)?.packageId;
  expect(used).toBeTruthy();
  expect(() => ctx.credits.deleteMasterPackage(used)).toThrow(/dipakai/);
  expect(ctx.credits.getMasterPackages().some((p) => p.id === used)).toBe(true);
});

test("semua kuadran yang belum dipakai boleh dihapus", async () => {
  for (const q of [...ctx.master.quadrants]) await act(async () => ctx.master.deleteQuadrant(q.code));
  expect(ctx.master.quadrants).toHaveLength(0);
});
