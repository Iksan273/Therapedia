import { buildClientMoneyLedger, buildPackageMoneyLedgers, packageUnitValue } from "@/domain/creditLedger";

// Contoh dari Finance: paket 5 sesi Rp1.375.000 (Rp275.000/sesi) → 4 sesi completed → renewal 10 sesi Rp2.750.000.
const h = (id, action, packageId, creditChange, extra = {}) => ({ id, date: "2026-10-01", scheduleId: null, packageId, packageName: "Regular Therapist (5x)", action, creditChange, ...extra });
const record = {
  packages: [
    { id: "cp-1", packageId: "pkg-reguler", packageName: "Regular Therapist (5x)", totalCredit: 5, remainingCredit: 1, price: 1375000 },
    { id: "cp-2", packageId: "pkg-reguler", packageName: "Regular Therapist (10x)", totalCredit: 10, remainingCredit: 10, price: 2750000 },
  ],
  history: [
    h("h1", "renewed", "cp-1", 5),
    h("h2", "used", "cp-1", -1, { scheduleId: "s1" }),
    h("h3", "used", "cp-1", -1, { scheduleId: "s2" }),
    h("h4", "used", "cp-1", -1, { scheduleId: "s3" }),
    h("h5", "used", "cp-1", -1, { scheduleId: "s4" }),
    h("h6", "renewed", "cp-2", 10, { packageName: "Regular Therapist (10x)" }),
  ],
};
const sched = (id, date) => ({ id, date, startTime: "09:00", endTime: "10:00", therapistId: "t1", status: "completed" });
const schedules = [sched("s1", "2026-10-07"), sched("s2", "2026-10-10"), sched("s3", "2026-10-14"), sched("s4", "2026-10-17")];
const opts = { getTherapistName: () => "NADA" };

describe("buildClientMoneyLedger", () => {
  test("setiap sesi completed mengurangi saldo sebesar harga per sesi; renewal menambah harga paket", () => {
    const rows = buildClientMoneyLedger(record, schedules, opts);
    expect(rows.map((r) => r.amount)).toEqual([1375000, -275000, -275000, -275000, -275000, 2750000]);
    expect(rows.map((r) => r.balance)).toEqual([1375000, 1100000, 825000, 550000, 275000, 3025000]);
    expect(rows[0].note).toBe("Saldo awal");
    expect(rows[5].note).toBe("Renewal");
    expect(rows[1]).toMatchObject({ date: "2026-10-07", time: "09:00–10:00", therapistName: "NADA", packageName: "Regular Therapist", status: "completed" });
  });

  test("revert membalik nilai; cancel/off tanpa potong bernilai 0; konversi memakai nilai sisa", () => {
    const rec = {
      packages: [
        { id: "a", packageId: "x", packageName: "Senior (10x)", totalCredit: 10, remainingCredit: 0, price: 3500000 },
        { id: "b", packageId: "y", packageName: "Regular (8x)", totalCredit: 8, remainingCredit: 8, price: 2800000 },
      ],
      history: [
        { id: "1", action: "renewed", packageId: "a", creditChange: 10, date: "2026-10-01" },
        { id: "2", action: "used", packageId: "a", creditChange: -1, scheduleId: "s1", date: "2026-10-02" },
        { id: "3", action: "reversal", packageId: "a", creditChange: 1, reversesId: "2", date: "2026-10-03" },
        { id: "4", action: "cancel_excused", packageId: "a", creditChange: 0, date: "2026-10-04" },
        { id: "5", action: "converted_out", packageId: "a", creditChange: -10, date: "2026-10-05" },
        { id: "6", action: "converted_in", packageId: "b", creditChange: 8, date: "2026-10-05" },
      ],
    };
    const rows = buildClientMoneyLedger(rec, []);
    expect(rows.map((r) => r.amount)).toEqual([3500000, -350000, 350000, 0, -3500000, 2800000]);
    expect(rows.at(-1).balance).toBe(2800000);
  });

  test("harga paket tidak diketahui → nilai null; harga master dipakai sebagai cadangan", () => {
    const pkg = { id: "p", packageId: "pkg-reguler", totalCredit: 10, price: null };
    expect(packageUnitValue(pkg)).toBeNull();
    expect(packageUnitValue(pkg, [{ id: "pkg-reguler", price: 2500000 }])).toBe(250000);
  });
});

