// @vitest-environment jsdom
// M2 mode API: store cabang & terapis serta hook admin (staf, role) memakai Laravel lewat react-query. httpClient di-mock;
// payload di bawah = bentuk respons backend setelah interceptor (key camelCase).
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { STORAGE_PREFIX } from "@/services/storage/localStore";
import { ACCESS_MODULES } from "@/domain/rbac";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/config/env", () => ({
  ENV: { DATA_SOURCE: "api", API_BASE_URL: "http://api.test/api/v1", API_TIMEOUT_MS: 1000, LANDING_URL: "", IS_DEV: false },
  isApiMode: () => true,
}));

const apiMock = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), upload: vi.fn(), list: vi.fn() };
vi.mock("@/services/http/httpClient", () => ({ api: apiMock, setUnauthorizedHandler: () => {} }));

const { default: AppProviders } = await import("@/app/providers/AppProviders");
const { useAuth } = await import("@/stores/authStore");
const { useBranches } = await import("@/stores/branchesStore");
const { useTherapists } = await import("@/stores/therapistsStore");
const { useRoleAdmin } = await import("@/features/master/hooks/useRoleAdmin");
const { useStaffAdmin } = await import("@/features/master/hooks/useStaffAdmin");
const { useBranchDeleteActions } = await import("@/features/master/hooks/useBranchDeleteActions");
const { tokenStore } = await import("@/services/http/tokenStore");
const { BRANCHES } = await import("@/domain/branch");

const BRANCH_ROWS = [
  { id: 1, code: "EAST", name: "East", city: "Surabaya", address: "Jl. A", phone: "031-1", isActive: true, bankAccounts: [] },
  { id: 2, code: "CTL", name: "Citraland", city: "Surabaya", address: null, phone: null, isActive: false },
];
const THERAPIST_ROWS = [{ id: 7, name: "Adi", title: "S.Ft", specialty: "Okupasi", branchId: 1, maxSessionsPerMonth: 100 }];
const ROLE_ROWS = [
  { id: 1, code: "master", name: "Master Director", badge: "Headquarter", description: null, isSystem: true, usersCount: 1, permissions: ["finance", "rbac"] },
  { id: 5, code: "finance", name: "Role Finance", badge: "Billing", description: "Keuangan", isSystem: true, usersCount: 2, permissions: ["finance"] },
  { id: 9, code: "koordinator", name: "Koordinator", badge: "", description: null, isSystem: false, usersCount: 0, permissions: [] },
];
const USER_ROW = (id, extra = {}) => ({
  id, name: `Staf ${id}`, email: `staf${id}@x.id`, phone: null, title: null, specialty: null,
  role: { id: 5, code: "finance", name: "Role Finance", badge: "Billing" },
  branchId: 1, branch: { id: 1, code: "EAST", name: "East" }, isActive: true, mustChangePassword: false, lastLoginAt: null, ...extra,
});

const usersCalls = () => apiMock.list.mock.calls.filter(([url]) => url === "/users"); // cache client (M4) ikut memakai api.list
let ctx;
function Probe({ staffArgs = { branchFilter: "all", search: "" } }) {
  ctx = {
    auth: useAuth(),
    branches: useBranches(),
    therapists: useTherapists(),
    roles: useRoleAdmin(),
    staff: useStaffAdmin(staffArgs),
    deleteActions: useBranchDeleteActions(),
  };
  return null;
}

let root;
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 30)); });
const mount = async (staffArgs) => {
  root = createRoot(document.createElement("div"));
  await act(async () => root.render(<AppProviders><Probe staffArgs={staffArgs} /></AppProviders>));
  await flush();
};
// Login sebagai master (token + sesi), lalu biarkan query terpicu
const loginAs = async (permissions = ["rbac", "user_management", "branch_master"], role = "master") => {
  await act(async () => {
    tokenStore.set("1|token");
    ctx.auth.applySession({ role, userId: 1, staffName: "Master", branchId: null, permissions: Object.fromEntries(permissions.map((p) => [p, true])) });
  });
  await flush();
};

