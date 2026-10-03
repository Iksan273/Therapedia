import {
  CANCEL_QUOTA,
  applyPackageAdded,
  applySessionCancelled,
  applySessionCompleted,
  applySessionReverted,
  activePackageOf,
  canUploadProof,
  invoiceType,
  invoiceTypeCode,
  newClientPackage,
  newCreditRecord,
  nextInvoiceNumber,
  packageInvoiceCode,
  proofUploadsLeft,
  proofUploadsUsed,
  summarizeCreditRecord,
  validateProofFile,
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

describe("applySessionCancelled (kuota per paket, admin memilih potong kredit)", () => {
  test("tanpa potong: kredit utuh, cancelCount paket bertambah, ledger cancel_excused (juga setelah kuota lewat)", () => {
    let rec = recordWith(5);
    for (let i = 1; i <= CANCEL_QUOTA + 2; i += 1) rec = applySessionCancelled(rec, { packageId: "cp-1", scheduleId: `s-${i}`, deductCredit: false });
    expect(rec.packages[0].cancelCount).toBe(CANCEL_QUOTA + 2);
    expect(rec.packages[0].remainingCredit).toBe(5);
    expect(rec.history.every((h) => h.action === "cancel_excused" && h.creditChange === 0)).toBe(true);
    expect(rec.history.at(-1).cancelCountAfter).toBe(CANCEL_QUOTA + 2);
  });

  test("potong kredit: -1 kredit, cancelCount bertambah, ledger cancel_penalty (tanpa menunggu kuota habis)", () => {
    const rec = applySessionCancelled(recordWith(5), { packageId: "cp-1", scheduleId: "s-1", deductCredit: true });
    expect(rec.packages[0]).toMatchObject({ remainingCredit: 4, cancelCount: 1 });
    expect(rec.history.at(-1)).toMatchObject({ action: "cancel_penalty", creditChange: -1 });
  });

  test("tanpa keputusan (undefined) diperlakukan tidak potong", () => {
    const rec = applySessionCancelled(recordWith(5), { packageId: "cp-1", scheduleId: "s-1" });
    expect(rec.packages[0].remainingCredit).toBe(5);
    expect(rec.history.at(-1).action).toBe("cancel_excused");
  });

  test("potong tapi saldo paket 0 atau tanpa paket: tidak bisa memotong (cancel_excused)", () => {
    const empty = applySessionCancelled(recordWith(0), { packageId: "cp-1", scheduleId: "s-1", deductCredit: true });
    expect(empty.packages[0].remainingCredit).toBe(0);
    expect(empty.history.at(-1).action).toBe("cancel_excused");
    const none = applySessionCancelled(newCreditRecord({ clientId: "c-1" }), { scheduleId: "s-1", deductCredit: true });
    expect(none.history.at(-1)).toMatchObject({ action: "cancel_excused", packageName: "General" });
  });

  test("kuota dihitung per paket: paket lain tidak terpengaruh", () => {
    const rec = recordWith(5, {
      packages: [
        { id: "cp-1", packageId: "pkg-reguler", packageName: "A", totalCredit: 10, remainingCredit: 5, cancelCount: 2, status: "active" },
        { id: "cp-2", packageId: "pkg-vip", packageName: "B", totalCredit: 10, remainingCredit: 10, cancelCount: 0, status: "active" },
      ],
    });
    const next = applySessionCancelled(rec, { packageId: "cp-2", scheduleId: "s-1" });
    expect(next.packages.map((p) => p.cancelCount)).toEqual([2, 1]);
    expect(summarizeCreditRecord(next)).toMatchObject({ cancelCount: 2, cancelQuota: CANCEL_QUOTA }); // paket aktif = cp-1
    expect(activePackageOf(next).id).toBe("cp-1");
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
    expect(cancelled.packages[0].cancelCount).toBe(1);
    expect(next.packages[0].cancelCount).toBe(0);
    expect(next.packages[0].remainingCredit).toBe(5);
    expect(next.history.at(-1)).toMatchObject({ action: "reversal", creditChange: 0 });
  });

  test("revert penalti cancel: +1 kredit dan kuota −1", () => {
    const cancelled = applySessionCancelled(recordWith(5), { packageId: "cp-1", scheduleId: "s-9", deductCredit: true });
    expect(cancelled.packages[0]).toMatchObject({ remainingCredit: 4, cancelCount: 1 });
    const next = applySessionReverted(cancelled, { scheduleId: "s-9" });
    expect(next.packages[0]).toMatchObject({ remainingCredit: 5, cancelCount: 0 });
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

  test("nextInvoiceNumber: INV-{KODE}-{YYYYMMDD}-{NNN}, increment per kode + tanggal (reset harian)", () => {
    const now = new Date(2026, 9, 3); // 3 Okt 2026
    expect(nextInvoiceNumber([], { typeCode: "REG", now })).toBe("INV-REG-20261003-001");
    const invoices = [{ invoiceNumber: "INV-REG-20261003-007" }, { invoiceNumber: "INV-REG-20261003-002" }, { invoiceNumber: "INV-ASM-20261003-004" }, { invoiceNumber: "INV-2026-099" }];
    expect(nextInvoiceNumber(invoices, { typeCode: "REG", now })).toBe("INV-REG-20261003-008");
    expect(nextInvoiceNumber(invoices, { typeCode: "ASM", now })).toBe("INV-ASM-20261003-005");
    expect(nextInvoiceNumber(invoices, { typeCode: "REG", now: new Date(2026, 9, 4) })).toBe("INV-REG-20261004-001");
  });

  test("jenis invoice dan kode: assessment = ASM, paket = invoiceCode master (ASM dicadangkan)", () => {
    expect(invoiceType({})).toBe("package");
    expect(invoiceType({ type: "assessment" })).toBe("assessment");
    expect(invoiceTypeCode("assessment", null)).toBe("ASM");
    expect(invoiceTypeCode("package", { invoiceCode: "reg" })).toBe("REG");
    expect(packageInvoiceCode({ name: "Paket Konsultasi" })).toBe("PAK");
    expect(packageInvoiceCode({ invoiceCode: "ASM" })).toBe("PKT");
  });

  test("newClientPackage menyimpan snapshot harga", () => {
    expect(newClientPackage({ packageId: "p", packageName: "X", credits: 5, price: 123000 }).price).toBe(123000);
  });
});

describe("bukti pembayaran: JPG/PNG/PDF maks 5 MB, upload sekali + re-upload maks 3x", () => {
  const MB = 1024 * 1024;
  test("validateProofFile", () => {
    expect(validateProofFile({ name: "a.jpg", type: "image/jpeg", size: 1 * MB })).toBeNull();
    expect(validateProofFile({ name: "a.PNG", type: "", size: 5 * MB })).toBeNull();
    expect(validateProofFile({ name: "a.pdf", type: "application/pdf", size: 2 * MB })).toBeNull();
    expect(validateProofFile({ name: "a.webp", type: "image/webp", size: 1 * MB })).toMatch(/Format/);
    expect(validateProofFile({ name: "a.pdf", type: "application/pdf", size: 5 * MB + 1 })).toMatch(/5 MB/);
    expect(validateProofFile(null)).toBeTruthy();
  });

  test("batas upload: 1 + 3 re-upload, invoice lama dengan bukti dihitung 1x", () => {
    expect(proofUploadsUsed({})).toBe(0);
    expect(proofUploadsUsed({ proofUrl: "x" })).toBe(1);
    expect(proofUploadsUsed({ proofUploadCount: 3 })).toBe(3);
    expect(proofUploadsLeft({ proofUploadCount: 3 })).toBe(1);
    expect(canUploadProof({ status: "unpaid", proofUploadCount: 3 })).toBe(true);
    expect(canUploadProof({ status: "unpaid", proofUploadCount: 4 })).toBe(false);
    expect(canUploadProof({ status: "paid", proofUploadCount: 1 })).toBe(false);
    expect(canUploadProof(null)).toBe(false);
  });
});
