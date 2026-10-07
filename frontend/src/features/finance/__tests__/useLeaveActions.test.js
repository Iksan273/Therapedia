// @vitest-environment jsdom
// Cuti client: log Finance → sesi dibatalkan (kredit sesuai pilihan), akhiri lebih awal / void → sesi kembali scheduled,
// saldo jatah cuti dihitung dari log (sesi pertama s.d. terakhir); cuti hanya dari Finance, sesi dibatalkan (cancelled, alasan OL).
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { useLeaveActions } from "@/features/finance/hooks/useLeaveActions";
import { useSessionActions } from "@/features/schedule/hooks/useSessionActions";
import { useSchedules } from "@/stores/schedulesStore";
import { useCredits } from "@/stores/creditsStore";
import { useClients } from "@/stores/clientsStore";
import { LEAVE_QUOTA_DAYS, activeLeaveOn, leaveQuotaSummary } from "@/domain/leave";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = { leave: useLeaveActions(), actions: useSessionActions(), sch: useSchedules(), credits: useCredits(), clients: useClients() };
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
const seededLeaves = () => 3; // log cuti bawaan seed demo (aktif, selesai lebih awal, void)

const remainingOf = (clientId) => (ctx.credits.getRecordForClient(clientId)?.packages || []).reduce((n, p) => n + (p.remainingCredit || 0), 0);
const sessionOf = (id) => ctx.sch.schedules.find((s) => s.id === id);
const quotaOf = (clientId) => leaveQuotaSummary({ schedules: ctx.sch.schedules, leaves: ctx.leave.leaves, clientId, ...ctx.leave.leaveContextOf(clientId) });

// Client seed dengan paket yang masih bersisa ≥ 3, plus 3 sesi terapi mingguan di tahun jauh (tanpa bentrok dengan seed)
async function setup() {
  const client = ctx.clients.clients.find((c) => remainingOf(c.id) >= 3);
  expect(client).toBeTruthy();
  const dates = ["2031-05-05", "2031-05-12", "2031-05-19"];
  const list = dates.map((date, i) => ({
    id: `lv-${i}`, clientId: client.id, branchId: client.branchId, type: "therapy", status: "scheduled",
    date, startTime: "09:00", endTime: "10:00", therapistId: "tx", creditPackageId: null,
  }));
  await act(async () => ctx.sch.addSchedules(list));
  return client;
}

test("catat cuti: sesi di rentang dibatalkan bertaut log, kredit utuh bila dipilih tidak potong", async () => {
  const client = await setup();
  const before = remainingOf(client.id);
  let res;
  await act(async () => { res = ctx.leave.createLeave({ clientId: client.id, branchId: client.branchId, startDate: "2031-05-04", endDate: "2031-05-25", reason: "Liburan" }); });
  expect(res.ok).toBe(true);
  expect(res.days).toBe(15); // 05-05 s.d. 05-19 (sesi pertama s.d. terakhir), bukan 22 hari rentang
  expect(res.sessionsOff).toBe(3);
  expect(res.deducted).toBe(0);
  ["lv-0", "lv-1", "lv-2"].forEach((id) => expect(sessionOf(id)).toMatchObject({ status: "cancelled", leaveId: res.leave.id, cancelReason: "OL" }));
  expect(remainingOf(client.id)).toBe(before);
  expect(res.leave).toMatchObject({ countedStart: "2031-05-05", countedEnd: "2031-05-19" });
  expect(quotaOf(client.id)).toMatchObject({ used: 15, remaining: 15 });
});

test("rentang tanpa sesi terapi ditolak; cuti tidak memotong kredit sesi", async () => {
  const client = await setup();
  let res;
  const before = remainingOf(client.id);
  await act(async () => { res = ctx.leave.createLeave({ clientId: client.id, startDate: "2031-05-04", endDate: "2031-05-25" }); });
  expect(res.ok).toBe(true); // tanpa pilihan potong kredit: cuti memotong saldo cuti, bukan kredit sesi
  expect(res.deducted).toBe(0);
  expect(remainingOf(client.id)).toBe(before);
  expect(ctx.leave.leaves[0].sessionIds).toEqual(["lv-0", "lv-1", "lv-2"]);
  await act(async () => { ctx.leave.voidLeave(ctx.leave.leaves[0], { reason: "ulang" }); }); // void ≠ hapus: log tetap ada (status voided)
  await act(async () => { res = ctx.leave.createLeave({ clientId: client.id, startDate: "2031-07-01", endDate: "2031-07-03" }); });
  expect(res.ok).toBe(false);
  expect(res.errors.join(" ")).toMatch(/belum punya jadwal/i);
  expect(ctx.leave.leaves).toHaveLength(seededLeaves() + 1); // log seed + yang di-void di atas
});

