// Domain akun staf: password sementara + wajib ganti, lupa password via OTP email, akun nonaktif.
// Mode demo menyimpan password polos di localStorage (hanya prototype); backend: hash + email OTP (schema.md `users`,
// `password_reset_otps`). Tidak ada lupa password untuk orang tua: admin yang menginformasikan kode client.

// Password bawaan akun seed/demo yang belum pernah diatur ulang.
export const DEMO_PASSWORD = "Therapedia2026!";
export const MIN_PASSWORD_LENGTH = 8;

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000; // OTP berlaku 10 menit
export const MAX_OTP_ATTEMPTS = 5; // lebih dari ini OTP hangus

const norm = (email) => String(email || "").trim().toLowerCase();

// Password baru: minimal 8 karakter, mengandung huruf dan angka, dan konfirmasi sama. Mengembalikan pesan error atau null.
export const validateNewPassword = (password, confirm) => {
  const pw = String(password || "");
  if (pw.length < MIN_PASSWORD_LENGTH) return `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Password harus mengandung huruf dan angka.";
  if (confirm !== undefined && pw !== confirm) return "Konfirmasi password tidak sama.";
  return null;
};

export const generateOtp = (rand = Math.random) => {
  let s = "";
  for (let i = 0; i < OTP_LENGTH; i += 1) s += Math.floor(rand() * 10);
  return s;
};

// Password sementara yang dibuat Master (huruf + angka, tanpa karakter yang mudah tertukar).
export const generateTempPassword = (rand = Math.random) => {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const pick = (chars) => chars[Math.floor(rand() * chars.length)];
  let s = "";
  for (let i = 0; i < 6; i += 1) s += pick(letters);
  s += pick(digits) + pick(digits);
  return s;
};

export const makeOtpRequest = (email, otp, now = new Date()) => ({
  email: norm(email),
  otp,
  attempts: 0,
  usedAt: null,
  createdAt: now.toISOString(),
  expiresAt: new Date(now.getTime() + OTP_TTL_MS).toISOString(),
});

// Hasil verifikasi OTP: { ok } atau { ok:false, reason: not_found | used | expired | locked | invalid, attemptsLeft? }.
export const verifyOtp = (request, code, now = new Date()) => {
  if (!request) return { ok: false, reason: "not_found" };
  if (request.usedAt) return { ok: false, reason: "used" };
  if (new Date(request.expiresAt).getTime() < now.getTime()) return { ok: false, reason: "expired" };
  if (request.attempts >= MAX_OTP_ATTEMPTS) return { ok: false, reason: "locked" };
  if (String(code || "").trim() !== request.otp) return { ok: false, reason: "invalid", attemptsLeft: MAX_OTP_ATTEMPTS - request.attempts - 1 };
  return { ok: true };
};

export const OTP_ERROR_MESSAGES = {
  not_found: "Permintaan OTP tidak ditemukan. Minta kode baru.",
  used: "Kode OTP sudah dipakai. Minta kode baru.",
  expired: "Kode OTP sudah kedaluwarsa. Minta kode baru.",
  locked: "Terlalu banyak percobaan salah. Minta kode OTP baru.",
  invalid: "Kode OTP salah.",
};

export const findStaffByEmail = (staffUsers = [], email) => staffUsers.find((u) => norm(u.email) === norm(email)) || null;

// Cek kredensial staf. Akun lama tanpa password memakai DEMO_PASSWORD. Akun nonaktif tidak bisa login.
// Hasil: { ok, mustChangePassword } atau { ok:false, reason: inactive | invalid }.
export const checkStaffCredentials = (staff, password) => {
  if (!staff) return { ok: false, reason: "invalid" };
  if (staff.isActive === false) return { ok: false, reason: "inactive" };
  if ((staff.password ?? DEMO_PASSWORD) !== password) return { ok: false, reason: "invalid" };
  return { ok: true, mustChangePassword: Boolean(staff.mustChangePassword) };
};

// Staf non-master terikat TEPAT satu cabang; hanya master yang boleh tanpa cabang (semua cabang).
export const validateStaffBranch = (role, branchId) => (role !== "master" && !branchId ? "Cabang wajib dipilih (hanya Master yang boleh semua cabang)." : null);
