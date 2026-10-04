import { BRANCHES, branchDeleteImpact, activeBranches, branchName, newBranchId, syncBranches, validateBranch, DEFAULT_BRANCHES } from "@/domain/branch";

afterEach(() => syncBranches(DEFAULT_BRANCHES));

describe("master cabang", () => {
  test("validateBranch: nama & kode wajib, kode 2–10 huruf/angka, unik (abaikan diri sendiri)", () => {
    expect(validateBranch({ name: "", code: "AB" })).toMatch(/Nama/);
    expect(validateBranch({ name: "X", code: "a" })).toMatch(/Kode/);
    expect(validateBranch({ name: "X", code: "ab-1" })).toMatch(/Kode/);
    expect(validateBranch({ name: "Surabaya Selatan", code: "sel" })).toBeNull();
    expect(validateBranch({ name: "Baru", code: "east" })).toMatch(/sudah dipakai/);
    expect(validateBranch({ name: "EAST", code: "ZZ" })).toMatch(/Nama/);
    expect(validateBranch({ name: "East", code: "EAST" }, undefined, "branch-sby-timur")).toBeNull();
  });

  test("syncBranches menyinkronkan registry; cabang nonaktif tetap punya nama tapi tidak aktif", () => {
    syncBranches([...DEFAULT_BRANCHES, { id: "branch-x", name: "Selatan", code: "SEL", isActive: false }]);
    expect(BRANCHES).toHaveLength(4);
    expect(branchName("branch-x")).toBe("Selatan");
    expect(activeBranches().map((b) => b.id)).not.toContain("branch-x");
    syncBranches([]); // cabang dihapus permanen = hilang dari registry
    expect(BRANCHES).toHaveLength(0);
    expect(branchName("branch-sby-timur")).toBe("—");
  });

  test("branchDeleteImpact: menghitung isi cabang yang ikut terhapus", () => {
    const impact = branchDeleteImpact("a", {
      clients: [{ branchId: "a" }, { branchId: "a" }, { branchId: "b" }],
      schedules: [{ branchId: "a" }],
      invoices: [{ branchId: "a" }, { branchId: "b" }],
      staff: [{ branchId: "a" }],
      holidays: [{ branchId: null }, { branchId: "a" }],
    });
    expect(impact).toEqual({ clients: 2, sessions: 1, invoices: 1, staff: 1, holidays: 1 });
  });

  test("newBranchId dari nama", () => {
    expect(newBranchId("Surabaya Selatan")).toBe("branch-surabaya-selatan");
  });
});
