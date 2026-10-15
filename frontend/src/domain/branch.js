import { format, subMonths } from "date-fns";

// Domain cabang klinik.
// Data cabang dikelola Master (menu Master Cabang) dan disimpan di `branchesStore`. Registry modul ini disinkronkan oleh
// store (`syncBranches`) supaya kode domain/UI lama yang membaca `BRANCHES` / `branchName` tetap bekerja.

export const DEFAULT_BRANCHES = [
  {
    id: "branch-sby-timur", name: "East", code: "EAST", city: "Surabaya", address: "", phone: "", isActive: true,
    bankAccounts: [
      { id: "bank-east-1", bankName: "BCA", accountNumber: "0123456789", accountHolder: "PT Therapedia Tumbuh Kembang", isActive: true, sortOrder: 1 },
      { id: "bank-east-2", bankName: "Mandiri", accountNumber: "1400012345678", accountHolder: "PT Therapedia Tumbuh Kembang", isActive: true, sortOrder: 2 },
    ],
  },
  {
    id: "branch-citraland", name: "Citraland", code: "CTL", city: "Surabaya", address: "", phone: "", isActive: true,
    bankAccounts: [{ id: "bank-ctl-1", bankName: "BCA", accountNumber: "0987654321", accountHolder: "PT Therapedia Tumbuh Kembang", isActive: true, sortOrder: 1 }],
  },
  { id: "branch-sby-barat", name: "West", code: "WEST", city: "Surabaya", address: "", phone: "", isActive: true, bankAccounts: [] },
];

// Semua cabang yang belum dihapus (aktif + nonaktif), diisi ulang in-place oleh `syncBranches`.
export const BRANCHES = [...DEFAULT_BRANCHES];

export function syncBranches(list) {
  BRANCHES.splice(0, BRANCHES.length, ...(list || []));
}

// Cabang yang masih beroperasi: untuk pilihan penugasan / input baru. Cabang nonaktif tetap muncul sebagai nama di riwayat.
export const activeBranches = () => BRANCHES.filter((b) => b.isActive !== false);

// Cakupan cabang data: `branchId` kosong (null) = semua cabang (akun/terapis/libur lintas cabang); terisi = 1 cabang.
// `activeBranch` "all" atau kosong = tampilkan semua cabang; selain itu hanya cabang itu + entitas lintas cabang (branchId null).
export const inBranchScope = (entityBranchId, activeBranch) =>
  !activeBranch || activeBranch === "all" || !entityBranchId || entityBranchId === activeBranch;

// Nama cabang untuk tampilan; "—" bila id tidak dikenal (jangan menebak cabang lain)
export const branchName = (id) => BRANCHES.find((b) => b.id === id)?.name || "—";

export const branchCodeOf = (name) =>
  String(name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);

export const newBranchId = (name) =>
  `branch-${String(name || "baru")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;

// Rekening bank pembayaran cabang yang boleh dilihat ortu: hanya yang aktif, urut sortOrder. Data lama tanpa `bankAccounts` = [].
export const activeBankAccounts = (branch) =>
  (branch?.bankAccounts || []).filter((a) => a.isActive !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

export const newBankAccountId = () => `bank-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Dampak hapus cabang (permanen, ADR 0005): jumlah data yang ikut terhapus. Hanya menghitung; penghapusan ada di
// hook use-case useBranchDeleteActions.
export function branchDeleteImpact(branchId, { clients = [], schedules = [], invoices = [], staff = [], holidays = [] } = {}) {
  const inBranch = (x) => x.branchId === branchId;
  return {
    clients: clients.filter(inBranch).length,
    sessions: schedules.filter(inBranch).length,
    invoices: invoices.filter(inBranch).length,
    staff: staff.filter(inBranch).length,
    holidays: holidays.filter(inBranch).length,
  };
}

// Validasi form cabang. Kode & nama harus unik (abaikan cabang yang sedang diedit). Mengembalikan pesan error atau null.
export function validateBranch(form, branches = BRANCHES, selfId = null) {
  const name = String(form?.name || "").trim();
  const code = String(form?.code || "").trim().toUpperCase();
  if (!name) return "Nama cabang wajib diisi.";
  if (!/^[A-Z0-9]{2,10}$/.test(code)) return "Kode cabang wajib 2–10 karakter huruf/angka (mis. EAST).";
  const others = branches.filter((b) => b.id !== selfId);
  if (others.some((b) => b.code.toUpperCase() === code)) return `Kode cabang "${code}" sudah dipakai.`;
  if (others.some((b) => b.name.trim().toLowerCase() === name.toLowerCase())) return `Nama cabang "${name}" sudah dipakai.`;
  return null;
}

// Validasi form rekening bank cabang. Pasangan bank + no. rekening harus unik per cabang (abaikan rekening yang sedang diedit).
// Mengembalikan pesan error atau null.
export function validateBankAccount(form, accounts = [], selfId = null) {
  const bankName = String(form?.bankName || "").trim();
  const accountNumber = String(form?.accountNumber || "").trim();
  const accountHolder = String(form?.accountHolder || "").trim();
  if (!bankName) return "Nama bank wajib diisi.";
  if (!accountNumber) return "Nomor rekening wajib diisi.";
  if (!/^[0-9][0-9 -]*$/.test(accountNumber)) return "Nomor rekening hanya boleh angka, spasi, atau tanda strip.";
  if (!accountHolder) return "Nama pemilik rekening wajib diisi.";
  const dup = accounts.some(
    (a) => a.id !== selfId && a.bankName.trim().toLowerCase() === bankName.toLowerCase() && a.accountNumber.trim() === accountNumber
  );
  if (dup) return "Rekening ini sudah terdaftar di cabang tersebut.";
  return null;
}

// Pilihan rentang tren intake bulanan (kartu punya filter sendiri, tidak mengikuti filter waktu halaman).
export const TREND_RANGES = [
  { value: "3", label: "3 bulan" },
  { value: "6", label: "6 bulan" },
  { value: "12", label: "12 bulan" },
  { value: "ytd", label: "Tahun ini" },
];

// Jumlah bulan untuk pilihan rentang; "ytd" = Januari s/d bulan berjalan.
export const trendMonthCount = (range, now = new Date()) => (range === "ytd" ? now.getMonth() + 1 : parseInt(range, 10) || 6);

export const trendRangeTitle = (range) => (range === "ytd" ? "Tahun Ini" : `${range} Bulan Terakhir`);

// Intake baru per bulan (berdasar createdAt) per cabang, berakhir di bulan berjalan. Hasil: [{ month, [branchName]: n }].
export function buildMonthlyIntakeTrend({ clients, branches, range = "6", now = new Date() }) {
  const count = trendMonthCount(range, now);
  return Array.from({ length: count }, (_, i) => {
    const m = subMonths(now, count - 1 - i);
    const key = format(m, "yyyy-MM");
    const item = { month: format(m, "MMM yyyy") };
    branches.forEach((b) => {
      item[b.name] = clients.filter((c) => c.branchId === b.id && (c.createdAt || "").slice(0, 7) === key).length;
    });
    return item;
  });
}
