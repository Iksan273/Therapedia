import {
  CANCEL_QUOTA,
  appendInvoiceLog,
  applyBalanceToAmount,
  applyPackageConversion,
  computePackageConversion,
  invoiceLogMeta,
  invoiceLogsOf,
  validateDirectRenewal,
  distinctActivePackages,
  cancelQuotaByPackage,
  isCreditZero,
  canDeleteInvoice,
  canVoidInvoice,
  validateVoid,
  voidSummary,
  applyVoidRevoke,
  replacementCandidates,
  adoptPackageForReplacement,
  leftoverSummaryByClient,
  isCreditedAbsence,
  matchesFinanceSearch,
  invoiceConversionCount,
  isInvoiceConverted,
  lastInvoiceConversion,
  isInvoiceConvertible,
  resolveInvoicePackage,
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

describe("konversi paket", () => {
  const senior = { remainingCredit: 6, totalCredit: 10, price: 3500000 };
  const regular = { packageId: "pkg-reguler", packageName: "Regular Therapist", credits: 10, price: 2500000 };

  test("otomatis: nilai sisa → sesi dibulatkan ke bawah + lebihan", () => {
    const r = computePackageConversion({ source: senior, target: regular });
    expect(r).toMatchObject({ ok: true, mode: "auto", sessions: 8, maxSessions: 8, remainingValue: 2100000, leftover: 100000 });
  });

  test("manual boleh lebih sedikit dari maksimal; lebihan ikut membesar", () => {
    const r = computePackageConversion({ source: senior, target: regular, sessions: 6 });
    expect(r).toMatchObject({ ok: true, mode: "manual", sessions: 6, leftover: 600000 });
  });

  test("manual tidak boleh melebihi nilai sisa (tanpa kekurangan)", () => {
    expect(computePackageConversion({ source: senior, target: regular, sessions: 9 }).ok).toBe(false);
    expect(computePackageConversion({ source: senior, target: regular, sessions: 0 }).ok).toBe(false);
    expect(computePackageConversion({ source: senior, target: regular, sessions: 2.5 }).ok).toBe(false);
  });

  test("sisa kurang dari 1 sesi tujuan / tanpa sisa / tanpa harga ditolak", () => {
    expect(computePackageConversion({ source: { ...senior, remainingCredit: 0 }, target: regular }).ok).toBe(false);
    expect(computePackageConversion({ source: { remainingCredit: 1, totalCredit: 10, price: 100000 }, target: regular }).ok).toBe(false);
    expect(computePackageConversion({ source: { ...senior, price: null }, target: regular }).ok).toBe(false);
  });

  const seniorRecord = () => ({
    ...newCreditRecord({ clientId: "c-1", branchId: "b-1", id: "cr-1" }),
    packages: [{ id: "cp-s", invoiceId: "inv-1", packageId: "pkg-vip", packageName: "Senior Therapist (10x)", price: 3500000, totalCredit: 10, remainingCredit: 6, cancelCount: 2, status: "active" }],
  });

  test("applyPackageConversion: ledger out/in, kuota cancel pindah, saldo bertambah", () => {
    const next = applyPackageConversion(seniorRecord(), {
      sourcePackageId: "cp-s",
      target: { packageId: "pkg-reguler", packageName: "Regular Therapist (8x)" },
      sessions: 8,
      price: 2000000,
      leftover: 100000,
      conversionId: "cv-1",
    });
    const [oldPkg, newPkg] = next.packages;
    expect(oldPkg).toMatchObject({ status: "converted", remainingCredit: 0, convertedToId: newPkg.id });
    expect(newPkg).toMatchObject({ totalCredit: 8, remainingCredit: 8, cancelCount: 2, convertedFromId: "cp-s", status: "active" });
    expect(next.balance).toBe(100000);
    expect(next.history.map((h) => [h.action, h.creditChange, h.conversionId])).toEqual([
      ["converted_out", -6, "cv-1"],
      ["converted_in", 8, "cv-1"],
    ]);
  });

  test("paket yang sudah dikonversi tidak bisa dikonversi lagi (record tak berubah)", () => {
    const once = applyPackageConversion(seniorRecord(), { sourcePackageId: "cp-s", target: {}, sessions: 8, price: 2000000, conversionId: "cv-1" });
    expect(applyPackageConversion(once, { sourcePackageId: "cp-s", target: {}, sessions: 8, price: 2000000, conversionId: "cv-2" })).toBe(once);
  });

  test("resolveInvoicePackage mengikuti rantai konversi; isInvoiceConvertible hanya invoice lunas + sisa > 0", () => {
    const inv = { id: "inv-1", type: "package", status: "paid", packageId: "pkg-vip", credits: 10 };
    const rec = seniorRecord();
    expect(isInvoiceConvertible(rec, inv)).toBe(true);
    expect(isInvoiceConvertible(rec, { ...inv, status: "unpaid" })).toBe(false);
    const next = applyPackageConversion(rec, { sourcePackageId: "cp-s", target: { packageName: "Regular" }, sessions: 8, price: 2000000, conversionId: "cv-1" });
    expect(resolveInvoicePackage(next, inv).convertedFromId).toBe("cp-s");
    expect(isInvoiceConvertible(next, inv)).toBe(true);
  });

  test("invoice lama tanpa invoiceId dicocokkan lewat packageId + kredit", () => {
    const rec = seniorRecord();
    rec.packages[0].invoiceId = undefined;
    expect(resolveInvoicePackage(rec, { id: "inv-x", type: "package", packageId: "pkg-vip", credits: 10 })?.id).toBe("cp-s");
    expect(resolveInvoicePackage(rec, { id: "inv-y", type: "assessment" })).toBeNull();
  });
});

describe("saldo lebihan → invoice", () => {
  test("memotong sampai nominal invoice; sisa tetap di saldo", () => {
    expect(applyBalanceToAmount(100000, 2500000)).toEqual({ gross: 2500000, applied: 100000, net: 2400000, balanceAfter: 0 });
    expect(applyBalanceToAmount(3000000, 2500000)).toEqual({ gross: 2500000, applied: 2500000, net: 0, balanceAfter: 500000 });
    expect(applyBalanceToAmount(0, 2500000).applied).toBe(0);
  });
});

describe("renewal langsung lunas", () => {
  test("wajib alasan valid + justifikasi minimal 10 karakter", () => {
    expect(validateDirectRenewal({})).toMatch(/Alasan/);
    expect(validateDirectRenewal({ reason: "Tunai", justification: "singkat" })).toMatch(/Justifikasi/);
    expect(validateDirectRenewal({ reason: "  ", justification: "x".repeat(20) })).toMatch(/Alasan/);
    expect(validateDirectRenewal({ reason: "Bayar tunai di kasir", justification: "  Tunai di kasir, struk 123  " })).toBeNull();
  });
});

describe("paket aktif distinct (roster)", () => {
  test("menyembunyikan paket habis dan menggabungkan paket sejenis", () => {
    const pk = (id, packageName, remainingCredit) => ({ id, packageName, remainingCredit });
    const out = distinctActivePackages([
      pk("a", "Regular Therapist (10x)", 0),
      pk("b", "Regular Therapist (10x)", 4),
      pk("c", "Paket Reguler", 3),
      pk("d", "Senior Therapist (10x)", 0),
    ]);
    expect(out).toEqual([{ name: "Regular Therapist", remainingCredit: 7, packageCount: 2 }]);
    expect(distinctActivePackages([pk("x", "Senior Therapist (5x)", 0)])).toEqual([]);
    // semua habis + fallbackLast: tampilkan satu paket terakhir
    expect(distinctActivePackages([pk("x", "Senior Therapist (5x)", 0), pk("y", "Regular Therapist (10x)", 0)], { fallbackLast: true })).toEqual([
      { name: "Regular Therapist", remainingCredit: 0, packageCount: 1, depleted: true },
    ]);
  });
});

describe("pencarian keuangan", () => {
  test("cocok nama anak, ortu, kode client, atau no. invoice", () => {
    const client = { clientName: "Kenzo Wirawan", parentName: "Lia Wirawan", clientCode: "KO-00007" };
    const inv = { clientName: "Kenzo Wirawan", invoiceNumber: "INV-REG-20261003-001" };
    expect(matchesFinanceSearch(inv, client, "ken")).toBe(true);
    expect(matchesFinanceSearch(inv, client, "lia")).toBe(true);
    expect(matchesFinanceSearch(inv, client, "ko-0")).toBe(true);
    expect(matchesFinanceSearch(inv, client, "20261003")).toBe(true);
    expect(matchesFinanceSearch(inv, client, "zzz")).toBe(false);
    expect(matchesFinanceSearch(inv, null, "ken")).toBe(true);
  });
});

describe("tidak hadir (analitik kehadiran)", () => {
  const h = (id, scheduleId, action, reversesId) => ({ id, scheduleId, action, reversesId });
  test("hanya cancel yang memotong kredit (belum dibalik) dihitung", () => {
    const rec = { history: [h("1", "s1", "cancel_penalty"), h("2", "s2", "cancel_excused"), h("3", "s3", "cancel_penalty"), h("4", "s3", "reversal", "3")] };
    expect(isCreditedAbsence(rec, "s1")).toBe(true);
    expect(isCreditedAbsence(rec, "s2")).toBe(false); // cancel tanpa potong kredit
    expect(isCreditedAbsence(rec, "s3")).toBe(false); // sudah dibalik (revert)
    expect(isCreditedAbsence(null, "s1")).toBe(false);
  });
});

describe("void & hapus invoice", () => {
  const inv = { id: "i1", clientId: "c1", type: "package", status: "paid", balanceApplied: 100000 };
  const record = {
    clientId: "c1",
    balance: 0,
    packages: [
      { id: "p1", invoiceId: "i1", packageName: "Regular Therapist (10x)", remainingCredit: 0, status: "converted", convertedToId: "p2" },
      { id: "p2", convertedFromId: "p1", packageName: "Regular Therapist (8x)", remainingCredit: 5, status: "active" },
    ],
    history: [],
  };
  const sessions = [
    { id: "s1", creditPackageId: "p1", status: "completed", type: "therapy", date: "2026-01-01" },
    { id: "s2", creditPackageId: "p2", status: "completed", type: "therapy", date: "2026-02-01" },
    { id: "s3", creditPackageId: "p2", status: "scheduled", type: "therapy", date: "2099-01-01" },
    { id: "s4", creditPackageId: null, status: "completed", type: "assessment", date: "2026-01-01" },
  ];

  test("hapus hanya invoice belum lunas; void hanya invoice lunas", () => {
    expect(canDeleteInvoice({ status: "unpaid" })).toBe(true);
    expect(canDeleteInvoice({ status: "paid" })).toBe(false);
    expect(canDeleteInvoice({ status: "void" })).toBe(false);
    expect(canVoidInvoice({ status: "paid" })).toBe(true);
    expect(canVoidInvoice({ status: "unpaid" })).toBe(false);
  });

  test("validateVoid: alasan wajib; pilihan kredit wajib bila ada paket", () => {
    expect(validateVoid({ reason: " ", creditAction: "keep", hasPackage: true })).toMatch(/Alasan/);
    expect(validateVoid({ reason: "salah input", creditAction: "", hasPackage: true })).toMatch(/kredit/);
    expect(validateVoid({ reason: "salah input", creditAction: "", hasPackage: false })).toBeNull();
    expect(validateVoid({ reason: "salah input", creditAction: "keep", hasPackage: true })).toBeNull();
  });

  test("voidSummary mengikuti rantai konversi sampai paket hidup", () => {
    const sum = voidSummary(record, inv, sessions, "2026-10-04");
    expect(sum).toMatchObject({ hasPackage: true, livePackageId: "p2", remaining: 5, usedSessions: 2, upcomingSessions: 1, balanceApplied: 100000 });
    expect(sum.chainIds.sort()).toEqual(["p1", "p2"]);
  });

  test("applyVoidRevoke: paket hidup jadi voided (sisa 0, ledger −sisa), saldo lebihan kembali; paket lain & sesi tak berubah", () => {
    const out = applyVoidRevoke(record, inv, { note: "void" });
    const live = out.packages.find((p) => p.id === "p2");
    expect(live).toMatchObject({ remainingCredit: 0, status: "voided" });
    expect(out.balance).toBe(100000);
    expect(out.history).toHaveLength(1);
    expect(out.history[0]).toMatchObject({ action: "manual_adjust", creditChange: -5, packageId: "p2" });
    expect(activePackageOf(out)?.status).not.toBe("voided");
  });

  test("replacementCandidates & adoptPackageForReplacement: paket lama dipakai ulang tanpa menambah kredit", () => {
    const voided = { id: "i1", clientId: "c1", type: "package", status: "void", voidCreditAction: "keep" };
    expect(replacementCandidates([voided], "c1")).toHaveLength(1);
    expect(replacementCandidates([voided, { id: "i2", clientId: "c1", replacesInvoiceId: "i1" }], "c1")).toHaveLength(0);
    expect(replacementCandidates([{ ...voided, voidCreditAction: "revoke" }], "c1")).toHaveLength(0);
    const rec = { packages: [{ id: "p1", invoiceId: "i1", remainingCredit: 4, totalCredit: 10 }] };
    const { record: next, adopted } = adoptPackageForReplacement(rec, "i1", { id: "i9", amount: 2400000, grossAmount: 2500000 });
    expect(adopted).toBe(true);
    expect(next.packages[0]).toMatchObject({ invoiceId: "i9", remainingCredit: 4, price: 2500000 });
  });
});

describe("ringkasan saldo lebihan per client", () => {
  const invoices = [
    { id: "i1", invoiceNumber: "INV-SEN-1", clientId: "c1", createdAt: "2026-09-01" },
    { id: "i2", invoiceNumber: "INV-REG-2", clientId: "c1", createdAt: "2026-10-02", balanceApplied: 30000, status: "paid" },
    { id: "i3", invoiceNumber: "INV-REG-3", clientId: "c1", createdAt: "2026-10-03", balanceApplied: 20000, status: "void", voidCreditAction: "revoke" },
  ];
  const conversions = [{ id: "cv1", clientId: "c1", invoiceId: "i1", toPackageName: "Regular", toSessions: 8, mode: "auto", leftover: 100000, createdAt: "2026-09-02T10:00:00Z" }];

  test("sumber dari konversi (dengan invoice asal), pemakaian dari invoice; void-revoke tidak dihitung sebagai terpakai", () => {
    const [row] = leftoverSummaryByClient({ records: [{ clientId: "c1", balance: 70000 }], conversions, invoices });
    expect(row.sources).toHaveLength(1);
    expect(row.sources[0]).toMatchObject({ invoiceNumber: "INV-SEN-1", amount: 100000, toSessions: 8 });
    expect(row.uses.map((u) => [u.invoiceNumber, u.returned])).toEqual([["INV-REG-3", true], ["INV-REG-2", false]]);
    expect(row).toMatchObject({ totalIn: 100000, totalOut: 30000, expected: 70000, balance: 70000, inSync: true });
  });

  test("saldo tersimpan beda dari hitungan = tidak sinkron; client tanpa saldo & riwayat tidak muncul", () => {
    const [row] = leftoverSummaryByClient({ records: [{ clientId: "c1", balance: 999 }], conversions, invoices });
    expect(row.inSync).toBe(false);
    expect(leftoverSummaryByClient({ records: [{ clientId: "c9", balance: 0 }], conversions: [], invoices: [] })).toEqual([]);
  });
});

describe("Frozen", () => {
  test("kredit 0 atau belum punya paket/record = Frozen", () => {
    expect(isCreditZero(null)).toBe(true);
    expect(isCreditZero(undefined)).toBe(true);
    expect(isCreditZero({ remainingCredit: 0 })).toBe(true);
    expect(isCreditZero({ remainingCredit: 3 })).toBe(false);
  });
});

describe("kuota cancel per paket", () => {
  const pk = (id, packageName, remainingCredit, cancelCount) => ({ id, packageName, remainingCredit, cancelCount });
  test("dirinci per paket aktif, paket sejenis bernomor, paket habis disembunyikan", () => {
    const out = cancelQuotaByPackage({ packages: [pk("a", "Regular Therapist (10x)", 0, 3), pk("b", "Regular Therapist (10x)", 4, 2), pk("c", "Regular Therapist (5x)", 3, 4), pk("d", "Senior Therapist (10x)", 5, 1)] });
    expect(out.rows.map((r) => [r.label, r.cancelCount, r.over])).toEqual([
      ["Regular Therapist #1", 2, false],
      ["Regular Therapist #2", 4, true],
      ["Senior Therapist", 1, false],
    ]);
    expect(out.total).toBe(7);
    expect(out.anyOver).toBe(true);
  });

  test("tanpa paket bersisa: tampilkan paket terakhir; tanpa paket: kosong", () => {
    expect(cancelQuotaByPackage({ packages: [pk("a", "Senior Therapist (10x)", 0, 2), pk("b", "Regular Therapist (10x)", 0, 1)] }).rows).toHaveLength(1);
    expect(cancelQuotaByPackage(null).rows).toEqual([]);
  });
});

describe("log invoice", () => {
  test("appendInvoiceLog append-only; invoiceLogsOf memberi baris dasar untuk invoice lama", () => {
    const inv = { id: "inv-1", createdAt: "2026-10-01", paidAt: "2026-10-02" };
    expect(invoiceLogsOf(inv).map((l) => l.action)).toEqual(["issued", "verified"]);
    const next = appendInvoiceLog(inv, { action: "converted", by: "Finance", note: "x" });
    expect(next.logs).toHaveLength(1);
    expect(inv.logs).toBeUndefined();
    expect(invoiceLogMeta("converted").label).toBe("Paket dikonversi");
    expect(isInvoiceConverted(inv)).toBe(false);
    expect(isInvoiceConverted(next)).toBe(true);
    expect(invoiceConversionCount(appendInvoiceLog(next, { action: "converted" }))).toBe(2);
    expect(lastInvoiceConversion(next).by).toBe("Finance");
  });
});