beforeEach(async () => {
  window.localStorage.clear();
  Object.values(apiMock).forEach((fn) => fn.mockReset());
  apiMock.post.mockResolvedValue(""); // logout di afterEach memanggil POST /auth/logout
  apiMock.get.mockImplementation(async (url) => {
    if (url === "/branches") return BRANCH_ROWS;
    if (url === "/therapists") return THERAPIST_ROWS;
    if (url === "/roles") return ROLE_ROWS;
    if (url.endsWith("/delete-impact")) return { id: 1, code: "EAST", impact: { clients: 4, schedules: 9, invoices: 2, staff: 3, holidays: 1 } };
    return [];
  });
  apiMock.list.mockImplementation(async (url) => url === "/clients" ? { items: [], meta: null } : ({ items: [USER_ROW(11), USER_ROW(12, { isActive: false, branchId: null, branch: null })], meta: { total: 12, page: 1, perPage: 10, lastPage: 2 } }));
  await ensureSeedsIfNeeded();
});
// QueryClient di AppProviders berumur selama modul dimuat: bersihkan cache seperti saat logout agar tes saling lepas.
afterEach(async () => {
  await act(async () => ctx.auth.logout());
  await act(async () => root.unmount());
});

test("belum login: tidak memanggil API sama sekali", async () => {
  await mount();

  expect(apiMock.get).not.toHaveBeenCalled();
  expect(apiMock.list).not.toHaveBeenCalled();
  expect(ctx.branches.branches).toEqual([]);
});

test("isLoading cabang true selama daftar belum tiba (halaman menampilkan shimmer), lalu false", async () => {
  let release;
  apiMock.get.mockImplementation(async (url) => {
    if (url === "/branches") await new Promise((r) => { release = r; });
    return url === "/branches" ? BRANCH_ROWS : [];
  });
  await mount();
  expect(ctx.branches.isLoading).toBe(false); // belum login: tidak ada yang dimuat

  await loginAs();
  expect(ctx.branches.isLoading).toBe(true);
  await act(async () => { release(); });
  await flush();
  expect(ctx.branches.isLoading).toBe(false);
  expect(ctx.branches.branches).toHaveLength(2);
});

test("sesi ortu tidak memanggil endpoint staf", async () => {
  await mount();
  await act(async () => {
    tokenStore.set("2|ortu");
    ctx.auth.applySession({ role: "client", clientId: "3", permissions: null });
  });
  await flush();

  expect(apiMock.get).not.toHaveBeenCalledWith("/branches", undefined, expect.anything());
});