test("akhiri lebih awal: sesi pada/sesudah tanggal masuk kembali jadi scheduled, hari kembali ke jatah", async () => {
  const client = await setup();
  let res;
  await act(async () => { res = ctx.leave.createLeave({ clientId: client.id, startDate: "2031-05-04", endDate: "2031-05-25" }); });
  const leave = res.leave;
  await act(async () => { res = ctx.leave.endLeaveEarly(ctx.leave.leaves[0], { returnDate: "2031-05-12" }); });
  expect(res).toMatchObject({ ok: true, isVoid: false, released: 2, daysReturned: 8 }); // hari hitung 05-12..05-19 kembali
  expect(sessionOf("lv-0").status).toBe("cancelled");
  ["lv-1", "lv-2"].forEach((id) => expect(sessionOf(id)).toMatchObject({ status: "scheduled", leaveId: null, revertedAt: null }));
  expect(ctx.leave.leaves[0]).toMatchObject({ id: leave.id, returnDate: "2031-05-12", status: "active" });
  expect(quotaOf(client.id).used).toBe(7); // tinggal 05-05..05-11
});

test("void cuti: semua sesi scheduled, jatah kembali penuh, kredit sesi tidak berubah; alasan wajib; log tetap tersimpan (bukan hapus)", async () => {
  const client = await setup();
  const before = remainingOf(client.id);
  let res;
  await act(async () => { res = ctx.leave.createLeave({ clientId: client.id, startDate: "2031-05-04", endDate: "2031-05-25" }); });
  expect(res.deducted).toBe(0);
  expect(remainingOf(client.id)).toBe(before);

  await act(async () => { res = ctx.leave.voidLeave(ctx.leave.leaves[0], { reason: "  " }); });
  expect(res.ok).toBe(false);

  await act(async () => { res = ctx.leave.voidLeave(ctx.leave.leaves[0], { reason: "Rencana dibatalkan" }); });
  expect(res).toMatchObject({ ok: true, isVoid: true, released: 3, daysReturned: 15 });
  ["lv-0", "lv-1", "lv-2"].forEach((id) => expect(sessionOf(id).status).toBe("scheduled"));
  expect(remainingOf(client.id)).toBe(before);
  expect(ctx.leave.leaves).toHaveLength(seededLeaves() + 1); // void ≠ hapus: log tetap ada
  expect(ctx.leave.leaves[0]).toMatchObject({ status: "voided", voidReason: "Rencana dibatalkan" });
  expect(ctx.leave.leaves[0].voidedAt).toBeTruthy();
  expect(quotaOf(client.id).used).toBe(0);
});

test("slot terisi saat dikembalikan: sesi dilewati, dilepas dari log, tetap Off", async () => {
  const client = await setup();
  let res;
  await act(async () => { res = ctx.leave.createLeave({ clientId: client.id, startDate: "2031-05-04", endDate: "2031-05-25" }); });
  const other = ctx.clients.clients.find((c) => c.id !== client.id);
  await act(async () => ctx.sch.addSchedule({ id: "blocker", clientId: other.id, branchId: other.branchId, type: "therapy", status: "scheduled", date: "2031-05-12", startTime: "09:00", endTime: "10:00", therapistId: "tx" }));
  await act(async () => { res = ctx.leave.voidLeave(ctx.leave.leaves[0], { reason: "Batal" }); });
  expect(res).toMatchObject({ ok: true, released: 2, conflicted: 1 });
  expect(sessionOf("lv-1")).toMatchObject({ status: "cancelled", leaveId: null });
});

test("rentang panjang hanya dihitung dari sesi pertama s.d. terakhir", async () => {
  const client = await setup();
  let res;
  await act(async () => { res = ctx.leave.createLeave({ clientId: client.id, startDate: "2031-05-01", endDate: "2031-06-15" }); }); // 46 hari kalender, 3 sesi
  expect(res).toMatchObject({ ok: true, days: 15, sessionsOff: 3 });
  expect(res.warnings).toEqual([]);
  expect(quotaOf(client.id)).toMatchObject({ used: 15, over: 0 });
});

test("jatah terlewati tetap tersimpan dengan peringatan", async () => {
  const client = await setup();
  const extra = Array.from({ length: 31 }, (_, i) => ({
    id: `ex-${i}`, clientId: client.id, branchId: client.branchId, type: "therapy", status: "scheduled",
    date: new Date(Date.UTC(2031, 4, 20 + i)).toISOString().slice(0, 10), startTime: "09:00", endTime: "10:00", therapistId: "tx", creditPackageId: null,
  }));
  await act(async () => ctx.sch.addSchedules(extra)); // 20 Mei s.d. 19 Jun
  let res;
  await act(async () => { res = ctx.leave.createLeave({ clientId: client.id, startDate: "2031-05-01", endDate: "2031-06-30" }); });
  expect(res.ok).toBe(true);
  expect(res.sessionsOff).toBe(34); // 3 sesi setup + 31 tambahan
  expect(res.warnings.length).toBe(1);
  expect(quotaOf(client.id)).toMatchObject({ used: 46, over: 46 - LEAVE_QUOTA_DAYS }); // 05-05 s.d. 06-19
});

