import {
  CANCEL_QUOTA,
  applyPackageAdded,
  applySessionCancelled,
  applySessionCompleted,
  applySessionReverted,
  newClientPackage,
  newCreditRecord,
  nextInvoiceNumber,
  summarizeCreditRecord,
} from "@/domain/credit";

const recordWith = (remaining, extra = {}) => ({
  ...newCreditRecord({ clientId: "c-1", branchId: "b-1", id: "cr-1" }),
  packages: [{ id: "cp-1", packageId: "pkg-reguler", packageName: "Regular (10x)", totalCredit: 10, remainingCredit: remaining, cancelCount: 0, status: "active" }],
  ...extra,
});

describe("applySessionCompleted", () => {
  test("memotong 1 kredit dan mencatat history 'used'", () => {
    const next = applySessionCompleted(recordWith(5), { packageId: "cp-1", scheduleId: "s-1", date: "2026-10-01" });
    expect(next.packages[0].remainingCredit).toBe(4);
    expect(next.history).toHaveLength(1);
    expect(next.history[0]).toMatchObject({ action: "used", creditChange: -1, scheduleId: "s-1", date: "2026-10-01" });
  });

  test("idempoten: sesi yang sama tidak dipotong dua kali", () => {
    const once = applySessionCompleted(recordWith(5), { packageId: "cp-1", scheduleId: "s-1" });
    const twice = applySessionCompleted(once, { packageId: "cp-1", scheduleId: "s-1" });
    expect(twice.packages[0].remainingCredit).toBe(4);
    expect(twice.history).toHaveLength(1);
  });

  test("paket habis berstatus depleted dan tidak pernah negatif", () => {
    const next = applySessionCompleted(recordWith(1), { packageId: "cp-1", scheduleId: "s-1" });
    expect(next.packages[0]).toMatchObject({ remainingCredit: 0, status: "depleted" });
  });

  test("tanpa paket: record tidak berubah", () => {
    const empty = newCreditRecord({ clientId: "c-1" });
    expect(applySessionCompleted(empty, { scheduleId: "s-1" })).toBe(empty);
  });
});

describe("applySessionCancelled", () => {
  test(`cancel ke-1..${CANCEL_QUOTA} tidak memotong kredit`, () => {
    let rec = recordWith(5);
    for (let i = 1; i <= CANCEL_QUOTA; i += 1) rec = applySessionCancelled(rec, { packageId: "cp-1", scheduleId: `s-${i}` });
    expect(rec.cancelCountTotal).toBe(CANCEL_QUOTA);
    expect(rec.packages[0].remainingCredit).toBe(5);
    expect(rec.history.every((h) => h.action === "cancel_excused")).toBe(true);
  });

  test("cancel setelah kuota habis memotong 1 kredit (penalti)", () => {
    const rec = applySessionCancelled(recordWith(5, { cancelCountTotal: CANCEL_QUOTA }), { packageId: "cp-1", scheduleId: "s-9" });
    expect(rec.packages[0].remainingCredit).toBe(4);
    expect(rec.packages[0].cancelCount).toBe(1);
    expect(rec.history.at(-1)).toMatchObject({ action: "cancel_penalty", creditChange: -1 });
  });
});

