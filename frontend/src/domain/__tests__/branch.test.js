import { activeBankAccounts, validateBankAccount, BRANCHES, branchDeleteImpact, activeBranches, branchName, newBranchId, syncBranches, validateBranch, DEFAULT_BRANCHES, inBranchScope } from "@/domain/branch";

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

describe("cakupan cabang (branchId null = semua cabang)", () => {
  test("activeBranch all/kosong menampilkan semua", () => {
    expect(inBranchScope("branch-sby-timur", "all")).toBe(true);
    expect(inBranchScope("branch-citraland", undefined)).toBe(true);
  });
  test("activeBranch satu cabang: hanya cabang itu + entitas tanpa cabang (semua cabang)", () => {
    expect(inBranchScope("branch-sby-timur", "branch-sby-timur")).toBe(true);
    expect(inBranchScope("branch-citraland", "branch-sby-timur")).toBe(false);
    expect(inBranchScope(null, "branch-sby-timur")).toBe(true);
    expect(inBranchScope(undefined, "branch-citraland")).toBe(true);
  });
});

describe("rekening bank cabang", () => {
  const ok = { bankName: "BCA", accountNumber: "0123 456-789", accountHolder: "PT Therapedia" };
  const existing = [{ id: "a1", bankName: "BCA", accountNumber: "111", accountHolder: "X", isActive: true, sortOrder: 1 }];

  test("validateBankAccount: wajib diisi, no. rekening angka, pasangan bank+no unik per cabang", () => {
    expect(validateBankAccount(ok, existing)).toBeNull();
    expect(validateBankAccount({ ...ok, bankName: " " }, existing)).toMatch(/bank/i);
    expect(validateBankAccount({ ...ok, accountNumber: "" }, existing)).toMatch(/rekening/i);
    expect(validateBankAccount({ ...ok, accountNumber: "abc" }, existing)).toMatch(/angka/i);
    expect(validateBankAccount({ ...ok, accountHolder: "" }, existing)).toMatch(/pemilik/i);
    expect(validateBankAccount({ ...ok, bankName: "bca", accountNumber: "111" }, existing)).toMatch(/sudah terdaftar/i);
    expect(validateBankAccount({ ...ok, bankName: "BCA", accountNumber: "111" }, existing, "a1")).toBeNull(); // mengedit dirinya sendiri
    expect(validateBankAccount({ ...ok, bankName: "BNI", accountNumber: "111" }, existing)).toBeNull(); // bank beda
  });

  test("activeBankAccounts: hanya aktif, urut sortOrder; data lama tanpa field = kosong", () => {
    const branch = {
      bankAccounts: [
        { id: "b", isActive: true, sortOrder: 2 },
        { id: "x", isActive: false, sortOrder: 1 },
        { id: "a", isActive: true, sortOrder: 1 },
      ],
    };
    expect(activeBankAccounts(branch).map((a) => a.id)).toEqual(["a", "b"]);
    expect(activeBankAccounts({})).toEqual([]);
    expect(activeBankAccounts(undefined)).toEqual([]);
  });
});
