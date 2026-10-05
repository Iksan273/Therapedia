import { uid, nowIso } from "@/shared/lib/id";

// Domain hari libur (nasional / klinik). Jadwal berulang MELEWATI tanggal libur dan kalender tidak bisa memilihnya.
// Menambah libur tidak mengubah sesi yang sudah ada (hanya diberi penanda). Acuan tabel `holidays` (schema.md §04-B).
// `branchId` null = berlaku untuk semua cabang.

// Contoh awal (tanggal tetap); sesuaikan dengan SKB libur nasional & cuti bersama di halaman Hari Libur.
export const DEFAULT_HOLIDAYS = [
  { id: "hol-2026-12-25", date: "2026-12-25", name: "Hari Raya Natal", branchId: null },
  { id: "hol-2027-01-01", date: "2027-01-01", name: "Tahun Baru Masehi", branchId: null },
  { id: "hol-2027-05-01", date: "2027-05-01", name: "Hari Buruh Internasional", branchId: null },
  { id: "hol-2027-06-01", date: "2027-06-01", name: "Hari Lahir Pancasila", branchId: null },
  { id: "hol-2027-08-17", date: "2027-08-17", name: "Hari Kemerdekaan RI", branchId: null },
];

export const makeHoliday = ({ date, name, branchId = null }) => ({
  id: `hol-${uid().slice(0, 8)}`,
  date,
  name: String(name || "").trim(),
  branchId: branchId || null,
  createdAt: nowIso(),
});

// Libur yang berlaku untuk sebuah cabang: libur semua cabang + libur khusus cabang itu. Tanpa cabang = semua.
export const holidaysForBranch = (holidays = [], branchId = null) =>
  holidays.filter((h) => !h.branchId || !branchId || h.branchId === branchId);

export const findHoliday = (holidays, date, branchId = null) =>
  holidaysForBranch(holidays, branchId).find((h) => h.date === date) || null;

export const isHoliday = (holidays, date, branchId = null) => Boolean(findHoliday(holidays, date, branchId));

// Set tanggal (yyyy-MM-dd) libur untuk cabang tertentu (dipakai generator jadwal berulang).
export const holidayDateSet = (holidays, branchId = null) => new Set(holidaysForBranch(holidays, branchId).map((h) => h.date));

// Validasi tambah/ubah libur (`excludeId` = libur yang sedang diubah): tanggal & nama wajib, tidak duplikat pada cakupan yang sama. Mengembalikan pesan error atau null.
export const validateHoliday = (holidays, { date, name, branchId = null, excludeId = null }) => {
  if (!date) return "Tanggal libur wajib diisi.";
  if (!String(name || "").trim()) return "Nama hari libur wajib diisi.";
  const dup = holidays.some((h) => h.id !== excludeId && h.date === date && (h.branchId || null) === (branchId || null));
  return dup ? "Tanggal ini sudah terdaftar sebagai hari libur." : null;
};

// Pesan standar saat tanggal libur dipilih.
export const holidayMessage = (holiday) => `${holiday.date} adalah hari libur (${holiday.name}); jadwal tidak dapat dibuat di tanggal ini.`;
