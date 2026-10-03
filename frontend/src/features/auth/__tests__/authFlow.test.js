// @vitest-environment jsdom
// Alur akun staf: password sementara + wajib ganti, lupa password via OTP email, reset Master, nonaktif (bukan hapus).
import { act } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import { useAuth } from "@/stores/authStore";
import { checkStaffCredentials, validateNewPassword } from "@/domain/auth";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let ctx;
function Probe() {
  ctx = useAuth();
  return null;
}

let root;
beforeEach(async () => {
  window.localStorage.clear();
  await ensureSeedsIfNeeded();
  root = createRoot(document.createElement("div"));
  await act(async () => root.render(<AppProviders><Probe /></AppProviders>));
});
afterEach(() => act(() => root.unmount()));

const staff = (email) => ctx.staffUsers.find((u) => u.email === email);

test("akun baru: password sementara + wajib ganti; ganti password membuka login normal", async () => {
  let created;
  await act(async () => { created = ctx.addStaffUser({ name: "Staf Baru", email: "baru@therapedia.id", role: "admin_inquiry", branchId: "branch-sby-timur", password: "Sementara12" }); });
  expect(created).toMatchObject({ isActive: true, mustChangePassword: true, password: "Sementara12" });
  expect(checkStaffCredentials(staff("baru@therapedia.id"), "Sementara12")).toEqual({ ok: true, mustChangePassword: true });

  await act(async () => ctx.changeStaffPassword(created.id, "PasswordBaru99"));
  expect(validateNewPassword("PasswordBaru99")).toBeNull();
  expect(checkStaffCredentials(staff("baru@therapedia.id"), "PasswordBaru99")).toEqual({ ok: true, mustChangePassword: false });
  expect(checkStaffCredentials(staff("baru@therapedia.id"), "Sementara12").ok).toBe(false);
});

test("lupa password: OTP email → reset berhasil; OTP salah dihitung lalu hangus; email tidak dikenal tidak membocorkan", async () => {
  const email = "inquiry@therapedia.id";
  let res;
  await act(async () => { res = ctx.requestPasswordOtp(email); });
  expect(res.sent).toBe(true);
  expect(res.otp).toMatch(/^\d{6}$/);

  // OTP salah → ditolak dan percobaan dihitung
  let bad;
  await act(async () => { bad = ctx.resetPasswordWithOtp({ email, otp: "000000", newPassword: "Baru12345" }); });
  expect(bad).toMatchObject({ ok: false, reason: "invalid", attemptsLeft: 4 });
  expect(checkStaffCredentials(staff(email), "Baru12345").ok).toBe(false);

  // OTP benar → password berganti dan OTP tidak bisa dipakai lagi
  let ok;
  await act(async () => { ok = ctx.resetPasswordWithOtp({ email, otp: res.otp, newPassword: "Baru12345" }); });
  expect(ok).toEqual({ ok: true });
  expect(checkStaffCredentials(staff(email), "Baru12345")).toEqual({ ok: true, mustChangePassword: false });
  let reuse;
  await act(async () => { reuse = ctx.resetPasswordWithOtp({ email, otp: res.otp, newPassword: "Lain12345" }); });
  expect(reuse).toMatchObject({ ok: false, reason: "used" });

  // email tidak terdaftar: respons generik tanpa OTP
  let unknown;
  await act(async () => { unknown = ctx.requestPasswordOtp("tidak.ada@therapedia.id"); });
  expect(unknown).toEqual({ sent: true });
});

test("OTP hangus setelah 5 percobaan salah", async () => {
  const email = "finance@therapedia.id";
  let res;
  await act(async () => { res = ctx.requestPasswordOtp(email); });
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { ctx.resetPasswordWithOtp({ email, otp: "111111", newPassword: "Baru12345" }); });
  }
  let locked;
  await act(async () => { locked = ctx.resetPasswordWithOtp({ email, otp: res.otp, newPassword: "Baru12345" }); });
  expect(locked).toMatchObject({ ok: false, reason: "locked" });
});

test("reset oleh Master: password sementara baru + wajib ganti; nonaktifkan memblokir login tanpa menghapus akun", async () => {
  const email = "schedule@therapedia.id";
  const target = staff(email);
  let temp;
  await act(async () => { temp = ctx.resetStaffPassword(target.id, "TempMaster77"); });
  expect(temp).toBe("TempMaster77");
  expect(checkStaffCredentials(staff(email), "TempMaster77")).toEqual({ ok: true, mustChangePassword: true });

  await act(async () => ctx.setStaffActive(target.id, false));
  expect(staff(email)).toBeTruthy(); // tidak dihapus
  expect(checkStaffCredentials(staff(email), "TempMaster77")).toEqual({ ok: false, reason: "inactive" });
  // akun nonaktif tidak bisa meminta OTP
  let res;
  await act(async () => { res = ctx.requestPasswordOtp(email); });
  expect(res).toEqual({ sent: true });

  await act(async () => ctx.setStaffActive(target.id, true));
  expect(checkStaffCredentials(staff(email), "TempMaster77").ok).toBe(true);
});