describe("applySessionReverted (ledger append-only)", () => {
  test("revert completed: +1 kredit lewat baris reversal; baris 'used' tetap ada", () => {
    const used = applySessionCompleted(recordWith(5), { packageId: "cp-1", scheduleId: "s-1" });
    const next = applySessionReverted(used, { scheduleId: "s-1", reason: "Salah klik" });
    expect(next.packages[0].remainingCredit).toBe(5);
    expect(next.history).toHaveLength(2);
    expect(next.history[0].action).toBe("used");
    expect(next.history[1]).toMatchObject({ action: "reversal", creditChange: 1, reversesId: used.history[0].id });
  });

  test("satu baris hanya bisa dibalik sekali (tidak menambah kredit dua kali)", () => {
    const used = applySessionCompleted(recordWith(5), { packageId: "cp-1", scheduleId: "s-1" });
    const once = applySessionReverted(used, { scheduleId: "s-1" });
    const twice = applySessionReverted(once, { scheduleId: "s-1" });
    expect(twice).toBe(once);
    expect(twice.packages[0].remainingCredit).toBe(5);
  });

  test("complete lagi setelah revert memotong kredit dengan baris baru (id berbeda)", () => {
    let rec = applySessionCompleted(recordWith(5), { packageId: "cp-1", scheduleId: "s-1" });
    rec = applySessionReverted(rec, { scheduleId: "s-1" });
    rec = applySessionCompleted(rec, { packageId: "cp-1", scheduleId: "s-1" });
    expect(rec.packages[0].remainingCredit).toBe(4);
    const used = rec.history.filter((h) => h.action === "used");
    expect(used).toHaveLength(2);
    expect(used[0].id).not.toBe(used[1].id);
    // Revert kedua menunjuk baris 'used' yang baru, bukan yang lama
    const again = applySessionReverted(rec, { scheduleId: "s-1" });
    expect(again.history.at(-1).reversesId).toBe(used[1].id);
    expect(again.packages[0].remainingCredit).toBe(5);
  });

  test("revert paket depleted mengaktifkan kembali paket", () => {
    const used = applySessionCompleted(recordWith(1), { packageId: "cp-1", scheduleId: "s-1" });
    expect(used.packages[0].status).toBe("depleted");
    expect(applySessionReverted(used, { scheduleId: "s-1" }).packages[0]).toMatchObject({ remainingCredit: 1, status: "active" });
  });

  test("revert cancel dalam kuota: kuota −1, kredit tetap", () => {
    const cancelled = applySessionCancelled(recordWith(5), { packageId: "cp-1", scheduleId: "s-1" });
    const next = applySessionReverted(cancelled, { scheduleId: "s-1" });
    expect(next.cancelCountTotal).toBe(0);
    expect(next.packages[0].remainingCredit).toBe(5);
    expect(next.history.at(-1)).toMatchObject({ action: "reversal", creditChange: 0 });
  });

  test("revert penalti cancel: +1 kredit dan kuota −1", () => {
    const cancelled = applySessionCancelled(recordWith(5, { cancelCountTotal: CANCEL_QUOTA }), { packageId: "cp-1", scheduleId: "s-9" });
    expect(cancelled.packages[0].remainingCredit).toBe(4);
    const next = applySessionReverted(cancelled, { scheduleId: "s-9" });
    expect(next.packages[0]).toMatchObject({ remainingCredit: 5, cancelCount: 0 });
    expect(next.cancelCountTotal).toBe(CANCEL_QUOTA);
  });

  test("sesi tanpa mutasi kredit (mis. asesmen): record tidak berubah", () => {
    const rec = recordWith(5);
    expect(applySessionReverted(rec, { scheduleId: "s-x" })).toBe(rec);
  });
});

describe("paket & invoice", () => {
  test("applyPackageAdded menambah paket dan history 'renewed'", () => {
    const pkg = newClientPackage({ packageId: "pkg-vip", packageName: "Senior (10x)", credits: 10 });
    const rec = applyPackageAdded(newCreditRecord({ clientId: "c-1" }), pkg, "Renewal");
    expect(summarizeCreditRecord(rec)).toMatchObject({ remainingCredit: 10, totalCredit: 10, leaveQuota: CANCEL_QUOTA });
    expect(rec.history[0]).toMatchObject({ action: "renewed", creditChange: 10 });
  });

  test("nextInvoiceNumber unik walau ada nomor yang lompat", () => {
    const now = new Date("2026-10-02");
    const invoices = [{ invoiceNumber: "INV-2026-007" }, { invoiceNumber: "INV-2026-002" }];
    expect(nextInvoiceNumber(invoices, now)).toBe("INV-2026-008");
    expect(nextInvoiceNumber([], now)).toBe("INV-2026-001");
  });
});