describe("cabang", () => {
  test("daftar dimuat dari server dengan id string dan registry domain ikut tersinkron", async () => {
    await mount();
    await loginAs();

    expect(ctx.branches.branches).toEqual([
      { id: "1", code: "EAST", name: "East", city: "Surabaya", address: "Jl. A", phone: "031-1", isActive: true, bankAccounts: [] },
      { id: "2", code: "CTL", name: "Citraland", city: "Surabaya", address: "", phone: "", isActive: false, bankAccounts: [] },
    ]);
    expect(BRANCHES.map((b) => b.id)).toEqual(["1", "2"]); // dipakai BranchFilter & combo box
  });

  test("tambah: body snake-ready, hasil dipetakan, daftar disegarkan", async () => {
    await mount();
    await loginAs();
    apiMock.post.mockResolvedValueOnce({ id: 3, code: "GBG", name: "Gubeng", city: "Surabaya", address: null, phone: null, isActive: true });

    let created;
    await act(async () => {
      created = await ctx.branches.addBranch({ name: "Gubeng", code: "gbg", city: "Surabaya", address: "", phone: "" });
    });

    expect(apiMock.post).toHaveBeenCalledWith("/branches", { name: "Gubeng", code: "GBG", city: "Surabaya", address: "", phone: "" });
    expect(created).toMatchObject({ id: "3", code: "GBG" });
    await flush();
    expect(apiMock.get.mock.calls.filter(([url]) => url === "/branches").length).toBeGreaterThan(1); // disegarkan
  });

  test("ubah (PATCH) dan aktif/nonaktif", async () => {
    await mount();
    await loginAs();
    apiMock.patch.mockResolvedValue({ id: 1, code: "EAST", name: "East Baru", city: "Surabaya", address: null, phone: null, isActive: false });

    await act(async () => {
      await ctx.branches.updateBranch("1", { name: "East Baru", code: "east", city: "Surabaya", address: "", phone: "" });
      await ctx.branches.setBranchActive("1", false);
    });

    expect(apiMock.patch).toHaveBeenNthCalledWith(1, "/branches/1", { name: "East Baru", code: "EAST", city: "Surabaya", address: "", phone: "" });
    expect(apiMock.patch).toHaveBeenNthCalledWith(2, "/branches/1/active", { isActive: false });
  });

  test("rekening bank: tambah, ubah, aktif/nonaktif, hapus lewat endpoint bersarang di cabang", async () => {
    await mount();
    await loginAs();
    const account = { id: 5, bankName: "BCA", accountNumber: "123", accountHolder: "PT T", isActive: true, sortOrder: 1 };
    apiMock.post.mockResolvedValueOnce(account);
    apiMock.patch.mockResolvedValue(account);
    apiMock.delete.mockResolvedValueOnce("");

    let created;
    await act(async () => {
      created = await ctx.branches.addBankAccount("1", { bankName: " BCA ", accountNumber: "123", accountHolder: "PT T" });
      await ctx.branches.updateBankAccount("1", "5", { bankName: "BCA", accountNumber: "123", accountHolder: "PT T Baru" });
      await ctx.branches.setBankAccountActive("1", "5", false);
      await ctx.branches.removeBankAccount("1", "5");
    });

    expect(apiMock.post).toHaveBeenCalledWith("/branches/1/bank-accounts", { bankName: "BCA", accountNumber: "123", accountHolder: "PT T" });
    expect(created).toMatchObject({ id: "5", bankName: "BCA" });
    expect(apiMock.patch).toHaveBeenNthCalledWith(1, "/branches/1/bank-accounts/5", { bankName: "BCA", accountNumber: "123", accountHolder: "PT T Baru" });
    expect(apiMock.patch).toHaveBeenNthCalledWith(2, "/branches/1/bank-accounts/5/active", { isActive: false });
    expect(apiMock.delete).toHaveBeenCalledWith("/branches/1/bank-accounts/5");
  });

  test("galat validasi server dilempar ke komponen dengan fieldErrors", async () => {
    await mount();
    await loginAs();
    apiMock.post.mockRejectedValueOnce(Object.assign(new Error("Data tidak valid"), { status: 422, fieldErrors: { code: "Kode cabang ini sudah dipakai." } }));

    await expect(ctx.branches.addBranch({ name: "X", code: "EAST" })).rejects.toMatchObject({ fieldErrors: { code: "Kode cabang ini sudah dipakai." } });
  });

  test("hapus: pratinjau dampak dari server; DELETE belum aktif (501) dilempar", async () => {
    await mount();
    await loginAs();

    let impact;
    await act(async () => {
      impact = await ctx.deleteActions.loadImpact({ id: "1", code: "EAST", name: "East" });
    });
    expect(apiMock.get).toHaveBeenCalledWith("/branches/1/delete-impact");
    expect(impact).toEqual({ clients: 4, sessions: 9, invoices: 2, staff: 3, holidays: 1 });

    apiMock.delete.mockRejectedValueOnce(Object.assign(new Error("belum"), { status: 501 }));
    await expect(ctx.deleteActions.deleteBranchCascade({ id: "1", code: "EAST", name: "East" })).rejects.toMatchObject({ status: 501 });
  });
});

describe("terapis", () => {
  test("daftar dimuat dengan id string; kapasitas via PATCH", async () => {
    await mount();
    await loginAs();

    expect(ctx.therapists.therapists).toEqual([{ id: "7", name: "Adi", title: "S.Ft", specialty: "Okupasi", branchId: "1", maxSessionsPerMonth: 100 }]);
    expect(ctx.therapists.getTherapist("7").name).toBe("Adi"); // pencarian by id string (sesi terapis: therapistId string)
    expect(ctx.therapists.getTherapist(7).name).toBe("Adi");

    apiMock.patch.mockResolvedValueOnce({ id: 7, name: "Adi", title: "S.Ft", specialty: "Okupasi", branchId: 1, maxSessionsPerMonth: 150 });
    await act(async () => {
      await ctx.therapists.updateTherapistMaxSessions("7", 150);
    });
    expect(apiMock.patch).toHaveBeenCalledWith("/therapists/7/capacity", { maxSessionsPerMonth: 150 });
  });
});