describe("pelaku mutasi kredit (kolom Oleh)", () => {
  test("applySessionCompleted / Cancelled / Reverted / PackageAdded mencatat `by`; ledger menampilkannya", async () => {
    const { applySessionCompleted, applySessionCancelled, applySessionReverted, applyPackageAdded, newClientPackage, newCreditRecord } = await import("@/domain/credit");
    let rec = applyPackageAdded(newCreditRecord({ clientId: "c1", branchId: "b" }), newClientPackage({ id: "cp", packageId: "pkg-reguler", packageName: "Regular Therapist (5x)", credits: 5, price: 1375000 }), "x", "Finance Siti");
    rec = applySessionCompleted(rec, { packageId: "cp", scheduleId: "s1", date: "2026-10-07", by: "Fajar (Admin Schedule)" });
    rec = applySessionCancelled(rec, { packageId: "cp", scheduleId: "s2", date: "2026-10-08", deductCredit: false, by: "Rina" });
    rec = applySessionReverted(rec, { scheduleId: "s1", date: "2026-10-09", reason: "salah", by: "Fajar (Admin Schedule)" });
    expect(rec.history.map((x) => x.by)).toEqual(["Finance Siti", "Fajar (Admin Schedule)", "Rina", "Fajar (Admin Schedule)"]);
    const rows = buildClientMoneyLedger(rec, []);
    expect(rows.map((r) => r.by)).toEqual(["Finance Siti", "Fajar (Admin Schedule)", "Rina", "Fajar (Admin Schedule)"]);
  });
});

test("kolom Oleh selalu terisi: baris lama tanpa `by` memakai pelaku bawaan; sesi terjadwal memakai pembuat jadwal", () => {
  const rec = { packages: [{ id: "p", packageId: "x", packageName: "Regular (5x)", totalCredit: 5, remainingCredit: 4, price: 1375000 }], history: [
    { id: "1", action: "renewed", packageId: "p", creditChange: 5, date: "2026-10-01" },
    { id: "2", action: "used", packageId: "p", creditChange: -1, scheduleId: "s1", date: "2026-10-02" },
  ] };
  const rows = buildClientMoneyLedger(rec, [{ id: "s9", type: "therapy", status: "scheduled", date: "2026-11-01", startTime: "09:00", endTime: "10:00", therapistId: "t", createdBy: "Fajar" }]);
  expect(rows.map((r) => r.by)).toEqual(["Finance", "Admin Schedule", "Fajar"]);
  expect(rows.every((r) => r.by)).toBe(true);
});

describe("buildPackageMoneyLedgers", () => {
  test("satu entri per paket dengan saldo & log sendiri; paket tanpa mutasi dilewati", () => {
    const rec = { ...record, packages: [...record.packages, { id: "cp-3", packageId: "pkg-reguler", packageName: "Regular Therapist (10x)", totalCredit: 10, remainingCredit: 10, price: 2750000 }] };
    const res = buildPackageMoneyLedgers(rec, schedules, opts);
    expect(res.map((r) => r.pkg.id)).toEqual(["cp-1", "cp-2"]);
    expect(res[0].ledger.map((r) => r.id)).toEqual(["h1", "h2", "h3", "h4", "h5"]);
    expect(res[0].balance).toBe(1375000 - 4 * 275000);
    expect(res[1].balance).toBe(2750000);
  });

  test("baris sesi membawa scheduleId & historyNote untuk kolom Catatan", () => {
    const withNote = schedules.map((s) => (s.id === "s1" ? { ...s, historyNote: "Anak kooperatif" } : s));
    const [first] = buildPackageMoneyLedgers(record, withNote, opts);
    const row = first.ledger.find((r) => r.id === "h2");
    expect(row.scheduleId).toBe("s1");
    expect(row.historyNote).toBe("Anak kooperatif");
  });
});
