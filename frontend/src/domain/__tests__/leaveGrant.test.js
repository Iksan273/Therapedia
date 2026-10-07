import { describe, expect, it } from "vitest";
import { clientLeaveContext, newClientPackage, newCreditRecord, packageLeaveConfig } from "@/domain/credit";

const masters = [
  { id: "pkg-reguler", leaveQuota: 3, isSatuan: false },
  { id: "pkg-satuan", leaveQuota: 2, isSatuan: true },
];

describe("domain/credit — konfigurasi master & konteks cuti 30 hari", () => {
  it("packageLeaveConfig: credit leave per paket (leaveQuota), satuan, asesmen; default aman untuk master lama", () => {
    expect(packageLeaveConfig({})).toEqual({ leaveQuota: 0, isSatuan: false, isAssessment: false });
    expect(packageLeaveConfig({ leaveQuota: "4", isSatuan: true })).toMatchObject({ leaveQuota: 4, isSatuan: true });
  });

  it("newClientPackage membawa credit leave (leaveTotal) dan penghitung pakai (leaveUsed)", () => {
    expect(newClientPackage({ packageId: "pkg-reguler", credits: 10, leaveTotal: 4 })).toMatchObject({ leaveTotal: 4, leaveUsed: 0 });
    expect(newClientPackage({ packageId: "pkg-reguler", credits: 10 }).leaveTotal).toBe(3);
  });

  it("clientLeaveContext: jatah cuti 30 hari/tahun (BUKAN credit leave paket), reset, dan penanda satuan dari paket aktif", () => {
    const base = { ...newCreditRecord({ clientId: "c1" }), leaveGranted: 5, leaveResetAt: "2026-10-01" };
    const reg = { ...base, packages: [newClientPackage({ packageId: "pkg-reguler", credits: 10 })] };
    const sat = { ...base, packages: [newClientPackage({ packageId: "pkg-satuan", credits: 1 })] };
    expect(clientLeaveContext(reg, masters)).toEqual({ granted: 5, since: "2026-10-01", isSatuan: false });
    expect(clientLeaveContext(sat, masters).isSatuan).toBe(true);
    expect(clientLeaveContext(null, masters)).toEqual({ granted: 30, since: null, isSatuan: false });
    expect(clientLeaveContext(reg, masters, "2026-11-01").since).toBe("2026-11-01"); // reset tahunan semua client lebih baru
  });
});
