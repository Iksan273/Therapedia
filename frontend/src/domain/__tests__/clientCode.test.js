import { clientCodeGroup, nextClientCode, matchesClientSearch, makeInquiryClient } from "@/domain/client";
import {
  buildQuestionnaireCode,
  buildExpiresAt,
  categoryTypeCode,
  checkQuestionnaireAccess,
  hasPendingAssessmentInvoice,
  isQuestionnaireCodeExpired,
  isTypeCodeTaken,
  normalizeTypeCode,
} from "@/domain/assessment";

describe("kode client (AE/FJ/KO/PT/UZ + 5 digit per grup)", () => {
  test("grup ditentukan dari huruf pertama nama", () => {
    expect(clientCodeGroup("Ayla")).toBe("AE");
    expect(clientCodeGroup("eko")).toBe("AE");
    expect(clientCodeGroup("Farrel")).toBe("FJ");
    expect(clientCodeGroup("Jonathan")).toBe("FJ");
    expect(clientCodeGroup("Kenzo")).toBe("KO");
    expect(clientCodeGroup("Orlando")).toBe("KO");
    expect(clientCodeGroup("Putra")).toBe("PT");
    expect(clientCodeGroup("Tristan")).toBe("PT");
    expect(clientCodeGroup("Ulfa")).toBe("UZ");
    expect(clientCodeGroup("Zahra")).toBe("UZ");
  });

  test("nama kosong, diawali spasi/simbol, atau beraksen tetap menghasilkan grup valid", () => {
    expect(clientCodeGroup("")).toBe("AE");
    expect(clientCodeGroup("  (Kenzo)")).toBe("KO");
    expect(clientCodeGroup("Édo")).toBe("AE");
  });

  test("counter berurutan per grup, tidak terpengaruh grup lain", () => {
    expect(nextClientCode("Ayla", [])).toBe("AE-00001");
    expect(nextClientCode("Ayla", ["AE-00001", "AE-00002", "KO-00009"])).toBe("AE-00003");
    expect(nextClientCode("Kenzo", ["AE-00001", "AE-00002"])).toBe("KO-00001");
    expect(nextClientCode("Kenzo", ["KO-00041", "KO-00007"])).toBe("KO-00042");
    expect(nextClientCode("Zahra", ["TDC-1009", "bukan-kode", null])).toBe("UZ-00001");
  });

  test("makeInquiryClient memakai existingCodes dan tidak berubah oleh edit nama", () => {
    const form = { clientName: "Ken", parentName: "A", parentContact: "1", dob: "2020-01-01" };
    const first = makeInquiryClient(form, ["KO-00001"]);
    expect(first.clientCode).toBe("KO-00002");
    expect({ ...first, clientName: "Zed" }.clientCode).toBe("KO-00002");
  });
});

describe("pencarian client", () => {
  const client = { clientName: "Kenzo Wirawan", parentName: "Liana Santoso", clientCode: "KO-00001" };
  test("awal nama, awal kata, nama ortu, dan awal kode", () => {
    expect(matchesClientSearch(client, "Ken")).toBe(true);
    expect(matchesClientSearch(client, "wira")).toBe(true);
    expect(matchesClientSearch(client, "lia")).toBe(true);
    expect(matchesClientSearch(client, "ko-000")).toBe(true);
    expect(matchesClientSearch(client, "")).toBe(true);
  });
  test("tidak cocok bila hanya di tengah kata", () => {
    expect(matchesClientSearch(client, "enzo")).toBe(false);
    expect(matchesClientSearch(client, "00001")).toBe(false);
  });
});

describe("kode kuesioner (kode jenis + acak) dan akses ortu", () => {
  const cat = { id: "cat-001", typeCode: "SP2" };
  const seq = (values) => {
    let i = 0;
    return () => values[i++ % values.length];
  };

  test("format {typeCode}-{6 karakter} dan unik", () => {
    const code = buildQuestionnaireCode(cat, [], seq([0.0, 0.1, 0.2, 0.3, 0.4, 0.5]));
    expect(code).toMatch(/^SP2-[A-Z2-9]{6}$/);
    const again = buildQuestionnaireCode(cat, [code], seq([0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4]));
    expect(again).not.toBe(code);
  });

  test("kategori tanpa typeCode memakai ASM; typeCode dinormalisasi dan harus unik", () => {
    expect(categoryTypeCode({})).toBe("ASM");
    expect(normalizeTypeCode(" sp-2! ")).toBe("SP2");
    expect(isTypeCodeTaken([{ id: "a", typeCode: "SP2" }], "sp2")).toBe(true);
    expect(isTypeCodeTaken([{ id: "a", typeCode: "SP2" }], "sp2", "a")).toBe(false);
  });

  test("masa berlaku opsional dicek saat dibuka", () => {
    const now = new Date("2026-10-10T00:00:00Z");
    expect(buildExpiresAt(null, now)).toBeNull();
    expect(buildExpiresAt(7, now)).toBe("2026-10-17T00:00:00.000Z");
    expect(isQuestionnaireCodeExpired({ expiresAt: null }, now)).toBe(false);
    expect(isQuestionnaireCodeExpired({ expiresAt: "2026-10-09T00:00:00Z" }, now)).toBe(true);
    expect(isQuestionnaireCodeExpired({ expiresAt: "2026-10-11T00:00:00Z" }, now)).toBe(false);
  });

  test("akses: sekali isi, kedaluwarsa, dan invoice assessment belum dibayar", () => {
    const now = new Date("2026-10-10T00:00:00Z");
    const client = { assessmentAnswers: [] };
    const open = { code: "SP2-AAAAAA", categoryId: "cat-001", status: "issued" };
    expect(checkQuestionnaireAccess({ client, codeItem: open, now })).toEqual({ ok: true });
    expect(checkQuestionnaireAccess({ client, codeItem: { ...open, status: "submitted" }, now })).toEqual({ ok: false, reason: "submitted" });
    expect(checkQuestionnaireAccess({ client, codeItem: { ...open, expiresAt: "2026-10-01T00:00:00Z" }, now })).toEqual({ ok: false, reason: "expired" });
    const unpaid = [{ type: "assessment", status: "unpaid" }];
    expect(checkQuestionnaireAccess({ client, codeItem: open, invoices: unpaid, now })).toEqual({ ok: false, reason: "invoice_unpaid" });
    expect(hasPendingAssessmentInvoice([{ type: "assessment", status: "paid" }, { type: "package", status: "unpaid" }])).toBe(false);
  });
});
