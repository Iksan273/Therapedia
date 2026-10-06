import { buildSamePackageRenewal, hasOpenPackageInvoice, invoicesForParent, needsRenewal, parentInvoiceStatus } from "@/domain/credit";

const pkg = (remainingCredit, extra = {}) => ({ id: "cp-1", packageId: "pkg-reguler", packageName: "Regular Therapist (10x)", totalCredit: 10, remainingCredit, price: 2500000, ...extra });
const master = [{ id: "pkg-reguler", name: "Regular Therapist", credits: 10, price: 2400000, invoiceCode: "REG" }];

describe("renewal cepat Finance", () => {
  test("perlu renewal bila total sisa kredit < 3 (termasuk 0 / Frozen)", () => {
    expect(needsRenewal({ packages: [pkg(2)] })).toBe(true);
    expect(needsRenewal({ packages: [pkg(0)] })).toBe(true);
    expect(needsRenewal({ packages: [pkg(3)] })).toBe(false);
    expect(needsRenewal({ packages: [pkg(1), pkg(5, { id: "cp-2" })] })).toBe(false);
    expect(needsRenewal({ packages: [] })).toBe(false);
    expect(needsRenewal(null)).toBe(false);
    expect(needsRenewal({ packages: [pkg(1, { status: "voided" })] })).toBe(false);
  });

  test("invoice renewal memakai paket yang sama dengan paket aktif", () => {
    const r = buildSamePackageRenewal({ packages: [pkg(2)] }, master);
    expect(r).toEqual({ packageId: "pkg-reguler", packageName: "Regular Therapist (10x)", typeCode: "REG", credits: 10, amount: 2500000 });
    expect(buildSamePackageRenewal({ packages: [pkg(2, { price: 0 })] }, master).amount).toBe(2400000);
    expect(buildSamePackageRenewal({ packages: [] }, master)).toBeNull();
  });

  test("invoice paket yang belum lunas terdeteksi per client", () => {
    const inv = [{ clientId: "c1", type: "package", status: "unpaid" }, { clientId: "c2", type: "package", status: "paid" }, { clientId: "c3", type: "assessment", status: "unpaid" }];
    expect(hasOpenPackageInvoice(inv, "c1")).toBe(true);
    expect(hasOpenPackageInvoice(inv, "c2")).toBe(false);
    expect(hasOpenPackageInvoice(inv, "c3")).toBe(false);
  });
});

describe("riwayat invoice portal ortu", () => {
  test("status versi ortu: belum bayar, bukti diterima, lunas", () => {
    expect(parentInvoiceStatus({ status: "unpaid" })).toBe("unpaid");
    expect(parentInvoiceStatus({ status: "unpaid", proofUploadCount: 1 })).toBe("proof_received");
    expect(parentInvoiceStatus({ status: "unpaid", proofUrl: "data:x" })).toBe("proof_received");
    expect(parentInvoiceStatus({ status: "paid" })).toBe("paid");
  });
  test("hanya invoice anak ini, semua jenis, tanpa void, terbaru dulu", () => {
    const inv = [
      { id: "1", clientId: "c1", type: "package", status: "paid", createdAt: "2026-09-01", invoiceNumber: "A" },
      { id: "2", clientId: "c1", type: "assessment", status: "unpaid", createdAt: "2026-10-01", invoiceNumber: "B" },
      { id: "3", clientId: "c1", type: "leave", status: "void", createdAt: "2026-10-02", invoiceNumber: "C" },
      { id: "4", clientId: "c2", type: "package", status: "paid", createdAt: "2026-10-03", invoiceNumber: "D" },
    ];
    expect(invoiceIds(invoicesForParent(inv, "c1"))).toEqual(["2", "1"]);
  });
});
const invoiceIds = (l) => l.map((i) => i.id);
