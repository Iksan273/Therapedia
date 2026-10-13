// @vitest-environment jsdom
// Auth mode API (M1): login/logout/ganti password/OTP lewat hook use-case + authStore. httpClient di-mock.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { STORAGE_PREFIX } from "@/services/storage/localStore";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/config/env", () => ({
  ENV: { DATA_SOURCE: "api", API_BASE_URL: "http://api.test/api/v1", API_TIMEOUT_MS: 1000, LANDING_URL: "", IS_DEV: false },
  isApiMode: () => true,
}));

const apiMock = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), upload: vi.fn(), list: vi.fn() };
let unauthorizedHandler = () => {};
vi.mock("@/services/http/httpClient", () => ({
  api: apiMock,
  setUnauthorizedHandler: (handler) => {
    unauthorizedHandler = handler;
  },
}));

const { default: AppProviders } = await import("@/app/providers/AppProviders");
const { useAuth } = await import("@/stores/authStore");
const { useAuthActions } = await import("@/features/auth/hooks/useAuthActions");
const { tokenStore } = await import("@/services/http/tokenStore");

// Bentuk respons setelah interceptor httpClient (semua key camelCase, termasuk kode modul)
const staffPayload = (overrides = {}) => ({
  token: "5|secret-token",
  tokenType: "Bearer",
  user: {
    id: 7,
    name: "Siti Rahmawati",
    email: "siti@therapedia.id",
    role: { code: "finance", name: "Role Finance", badge: "Billing" },
    isMaster: false,
    branchId: 2,
    branch: { id: 2, code: "CTL", name: "Citraland" },
    mustChangePassword: false,
    permissions: { finance: true, activeClients: true, rbac: false, inquiryPipeline: false },
    ...overrides,
  },
});

let ctx;
let actions;
function Probe() {
  ctx = useAuth();
  actions = useAuthActions();
  return null;
}

let root;
const mount = async () => {
  root = createRoot(document.createElement("div"));
  await act(async () => root.render(<AppProviders><Probe /></AppProviders>));
};

beforeEach(async () => {
  window.localStorage.clear();
  Object.values(apiMock).forEach((fn) => fn.mockReset());
  apiMock.post.mockResolvedValue("");
  await ensureSeedsIfNeeded();
});
afterEach(() => act(() => root.unmount()));

test("loginStaff: simpan token, pasang sesi, matriks modul dikembalikan ke snake_case", async () => {
  await mount();
  apiMock.post.mockResolvedValueOnce(staffPayload());

  let session;
  await act(async () => {
    session = await actions.loginStaff({ email: "siti@therapedia.id", password: "Rahasia123" });
  });

  expect(apiMock.post).toHaveBeenCalledWith("/auth/login", { email: "siti@therapedia.id", password: "Rahasia123" });
  expect(tokenStore.get()).toBe("5|secret-token");
  expect(session).toMatchObject({ role: "finance", staffName: "Siti Rahmawati", branchId: 2, mustChangePassword: false });
  expect(ctx.auth.permissions).toEqual({ finance: true, active_clients: true, rbac: false, inquiry_pipeline: false });

  // RBAC mengikuti matriks server, bukan matriks lokal
  expect(ctx.hasPermission("finance")).toBe(true);
  expect(ctx.hasPermission("active_clients")).toBe(true);
  expect(ctx.hasPermission("rbac")).toBe(false);
  expect(ctx.hasPermission("inquiry_pipeline")).toBe(false);
  expect(ctx.canDelete("finance")).toBe(true); // hapus operasional = akses modul
  expect(ctx.canDelete("finance", { masterOnly: true })).toBe(false); // hapus client/cabang hanya master
  expect(ctx.activeBranch).toBe(2); // staf ber-cabang terkunci di cabangnya
});

test("master: semua izin dan boleh hapus data penting", async () => {
  await mount();
  apiMock.post.mockResolvedValueOnce(staffPayload({ role: { code: "master" }, branchId: null, branch: null, permissions: {} }));

  await act(async () => {
    await actions.loginStaff({ email: "master@therapedia.id", password: "x" });
  });

  expect(ctx.hasPermission("rbac")).toBe(true);
  expect(ctx.canDelete("branch_master", { masterOnly: true })).toBe(true);
  expect(ctx.activeBranch).toBe("all");
});

test("password sementara: wajib ganti, lalu penanda dibersihkan", async () => {
  await mount();
  apiMock.post.mockResolvedValueOnce(staffPayload({ mustChangePassword: true }));
  await act(async () => {
    await actions.loginStaff({ email: "siti@therapedia.id", password: "Sementara1" });
  });
  expect(ctx.auth.mustChangePassword).toBe(true);

  await act(async () => {
    await actions.changePassword({ currentPassword: "Sementara1", password: "PasswordBaru99" });
  });
  expect(apiMock.post).toHaveBeenLastCalledWith("/auth/change-password", {
    currentPassword: "Sementara1",
    password: "PasswordBaru99",
    passwordConfirmation: "PasswordBaru99",
  });
  expect(ctx.auth.mustChangePassword).toBe(false);
});

