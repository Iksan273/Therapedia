// Domain akun staf: password sementara + wajib ganti, lupa password via OTP email, akun nonaktif.
// Mode demo menyimpan password polos di localStorage (hanya prototype); backend: hash + email OTP (schema.md `users`,
// `password_reset_otps`). Tidak ada lupa password untuk orang tua: admin yang menginformasikan kode client.
import { keysToSnake } from "@/shared/lib/caseConverter";

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

// Login ortu: kode client + tanggal lahir anak (`yyyy-MM-dd`, dari input date). Gagal selalu generik (tidak menyebut
// mana yang salah). Backend: `POST /auth/client-login` + throttle/lockout (5 gagal, reset 10 menit).
export const CLIENT_LOGIN_ERROR = "Kode client atau tanggal lahir anak tidak sesuai.";
export const findClientForLogin = (clients = [], code, dob) => {
  const c = String(code || "").trim().toUpperCase();
  const d = String(dob || "").trim();
  if (!c || !d) return null;
  return clients.find((x) => x.clientCode && x.clientCode.toUpperCase() === c && String(x.dob || "").slice(0, 10) === d) || null;
};

// Cakupan cabang staf hanya ditentukan `branchId` (padanan `users.branch_id`): terisi = 1 cabang, kosong (null) = semua cabang.
// Berlaku untuk semua role staf (master, terapis, role kustom); diatur Master di User Management. Ortu (`client`) bukan staf.
export const hasAllBranchAccess = (user) => Boolean(user?.role) && user.role !== "client" && !user.branchId;

// ---- Sesi dari Laravel API (mode API) ----
// Respons `POST /auth/login` | `/auth/client-login` | `GET /auth/me` sudah berbentuk camelCase (interceptor httpClient),
// KECUALI key matriks modul: key itu kode modul snake_case (`inquiry_pipeline`) dan harus dikembalikan ke bentuk aslinya.

// Halaman awal tiap role sistem setelah login.
export const STAFF_HOME = {
  master: "/master/revenue",
  manager: "/manager/revenue",
  admin_inquiry: "/admin-inquiry/pipeline",
  admin_schedule: "/admin-schedule/calendar",
  finance: "/finance",
  therapist: "/therapist",
};

// Role kustom: halaman pertama yang modul RBAC-nya terbuka (urut dari yang paling umum).
const CUSTOM_ROLE_HOME = [
  ["inquiry_dashboard", "/admin-inquiry"],
  ["inquiry_pipeline", "/admin-inquiry/pipeline"],
  ["schedule_dashboard", "/admin-schedule"],
  ["weekly_calendar", "/admin-schedule/calendar"],
  ["active_clients", "/admin-schedule/clients"],
  ["finance", "/finance"],
  ["therapist_module", "/therapist"],
  ["revenue", "/manager/revenue"],
];

// Tujuan setelah login / saat membuka "/". `hasPermission(moduleKey)` dipakai untuk role kustom. Tanpa role → "/login".
export const homePathFor = (role, hasPermission = () => false) => {
  if (!role) return "/login";
  if (role === "client") return "/client";
  if (STAFF_HOME[role]) return STAFF_HOME[role];
  const hit = CUSTOM_ROLE_HOME.find(([moduleKey]) => hasPermission(moduleKey));
  return hit ? hit[1] : "/login";
};

// `data.user` dari login/me staf → bentuk state `auth`. `therapistId` memakai id akun terapis.
export const staffSessionToAuth = (user) => ({
  role: user.role.code,
  userId: user.id,
  staffName: user.name,
  email: user.email,
  branchId: user.branchId ?? null,
  branchName: user.branch?.name ?? null,
  therapistId: user.role.code === "therapist" ? String(user.id) : null,
  clientId: null,
  mustChangePassword: Boolean(user.mustChangePassword),
  permissions: keysToSnake(user.permissions || {}),
});

// `data.client` dari login/me ortu → bentuk state `auth`.
export const clientSessionToAuth = (client) => ({
  role: "client",
  userId: null,
  staffName: null,
  email: null,
  branchId: client.branchId ?? null,
  branchName: client.branch?.name ?? null,
  therapistId: null,
  clientId: client.id,
  clientCode: client.clientCode,
  childName: client.childName,
  mustChangePassword: false,
  permissions: null,
});

// Pesan galat dari ApiError untuk ditampilkan di form: utamakan pesan field, lalu pesan umum.
export const apiErrorText = (error, fields = []) => {
  for (const field of fields) {
    if (error?.fieldErrors?.[field]) return error.fieldErrors[field];
  }
  return error?.message || "Terjadi kesalahan. Coba lagi.";
};