describe("role & matriks izin", () => {
  test("daftar role dimuat; matriks lengkap dari daftar kode modul", async () => {
    await mount();
    await loginAs();

    expect(ctx.roles.rolesList.map((r) => r.id)).toEqual(["master", "finance", "koordinator"]);
    expect(ctx.roles.rbacPermissions.finance.finance).toBe(true);
    expect(ctx.roles.rbacPermissions.finance.rbac).toBe(false);
    expect(ctx.roles.rbacPermissions.master.rbac).toBe(true);
    expect(Object.keys(ctx.roles.rbacPermissions.finance)).toHaveLength(ACCESS_MODULES.length); // semua modul punya nilai
    expect(ctx.roles.usersCountOf("finance")).toBe(2);
  });

  test("sesi tanpa modul rbac/user_management tidak memanggil /roles", async () => {
    await mount();
    await loginAs(["finance"], "finance");

    expect(apiMock.get).not.toHaveBeenCalledWith("/roles", undefined, expect.anything());
  });

  test("buat role: izin awal dikirim sebagai daftar kode modul", async () => {
    await mount();
    await loginAs();
    apiMock.post.mockResolvedValueOnce({ id: 10, code: "baru", name: "Baru", badge: null, description: null, isSystem: false, usersCount: 0, permissions: ["finance"] });

    let created;
    await act(async () => {
      created = await ctx.roles.addRole({ id: "", label: "Baru", badge: "", description: "", initialPermissions: { finance: true, rbac: false } });
    });

    expect(apiMock.post).toHaveBeenCalledWith("/roles", { name: "Baru", code: undefined, badge: "", description: "", permissions: ["finance"] });
    expect(created).toMatchObject({ id: "baru", label: "Baru", serverId: "10" });
  });

  test("ubah & hapus role memakai id server (bukan kode role)", async () => {
    await mount();
    await loginAs();
    apiMock.patch.mockResolvedValue({ id: 9, code: "koordinator", name: "Koordinator 2", badge: "x", description: null, isSystem: false, usersCount: 0, permissions: [] });

    await act(async () => {
      await ctx.roles.updateRole("koordinator", { label: "Koordinator 2", badge: "x", description: "" });
      await ctx.roles.deleteRole("koordinator");
    });

    expect(apiMock.patch).toHaveBeenCalledWith("/roles/9", { name: "Koordinator 2", badge: "x", description: "" });
    expect(apiMock.delete).toHaveBeenCalledWith("/roles/9");
  });

  test("saklar izin: dikirim sebagai array [{moduleCode, allowed}] dan langsung tampil (optimistis)", async () => {
    await mount();
    await loginAs();
    apiMock.put.mockResolvedValueOnce({});

    await act(async () => {
      await ctx.roles.updateRolePermission("koordinator", "holidays", true);
    });

    expect(apiMock.put).toHaveBeenCalledWith("/roles/9/permissions", { permissions: [{ moduleCode: "holidays", allowed: true }] });
  });

  test("saklar ditolak server: perubahan optimistis dibatalkan dan galat dilempar", async () => {
    await mount();
    await loginAs();
    apiMock.put.mockRejectedValueOnce(Object.assign(new Error("Hak akses role Master tidak dapat diubah."), { status: 422 }));

    // Galat ditangkap DI DALAM act (act yang menolak merusak antrean render React untuk tes berikutnya)
    let error;
    await act(async () => {
      try {
        await ctx.roles.updateRolePermission("koordinator", "holidays", true);
      } catch (err) {
        error = err;
      }
    });
    await flush();

    expect(error?.message).toContain("Hak akses role Master");

    expect(ctx.roles.rbacPermissions.koordinator.holidays).toBe(false);
  });

  test("mengubah izin role akun yang sedang login memuat ulang profil (menu mengikuti)", async () => {
    await mount();
    await loginAs(["rbac", "user_management"], "finance");
    apiMock.put.mockResolvedValueOnce({});
    apiMock.get.mockImplementation(async (url) => {
      if (url === "/auth/me") return { type: "staff", user: { id: 1, name: "Siti", email: "s@x.id", role: { code: "finance", name: "Role Finance", badge: "B" }, branchId: null, mustChangePassword: false, permissions: ["rbac", "user_management", "holidays"] } };
      if (url === "/roles") return ROLE_ROWS;
      return [];
    });

    await act(async () => {
      await ctx.roles.updateRolePermission("finance", "holidays", true);
    });
    await vi.waitFor(() => expect(apiMock.get).toHaveBeenCalledWith("/auth/me"));
    await flush();
    expect(ctx.auth.auth.permissions.holidays).toBe(true);
  });
});