test("loginClient: sesi ortu tanpa matriks izin", async () => {
  await mount();
  apiMock.post.mockResolvedValueOnce({ token: "9|ortu", tokenType: "Bearer", client: { id: 3, clientCode: "AE-00003", childName: "Raka", parentName: "Dewi", branchId: 1, branch: { name: "East" } } });

  await act(async () => {
    await actions.loginClient({ clientCode: "AE-00003", dateOfBirth: "2018-05-17" });
  });

  expect(apiMock.post).toHaveBeenCalledWith("/auth/client-login", { clientCode: "AE-00003", dateOfBirth: "2018-05-17" });
  expect(tokenStore.get()).toBe("9|ortu");
  expect(ctx.auth).toMatchObject({ role: "client", clientId: 3, clientCode: "AE-00003", permissions: null });
});

test("logout mode API: cabut token di server, hapus token & sesi lokal", async () => {
  await mount();
  apiMock.post.mockResolvedValueOnce(staffPayload());
  await act(async () => {
    await actions.loginStaff({ email: "siti@therapedia.id", password: "Rahasia123" });
  });

  await act(async () => {
    ctx.logout();
  });

  expect(apiMock.post).toHaveBeenLastCalledWith("/auth/logout");
  expect(ctx.auth.role).toBeNull();
  expect(ctx.auth.permissions).toBeNull();
  await vi.waitFor(() => expect(tokenStore.get()).toBeNull());
});

test("401 dari server membersihkan sesi (guard lalu mengarahkan ke /login)", async () => {
  await mount();
  apiMock.post.mockResolvedValueOnce(staffPayload());
  await act(async () => {
    await actions.loginStaff({ email: "siti@therapedia.id", password: "Rahasia123" });
  });
  expect(ctx.auth.role).toBe("finance");

  await act(async () => unauthorizedHandler());
  expect(ctx.auth.role).toBeNull();
});

test("buka ulang aplikasi: sesi dipulihkan dari token lewat GET /auth/me", async () => {
  tokenStore.set("5|secret-token");
  apiMock.get.mockResolvedValueOnce({ type: "staff", user: staffPayload().user });

  await mount();
  await vi.waitFor(() => expect(ctx.auth.role).toBe("finance"));

  expect(apiMock.get).toHaveBeenCalledWith("/auth/me");
  expect(ctx.auth.permissions.active_clients).toBe(true);
});

test("tanpa token: sisa sesi tersimpan dibuang saat aplikasi dibuka", async () => {
  window.localStorage.setItem(STORAGE_PREFIX + "auth", JSON.stringify({ role: "master", staffName: "Lama", branchId: null, therapistId: null, clientId: null }));

  await mount();

  expect(ctx.auth.role).toBeNull();
  expect(apiMock.get).not.toHaveBeenCalled();
});

test("reset password dengan OTP: sukses dan galat server dipetakan ke pesan", async () => {
  await mount();

  let res;
  await act(async () => {
    res = await actions.resetPasswordWithOtp({ email: "siti@therapedia.id", otp: "123456", newPassword: "PasswordBaru99" });
  });
  expect(res).toEqual({ ok: true });
  expect(apiMock.post).toHaveBeenLastCalledWith("/auth/reset-password", { email: "siti@therapedia.id", otp: "123456", password: "PasswordBaru99" });

  apiMock.post.mockRejectedValueOnce({ fieldErrors: { otp: "Kode OTP salah atau sudah kedaluwarsa." }, message: "Kode OTP salah atau sudah kedaluwarsa." });
  await act(async () => {
    res = await actions.resetPasswordWithOtp({ email: "siti@therapedia.id", otp: "000000", newPassword: "PasswordBaru99" });
  });
  expect(res).toEqual({ ok: false, message: "Kode OTP salah atau sudah kedaluwarsa." });
});

test("minta OTP: sukses generik; galat 429/503 dilempar ke komponen", async () => {
  await mount();

  let res;
  await act(async () => {
    res = await actions.requestPasswordOtp("siti@therapedia.id");
  });
  expect(res).toEqual({ sent: true });
  expect(apiMock.post).toHaveBeenLastCalledWith("/auth/forgot-password", { email: "siti@therapedia.id" });

  apiMock.post.mockRejectedValueOnce(Object.assign(new Error("Terlalu banyak permintaan kode."), { status: 429 }));
  await expect(actions.requestPasswordOtp("siti@therapedia.id")).rejects.toThrow("Terlalu banyak permintaan kode.");
});
