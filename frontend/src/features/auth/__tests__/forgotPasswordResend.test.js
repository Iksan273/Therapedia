// @vitest-environment jsdom
// Lupa password: tombol "Kirim ulang OTP" dengan jeda (countdown) dan penanda masa berlaku, tanpa kembali ke awal login.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ForgotPasswordDialog, OTP_VALID_SECONDS, RESEND_COOLDOWN_SECONDS } from "@/features/auth/components/PasswordDialogs";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.mock("sonner", () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

let root;
let container;
beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

const $ = (id) => document.querySelector(`[data-testid="${id}"]`);
const type = (el, value) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

async function openAtOtpStep(requestOtp) {
  await act(async () => root.render(<ForgotPasswordDialog open onOpenChange={() => {}} requestOtp={requestOtp} resetWithOtp={vi.fn()} />));
  await act(async () => type($("forgot-email-input"), "staf@therapedia.id"));
  await act(async () => $("forgot-request-otp").click());
}

test("setelah OTP pertama dikirim: tombol kirim ulang menghitung mundur 60 detik, lalu aktif", async () => {
  const requestOtp = vi.fn().mockResolvedValue(undefined);
  await openAtOtpStep(requestOtp);

  const resend = () => $("forgot-resend-otp");
  expect(requestOtp).toHaveBeenCalledTimes(1);
  expect(resend().disabled).toBe(true);
  expect(resend().textContent).toContain(`${RESEND_COOLDOWN_SECONDS} dtk`);

  await act(async () => vi.advanceTimersByTime(30_500));
  expect(resend().textContent).toMatch(/\((29|30) dtk\)/);
  expect(resend().disabled).toBe(true);

  await act(async () => vi.advanceTimersByTime(30_000));
  expect(resend().disabled).toBe(false);
  expect(resend().textContent).toBe("Kirim ulang OTP");
});

test("kirim ulang: memanggil permintaan OTP dengan email yang sama, mengosongkan kode lama, dan memulai jeda lagi", async () => {
  const requestOtp = vi.fn().mockResolvedValue(undefined);
  await openAtOtpStep(requestOtp);
  await act(async () => type($("forgot-otp-input"), "123456"));
  await act(async () => vi.advanceTimersByTime(61_000));

  await act(async () => $("forgot-resend-otp").click());

  expect(requestOtp).toHaveBeenCalledTimes(2);
  expect(requestOtp).toHaveBeenLastCalledWith("staf@therapedia.id");
  expect($("forgot-otp-input").value).toBe(""); // kode lama tidak berlaku lagi
  expect($("forgot-resend-otp").disabled).toBe(true);
  expect($("forgot-resend-otp").textContent).toContain(`${RESEND_COOLDOWN_SECONDS} dtk`);
});

test("OTP kedaluwarsa setelah 10 menit: tampil pesan kedaluwarsa, kirim ulang tetap tersedia", async () => {
  await openAtOtpStep(vi.fn().mockResolvedValue(undefined));
  expect($("forgot-otp-validity").textContent).toContain("10:00");
  await act(async () => vi.advanceTimersByTime(5_500));
  expect($("forgot-otp-validity").textContent).toMatch(/9:5\d/); // berjalan mundur

  await act(async () => vi.advanceTimersByTime((OTP_VALID_SECONDS + 1) * 1000));

  expect($("forgot-otp-expired").textContent).toContain("kedaluwarsa");
  expect($("forgot-resend-otp").disabled).toBe(false);
});

test("kirim ulang ditolak server (429): pesan ditampilkan, jeda dimulai lagi, dialog tetap di langkah OTP", async () => {
  const requestOtp = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(Object.assign(new Error("Terlalu banyak permintaan kode. Coba lagi dalam 8 menit."), { status: 429, fieldErrors: {} }));
  await openAtOtpStep(requestOtp);
  await act(async () => vi.advanceTimersByTime(61_000));

  await act(async () => $("forgot-resend-otp").click());

  expect($("forgot-error").textContent).toContain("Terlalu banyak permintaan kode");
  expect($("forgot-otp-input")).not.toBeNull(); // masih di langkah OTP
  expect($("forgot-resend-otp").disabled).toBe(true);
});
