// @vitest-environment jsdom
// Renewal / approve paket: sesi terapi mendatang yang menunjuk paket habis dipindah ke paket aktif (tidak Frozen lagi).
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { usePackageActivationActions } from "@/features/finance/hooks/usePackageActivationActions";
import { useCredits } from "@/stores/creditsStore";
import { useSchedules } from "@/stores/schedulesStore";
import { useAuth } from "@/stores/authStore";
import { newClientPackage, newCreditRecord } from "@/domain/credit";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = { act: usePackageActivationActions(), credits: useCredits(), schedules: useSchedules(), auth: useAuth() };
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

const session = (id, patch = {}) => ({
  id, clientId: "c-relink", therapistId: "t-1", branchId: "branch-sby-timur", type: "therapy", status: "scheduled",
  date: "2099-01-05", startTime: "09:00", endTime: "10:00", ...patch,
});

test("renewal langsung: sesi mendatang yang menunjuk paket habis dipindah ke paket baru; riwayat tidak disentuh", async () => {
  const depleted = { ...newClientPackage({ packageName: "Regular Therapist (10x)", credits: 10 }), id: "cp-old", remainingCredit: 0, status: "depleted" };
  await act(async () => ctx.credits.addRecord({ ...newCreditRecord({ clientId: "c-relink", branchId: "branch-sby-timur" }), packages: [depleted] }));
  await act(async () =>
    ctx.schedules.addSchedules([
      session("s-future", { creditPackageId: "cp-old" }),
      session("s-nopkg"),
      session("s-done", { status: "completed", date: "2020-01-01", creditPackageId: "cp-old" }),
    ])
  );

  let res;
  await act(async () => {
    res = ctx.act.renewDirect({
      clientId: "c-relink", clientName: "Uji", branchId: "branch-sby-timur", packageId: "pkg-reguler",
      packageName: "Regular Therapist (10x)", typeCode: "REG", credits: 10, amount: 2500000, reason: "Tunai", justification: "Dibayar tunai di kasir",
    });
  });
  expect(res.relinked).toBe(2);

  const rec = ctx.credits.getRawRecord("c-relink");
  const fresh = rec.packages.find((p) => p.id !== "cp-old");
  expect(fresh.remainingCredit).toBe(10);
  const byId = (id) => ctx.schedules.schedules.find((s) => s.id === id);
  expect(byId("s-future").creditPackageId).toBe(fresh.id);
  expect(byId("s-nopkg").creditPackageId).toBe(fresh.id);
  expect(byId("s-done").creditPackageId).toBe("cp-old");
});
