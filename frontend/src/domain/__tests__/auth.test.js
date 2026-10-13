import {
  DEMO_PASSWORD,
  MAX_OTP_ATTEMPTS,
  OTP_TTL_MS,
  checkStaffCredentials,
  findStaffByEmail,
  generateOtp,
  generateTempPassword,
  makeOtpRequest,
  validateNewPassword,
  hasAllBranchAccess,
  verifyOtp,
} from "@/domain/auth";
import { canManageSchedule } from "@/domain/schedule";
import { roleHasPermission } from "@/domain/rbac";

describe("password & akun staf", () => {
  test("validateNewPassword: panjang, huruf+angka, konfirmasi", () => {
    expect(validateNewPassword("abc12")).toMatch(/minimal 8/);
    expect(validateNewPassword("abcdefgh")).toMatch(/huruf dan angka/);
    expect(validateNewPassword("12345678")).toMatch(/huruf dan angka/);
    expect(validateNewPassword("abcdef12", "abcdef13")).toMatch(/Konfirmasi/);
    expect(validateNewPassword("abcdef12", "abcdef12")).toBeNull();
    expect(validateNewPassword("abcdef12")).toBeNull();
  });

  test("password sementara dan OTP memenuhi format", () => {
    expect(validateNewPassword(generateTempPassword())).toBeNull();
    expect(generateOtp()).toMatch(/^\d{6}$/);
  });

  test("kredensial: akun lama pakai password demo, nonaktif ditolak, wajib ganti terbaca", () => {
    expect(checkStaffCredentials({ email: "a@x" }, DEMO_PASSWORD)).toEqual({ ok: true, mustChangePassword: false });
    expect(checkStaffCredentials({ email: "a@x" }, "salah")).toEqual({ ok: false, reason: "invalid" });
    expect(checkStaffCredentials({ password: "Rahasia123", mustChangePassword: true }, "Rahasia123")).toEqual({ ok: true, mustChangePassword: true });
    expect(checkStaffCredentials({ password: "Rahasia123", isActive: false }, "Rahasia123")).toEqual({ ok: false, reason: "inactive" });
    expect(checkStaffCredentials(null, "x")).toEqual({ ok: false, reason: "invalid" });
    expect(findStaffByEmail([{ email: "Maya@Therapedia.id" }], " maya@therapedia.id ")).toBeTruthy();
  });

  test("branchId kosong = semua cabang untuk semua role staf; terisi = 1 cabang", () => {
    expect(hasAllBranchAccess({ role: "master" })).toBe(true);
    expect(hasAllBranchAccess({ role: "finance", branchId: null })).toBe(true);
    expect(hasAllBranchAccess({ role: "therapist" })).toBe(true);
    expect(hasAllBranchAccess({ role: "custom_role", branchId: null })).toBe(true);
    expect(hasAllBranchAccess({ role: "finance", branchId: "branch-sby-timur" })).toBe(false);
    expect(hasAllBranchAccess({ role: "master", branchId: "branch-sby-timur" })).toBe(false);
  });

  test("ortu dan sesi belum login bukan akses semua cabang", () => {
    expect(hasAllBranchAccess({ role: "client", clientId: "c1" })).toBe(false);
    expect(hasAllBranchAccess({ role: null })).toBe(false);
    expect(hasAllBranchAccess(null)).toBe(false);
  });
});

describe("OTP lupa password", () => {
  const now = new Date("2026-10-05T10:00:00Z");
  const req = makeOtpRequest("Maya@Therapedia.id", "123456", now);

  test("OTP valid dalam masa berlaku", () => {
    expect(req.email).toBe("maya@therapedia.id");
    expect(verifyOtp(req, "123456", new Date(now.getTime() + 60_000))).toEqual({ ok: true });
  });

  test("salah, kedaluwarsa, terpakai, terkunci, tidak ada", () => {
    expect(verifyOtp(req, "000000", now)).toEqual({ ok: false, reason: "invalid", attemptsLeft: MAX_OTP_ATTEMPTS - 1 });
    expect(verifyOtp(req, "123456", new Date(now.getTime() + OTP_TTL_MS + 1))).toEqual({ ok: false, reason: "expired" });
    expect(verifyOtp({ ...req, usedAt: now.toISOString() }, "123456", now)).toEqual({ ok: false, reason: "used" });
    expect(verifyOtp({ ...req, attempts: MAX_OTP_ATTEMPTS }, "123456", now)).toEqual({ ok: false, reason: "locked" });
    expect(verifyOtp(undefined, "123456", now)).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("hak aksi jadwal mengikuti akses modul (bukan daftar role)", () => {
  const permissions = { custom: { weekly_calendar: true }, plain: { weekly_calendar: false } };
  const has = (roleId) => (module) => roleHasPermission(roleId, permissions, module);

  test("Manager (default punya weekly_calendar), admin_schedule, master boleh; terapis tidak", () => {
    expect(canManageSchedule(has("manager"))).toBe(true);
    expect(canManageSchedule(has("admin_schedule"))).toBe(true);
    expect(canManageSchedule(has("master"))).toBe(true);
    expect(canManageSchedule(has("therapist"))).toBe(false);
    expect(canManageSchedule(has("custom"))).toBe(true);
    expect(canManageSchedule(has("plain"))).toBe(false);
    expect(canManageSchedule(undefined)).toBe(false);
  });
});