test("sesi baru di tanggal cuti: client terdeteksi sedang cuti (activeLeaveOn) untuk peringatan di AddSchedule", async () => {
  const client = await setup();
  let res;
  await act(async () => { res = ctx.leave.createLeave({ clientId: client.id, branchId: client.branchId, startDate: "2031-05-04", endDate: "2031-05-25" }); });
  expect(res.ok).toBe(true);
  expect(activeLeaveOn(ctx.leave.leaves, client.id, "2031-05-22")?.id).toBe(res.leave.id);
  expect(activeLeaveOn(ctx.leave.leaves, client.id, "2031-05-26")).toBeNull();
  await act(async () => { ctx.leave.voidLeave(ctx.leave.leaves[0], { reason: "Batal" }); });
  expect(activeLeaveOn(ctx.leave.leaves, client.id, "2031-05-22")).toBeNull(); // void/akhiri lebih awal: tidak lagi dianggap cuti
});

test("paket satuan: cuti kedua di bulan yang sama ditolak", async () => {
  const client = await setup();
  const rec = ctx.credits.getRawRecord(client.id);
  const pkgId = (rec.packages.find((p) => p.remainingCredit > 0) || rec.packages[0]).packageId;
  await act(async () => ctx.credits.updateMasterPackage(pkgId, { isSatuan: true }));
  let res;
  await act(async () => { res = ctx.leave.createLeave({ clientId: client.id, startDate: "2031-05-04", endDate: "2031-05-06" }); });
  expect(res.ok).toBe(true);
  await act(async () => { res = ctx.leave.createLeave({ clientId: client.id, startDate: "2031-05-11", endDate: "2031-05-13" }); });
  expect(res.ok).toBe(false);
  expect(res.errors.join(" ")).toMatch(/1x cuti/i);
});

test("akhiri lebih awal mencatat jejak (returnedAt/By) untuk tampilan Detail", async () => {
  const client = await setup();
  let res;
  await act(async () => { res = ctx.leave.createLeave({ clientId: client.id, startDate: "2031-05-04", endDate: "2031-05-25" }); });
  await act(async () => { ctx.leave.endLeaveEarly(ctx.leave.leaves[0], { returnDate: "2031-05-12", reason: "Anak sudah sehat" }); });
  expect(ctx.leave.leaves[0]).toMatchObject({ returnDate: "2031-05-12", returnNote: "Anak sudah sehat", status: "active" });
  expect(ctx.leave.leaves[0].returnedAt).toBeTruthy();
  expect(res.leave.createdAt).toBeTruthy();
});

test("reset tahunan: semua client kembali 30 hari, sisa hangus, pemakaian sebelum reset tidak dihitung, riwayat reset tercatat", async () => {
  const client = await setup();
  const past = ["2020-05-05", "2020-05-12"].map((date, i) => ({
    id: `old-${i}`, clientId: client.id, branchId: client.branchId, type: "therapy", status: "scheduled",
    date, startTime: "09:00", endTime: "10:00", therapistId: "tx", creditPackageId: null,
  }));
  await act(async () => ctx.sch.addSchedules(past));
  const planBefore = ctx.leave.previewAnnualReset();
  await act(async () => { ctx.leave.createLeave({ clientId: client.id, startDate: "2020-05-04", endDate: "2020-05-20" }); }); // 8 hari (05–12 Mei)
  expect(quotaOf(client.id)).toMatchObject({ used: 8, remaining: 22 });

  const plan = ctx.leave.previewAnnualReset();
  expect(plan.quota).toBe(30);
  expect(plan.forfeitedDays).toBeLessThan(plan.clients * 30); // ada cuti terpakai (cuti seed + milik client ini)
  expect(plan.clients).toBe(ctx.clients.clients.length);
  expect(plan.forfeitedDays).toBe(planBefore.forfeitedDays - 8); // 8 hari cuti baru mengurangi sisa yang hangus

  let res;
  await act(async () => { res = ctx.leave.resetAllBalances(); });
  expect(res).toMatchObject({ ok: true, quota: 30, forfeitedDays: plan.forfeitedDays });
  expect(ctx.leave.lastResetAt).toBeTruthy();
  expect(ctx.leave.resets.at(-1)).toMatchObject({ clients: plan.clients, forfeitedDays: plan.forfeitedDays });
  expect(quotaOf(client.id)).toMatchObject({ quota: 30, used: 0, remaining: 30 }); // pemakaian sebelum reset tidak dihitung lagi
  expect(ctx.leave.leaves).toHaveLength(seededLeaves() + 1); // log cuti tetap tersimpan
  const afterReset = ctx.leave.previewAnnualReset();
  expect(afterReset.forfeitedDays).toBeGreaterThan(planBefore.forfeitedDays - 1); // setelah reset: semua client 30 hari (hari cuti seed masa depan tetap memotong)
});