describe("akun staf", () => {
  test("daftar dipaginasi server: filter cabang & pencarian jadi query, meta jadi paginasi", async () => {
    await mount({ branchFilter: "1", search: "" });
    await loginAs();

    await vi.waitFor(() => expect(apiMock.list).toHaveBeenCalled());
    await flush();
    const [url, params] = usersCalls().at(-1);
    expect(url).toBe("/users");
    expect(params).toEqual({ branchId: "1", q: undefined, page: 1, perPage: 10 });

    expect(ctx.staff.users.map((u) => u.id)).toEqual(["11", "12"]);
    expect(ctx.staff.users[0]).toMatchObject({ role: "finance", branchId: "1", isActive: true });
    expect(ctx.staff.users[1].branchId).toBeNull(); // akun semua cabang
    expect(ctx.staff.pagination).toMatchObject({ page: 1, pageSize: 10, totalPages: 2, totalItems: 12 });
  });

  test('"Semua cabang" tidak mengirim branchId', async () => {
    await mount({ branchFilter: "all", search: "" });
    await loginAs();

    await vi.waitFor(() => expect(apiMock.list).toHaveBeenCalled());
    expect(usersCalls().at(-1)[1].branchId).toBeUndefined();
  });

  test("tambah akun: role kode → id server, cabang string → angka; password sementara dari server ditampilkan", async () => {
    await mount();
    await loginAs();
    apiMock.post.mockResolvedValueOnce({ ...USER_ROW(20), temporaryPassword: null });

    let result;
    await act(async () => {
      result = await ctx.staff.addStaff({ name: "Baru", email: "baru@x.id", role: "finance", branchId: "1", title: "", specialty: "", password: "Sementara12" });
    });

    expect(apiMock.post).toHaveBeenCalledWith("/users", { name: "Baru", email: "baru@x.id", roleId: 5, branchId: 1, title: "", specialty: "", password: "Sementara12" });
    expect(result.user.id).toBe("20");
    expect(result.temporaryPassword).toBe("Sementara12");
  });

  test("tambah akun tanpa password: password bikinan server dipakai", async () => {
    await mount();
    await loginAs();
    apiMock.post.mockResolvedValueOnce({ ...USER_ROW(21), temporaryPassword: "AbCdEf23" });

    let result;
    await act(async () => {
      result = await ctx.staff.addStaff({ name: "Baru", email: "baru2@x.id", role: "finance", branchId: "all", password: "" });
    });

    expect(apiMock.post.mock.calls.at(-1)[1].password).toBeUndefined();
    expect(result.temporaryPassword).toBe("AbCdEf23");
  });

  test("ubah, aktif/nonaktif, reset password", async () => {
    await mount();
    await loginAs();
    apiMock.patch.mockResolvedValue(USER_ROW(11));
    apiMock.post.mockResolvedValueOnce({ ...USER_ROW(11), temporaryPassword: "ResetPw99" });

    let reset;
    await act(async () => {
      await ctx.staff.updateStaff("11", { name: "Staf 11", email: "staf11@x.id", role: "finance", branchId: null, title: "", specialty: "" });
      await ctx.staff.setStaffActive("11", false);
      reset = await ctx.staff.resetPassword("11", "");
    });

    expect(apiMock.patch).toHaveBeenNthCalledWith(1, "/users/11", { name: "Staf 11", email: "staf11@x.id", roleId: 5, branchId: null, title: "", specialty: "" });
    expect(apiMock.patch).toHaveBeenNthCalledWith(2, "/users/11/active", { isActive: false });
    expect(apiMock.post).toHaveBeenCalledWith("/users/11/reset-password", {});
    expect(reset.temporaryPassword).toBe("ResetPw99");
  });

  test("hapus akun: DELETE /users/{id}, daftar disegarkan; galat server (409) diteruskan ke halaman", async () => {
    await mount();
    await loginAs();
    apiMock.delete.mockResolvedValueOnce("");

    await act(async () => {
      await ctx.staff.deleteStaff("11");
    });
    expect(apiMock.delete).toHaveBeenCalledWith("/users/11");
    await vi.waitFor(() => expect(usersCalls().length).toBeGreaterThan(1)); // invalidasi → ambil ulang

    apiMock.delete.mockRejectedValueOnce(Object.assign(new Error("Akun dipakai di 3 jadwal."), { status: 409 }));
    let error;
    await act(async () => {
      await ctx.staff.deleteStaff("12").catch((e) => { error = e; });
    });
    expect(error.message).toBe("Akun dipakai di 3 jadwal.");
  });

  test("keunikan email diputuskan server (tidak ada cek di klien)", async () => {
    await mount();
    await loginAs();

    expect(ctx.staff.isEmailTaken("staf11@x.id")).toBe(false);
  });
});

test("sesi tersimpan tanpa token tidak memicu panggilan API", async () => {
  window.localStorage.setItem(STORAGE_PREFIX + "auth", JSON.stringify({ role: "master", staffName: "Lama", branchId: null, therapistId: null, clientId: null }));

  await mount();

  expect(apiMock.get).not.toHaveBeenCalled();
  expect(apiMock.list).not.toHaveBeenCalled();
});
