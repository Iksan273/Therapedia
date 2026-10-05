// Data demo harus sinkron: sisa paket = total - pemakaian ledger, ledger = jadwal, saldo rupiah = sisa x harga per sesi.
import { loadCreditsSeed, loadSchedulesSeed } from "@/data/seedLoader";
import { buildClientMoneyLedger, packageUnitValue } from "@/domain/creditLedger";

const credits = loadCreditsSeed();
const schedules = loadSchedulesSeed();

describe("seed kredit demo sinkron dengan jadwal", () => {
  test("tiap paket: sisa = total - kredit terpakai; jumlah baris ledger = perubahan kredit", () => {
    credits.records.forEach((r) => {
      r.packages.forEach((p) => {
        const hist = r.history.filter((h) => h.packageId === p.id);
        const net = hist.reduce((a, h) => a + h.creditChange, 0);
        expect(net).toBe(p.remainingCredit);
        expect(p.remainingCredit).toBeGreaterThanOrEqual(0);
        expect(p.remainingCredit).toBeLessThanOrEqual(p.totalCredit);
        expect(p.status).toBe(p.remainingCredit > 0 ? "active" : "depleted");
        expect(p.price).toBeGreaterThan(0);
      });
    });
  });

  test("setiap sesi therapy completed punya satu baris used dan paketnya sama dengan creditPackageId", () => {
    credits.records.forEach((r) => {
      const mine = schedules.filter((s) => s.clientId === r.clientId && s.type === "therapy" && s.status === "completed");
      const total = r.packages.reduce((a, p) => a + p.totalCredit, 0);
      const used = r.history.filter((h) => h.action === "used");
      expect(used.length).toBe(Math.min(mine.length, total));
      used.forEach((h) => {
        expect(schedules.find((s) => s.id === h.scheduleId).creditPackageId).toBe(h.packageId);
      });
    });
  });

  test("saldo rupiah di log = sisa sesi x harga per sesi paket; baris terjadwal tidak mengubah saldo", () => {
    credits.records.forEach((r) => {
      const rows = buildClientMoneyLedger(r, schedules.filter((s) => s.clientId === r.clientId), { masterPackages: credits.masterPackages });
      if (!rows.length) return;
      const expected = r.packages.reduce((a, p) => a + Math.round(p.remainingCredit * packageUnitValue(p, credits.masterPackages)), 0);
      expect(Math.abs(rows[rows.length - 1].balance - expected)).toBeLessThanOrEqual(r.packages.length);
    });
  });

  test("client dengan sesi terjadwal menampilkan baris Terjadwal berstatus scheduled", () => {
    const withUpcoming = credits.records.find((r) => schedules.some((s) => s.clientId === r.clientId && s.type === "therapy" && s.status === "scheduled"));
    expect(withUpcoming).toBeTruthy();
    const rows = buildClientMoneyLedger(withUpcoming, schedules.filter((s) => s.clientId === withUpcoming.clientId), { masterPackages: credits.masterPackages });
    expect(rows.some((r) => r.status === "scheduled" && r.amount === 0)).toBe(true);
  });
});
