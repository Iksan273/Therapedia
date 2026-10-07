// Domain kapasitas terapis (revisi 7 Okt 2026, menggantikan jam kerja per hari). Yang diatur per terapis hanya satu angka:
// **maksimal sesi per bulan** (= total jam kerja sebulan; 1 sesi = 1 jam). Dipakai sebagai kapasitas untuk Availability &
// Utilization Rate (domain/therapistUtilization) dan TIDAK memblokir penjadwalan. Acuan kolom `users.max_sessions_per_month`.

export const DEFAULT_MAX_SESSIONS_PER_MONTH = 100;
export const MAX_SESSIONS_LIMIT = 744; // batas atas wajar: 31 hari × 24 jam

// Maks sesi sebulan seorang terapis (data lama tanpa angka memakai bawaan).
export const maxSessionsOf = (therapist) => {
  const n = Number(therapist?.maxSessionsPerMonth);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_SESSIONS_PER_MONTH;
};

// Validasi isian pengaturan: bilangan bulat 1..744. Mengembalikan pesan error atau null.
export function validateMaxSessions(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return "Maksimal sesi per bulan harus bilangan bulat minimal 1.";
  if (n > MAX_SESSIONS_LIMIT) return `Maksimal sesi per bulan tidak boleh lebih dari ${MAX_SESSIONS_LIMIT} (1 sesi = 1 jam).`;
  return null;
}
