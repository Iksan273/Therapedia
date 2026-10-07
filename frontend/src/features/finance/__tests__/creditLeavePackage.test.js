// @vitest-environment jsdom
// Credit leave per paket: paket reguler membawa credit leave baru dari master; paket satuan melanjutkan sisa dan baru diisi ulang
// bila Finance memilih "Reset credit leave". Jatah cuti 30 hari/tahun tidak ikut berubah.
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { usePackageActivationActions } from "@/features/finance/hooks/usePackageActivationActions";
import { useCredits } from "@/stores/creditsStore";
import { useAuth } from "@/stores/authStore";
import { leaveCreditTotal, leaveRemainingOf } from "@/domain/credit";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = { act: usePackageActivationActions(), credits: useCredits(), auth: useAuth() };
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

const CLIENT = "c-leave-credit";
const buy = (packageId, credits = 10, extra = {}) =>
  ctx.act.renewDirect({ clientId: CLIENT, clientName: "Uji", branchId: "branch-sby-timur", packageId, packageName: `Paket (${credits}x)`, typeCode: "REG", credits, amount: 1000000, ...extra });
const rec = () => ctx.credits.getRawRecord(CLIENT);

test("paket reguler: tiap pembelian membawa credit leave baru dari master; jatah cuti 30 hari tidak berubah", async () => {
  await act(async () => ctx.credits.updateMasterPackage("pkg-reguler", { leaveQuota: 4 }));
  await act(async () => { buy("pkg-reguler"); });
  expect(rec().packages[0]).toMatchObject({ leaveTotal: 4, leaveUsed: 0 });
  await act(async () => { buy("pkg-reguler"); });
  expect(rec().packages.map((p) => p.leaveTotal)).toEqual([4, 4]); // paket baru = credit leave baru, tidak menumpuk
  expect(leaveCreditTotal(rec())).toBe(8);
  expect(rec().leaveGranted).toBeUndefined(); // jatah cuti 30 hari hanya diubah Finance (reset tahunan)
});

test("paket satuan: melanjutkan sisa credit leave (tidak reset otomatis); Reset credit leave mengisi ulang", async () => {
  await act(async () => ctx.credits.updateMasterPackage("pkg-consult", { leaveQuota: 3, isSatuan: true }));
  await act(async () => { buy("pkg-consult", 1); });
  expect(rec().packages[0].leaveTotal).toBe(3);

  // dipakai 1 oleh Admin Schedule (potong → credit leave)
  const p0 = rec().packages[0];
  await act(async () => ctx.credits.handleScheduleCancellation({ clientId: CLIENT, packageId: p0.id, scheduleId: "s-1", cancelReason: "sakit", date: "2026-10-01", deductCredit: true, by: "Admin" }));
  expect(leaveRemainingOf(rec().packages[0])).toBe(2);

  await act(async () => { buy("pkg-consult", 1); }); // renewal satuan: sisa 2 dilanjutkan
  expect(rec().packages[1].leaveTotal).toBe(2);
  expect(leaveCreditTotal(rec())).toBe(2); // total client tetap satu kumpulan (tidak dobel)

  await act(async () => { buy("pkg-consult", 1, { resetLeave: true }); }); // Finance menekan Reset credit leave
  expect(rec().packages[2].leaveTotal).toBe(3);
  expect(leaveCreditTotal(rec())).toBe(3); // sisa lama hangus
});
