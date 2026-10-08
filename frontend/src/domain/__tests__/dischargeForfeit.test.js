import { applyDischargeForfeit, newClientPackage, newCreditRecord } from "@/domain/credit";
import { buildClientMoneyLedger } from "@/domain/creditLedger";

const record = () => ({
  ...newCreditRecord({ clientId: "c1", branchId: "b1" }),
  packages: [
    { ...newClientPackage({ id: "p1", packageId: "m1", packageName: "Regular Therapist (10x)", credits: 10, price: 1000000 }), remainingCredit: 4 },
    { ...newClientPackage({ id: "p2", packageId: "m1", packageName: "Regular Therapist (10x)", credits: 10, price: 1000000 }), remainingCredit: 0, status: "depleted" },
  ],
});

test("sisa sesi paket aktif hangus: paket depleted+forfeited, ledger discharge −sisa", () => {
  const next = applyDischargeForfeit(record(), { by: "Admin", note: "Lulus" });
  expect(next.packages[0]).toMatchObject({ remainingCredit: 0, status: "depleted", forfeited: true });
  expect(next.packages[1].forfeited).toBeUndefined();
  expect(next.history).toHaveLength(1);
  expect(next.history[0]).toMatchObject({ action: "discharge", packageId: "p1", creditChange: -4, by: "Admin", note: "Lulus" });
});

test("idempoten dan tanpa sisa tidak mengubah record", () => {
  const once = applyDischargeForfeit(record(), {});
  expect(applyDischargeForfeit(once, {})).toBe(once);
  const empty = newCreditRecord({ clientId: "c2", branchId: "b1" });
  expect(applyDischargeForfeit(empty, {})).toBe(empty);
});

test("log kredit & saldo: baris discharge bernilai harga per sesi × sisa", () => {
  const rec = applyDischargeForfeit({ ...record(), history: [] }, {});
  const rows = buildClientMoneyLedger({ ...rec, packages: [rec.packages[0]] }, []);
  expect(rows[0]).toMatchObject({ detail: "Discharge (sisa sesi hangus)", creditChange: -4, amount: -400000 });
});

test("dua paket aktif (Regular 10 + Senior 2): satu baris ledger per paket dengan catatan masing-masing", () => {
  const rec = {
    ...newCreditRecord({ clientId: "c3", branchId: "b1" }),
    packages: [
      { ...newClientPackage({ id: "r", packageId: "m1", packageName: "Regular Therapist (10x)", credits: 10, price: 1000000 }), remainingCredit: 10 },
      { ...newClientPackage({ id: "s", packageId: "m2", packageName: "Senior Therapist (10x)", credits: 10, price: 2000000 }), remainingCredit: 2 },
    ],
  };
  const next = applyDischargeForfeit(rec, { reason: "moving", by: "Admin" });
  const rows = next.history.filter((h) => h.action === "discharge");
  expect(rows.map((h) => [h.packageId, h.creditChange])).toEqual([["r", -10], ["s", -2]]);
  expect(rows[0].note).toBe("Discharge: moving. 10 sisa sesi Regular Therapist hangus");
  expect(rows[1].note).toBe("Discharge: moving. 2 sisa sesi Senior Therapist hangus");
  expect(next.packages.every((p) => p.remainingCredit === 0 && p.forfeited)).toBe(true);
});
