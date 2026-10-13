// @vitest-environment jsdom
// Alasan Cancel / Off dan Therapist Off = SATU daftar (padanan tabel `cancel_reasons`); Therapist Off hanya penanda `therapistOff`.
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { STORAGE_PREFIX } from "@/services/storage/localStore";
import { useMasterData } from "@/stores/masterDataStore";
import { cancellationStats } from "@/domain/schedule";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = useMasterData();
  return null;
}

let root;
const mount = async () => {
  await ensureSeedsIfNeeded();
  root = createRoot(document.createElement("div"));
  await act(async () => root.render(<AppProviders><Probe /></AppProviders>));
};
afterEach(() => act(() => root.unmount()));
beforeEach(() => window.localStorage.clear());

test("seed: satu daftar, alasan terapis (TO, TS) ditandai therapistOff", async () => {
  await mount();

  expect(ctx.cancelReasons.map((r) => r.value)).toEqual(["OL", "S", "SCA", "MCU", "FM", "TI", "H", "NS", "TO", "TS"]);
  expect(ctx.cancelReasons.filter((r) => r.therapistOff).map((r) => r.value)).toEqual(["TO", "TS"]);
  expect(ctx.therapistOffCodes).toEqual(["TO", "TS"]); // dasar Therapist Off Rate, turunan dari penanda
  expect(ctx.activeCancelReasons).toHaveLength(10); // satu daftar pilihan untuk form Cancel / Off
  expect(ctx.getCancelReasonLabel("TO")).toBe("Therapist Off (Terapis Berhalangan)");
});

test("tambah alasan biasa dan alasan Therapist Off di daftar yang sama; kode unik lintas keduanya", async () => {
  await mount();

  await act(async () => ctx.addCancelReason({ value: "KB", label: "Kendaraan Bermasalah", active: true }));
  await act(async () => ctx.addCancelReason({ value: "TC", label: "Therapist Cuti", active: true, therapistOff: true }));

  expect(ctx.cancelReasons.find((r) => r.value === "KB")).toMatchObject({ therapistOff: false });
  expect(ctx.cancelReasons.find((r) => r.value === "TC")).toMatchObject({ therapistOff: true });
  expect(ctx.therapistOffCodes).toEqual(["TO", "TS", "TC"]);
});

test("mengubah penanda Therapist Off langsung memengaruhi Therapist Off Rate, tanpa memindahkan kode", async () => {
  await mount();
  const sessions = [
    { status: "cancelled", cancelReason: "S" },
    { status: "cancelled", cancelReason: "TO" },
    { status: "completed" },
    { status: "completed" },
  ];
  expect(cancellationStats(sessions, ctx.therapistOffCodes)).toMatchObject({ cancelled: 2, therapistOff: 1, therapistOffRate: 25 });

  await act(async () => ctx.updateCancelReason("S", { therapistOff: true })); // Sick (client) ditandai terapis: contoh uji
  expect(ctx.therapistOffCodes).toEqual(["S", "TO", "TS"]);
  expect(cancellationStats(sessions, ctx.therapistOffCodes)).toMatchObject({ cancelled: 2, therapistOff: 2, therapistOffRate: 50 });

  await act(async () => ctx.updateCancelReason("TO", { therapistOff: false }));
  expect(ctx.therapistOffCodes).not.toContain("TO");
  expect(ctx.cancelReasons.map((r) => r.value)).toContain("TO"); // tetap ada di satu daftar
});

test("hapus alasan Therapist Off sama seperti alasan lain (satu fungsi)", async () => {
  await mount();

  await act(async () => ctx.deleteCancelReason("TS"));

  expect(ctx.cancelReasons.map((r) => r.value)).not.toContain("TS");
  expect(ctx.therapistOffCodes).toEqual(["TO"]);
});

test("data demo lama (dua key terpisah) digabung otomatis tanpa kehilangan ubahan user", async () => {
  window.localStorage.setItem(STORAGE_PREFIX + "master_cancel_off_codes", JSON.stringify([
    { value: "OL", label: "On Leave (diubah user)", active: true },
    { value: "ZZ", label: "Alasan Buatan User", active: false },
  ]));
  window.localStorage.setItem(STORAGE_PREFIX + "master_therapist_off_codes", JSON.stringify([{ value: "TO", label: "Terapis Off (diubah)", active: true }]));

  await mount();

  expect(ctx.cancelReasons.map((r) => [r.value, r.therapistOff])).toEqual([["OL", false], ["ZZ", false], ["TO", true]]);
  expect(ctx.cancelReasons[0].label).toBe("On Leave (diubah user)");
  expect(ctx.cancelReasons[1].active).toBe(false);
  expect(ctx.therapistOffCodes).toEqual(["TO"]);
});
