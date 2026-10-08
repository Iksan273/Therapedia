import { todayStr, uid } from "@/shared/lib/id";
import { matchesClientSearch } from "./client";
import { leavePolicyOf } from "./leave";
import { OTHER_REASON } from "./schedule";

// Domain kredit & paket terapi.
// Aturan di file ini pure (tanpa React/storage). Dipakai reducer creditsStore sekarang,
// dan menjadi acuan CreditService Laravel nanti (lihat docs/guide/05 & 10).

export const DEFAULT_MASTER_PACKAGES = [
  { id: "pkg-reguler", invoiceCode: "REG", name: "Regular Therapist", credits: 10, price: 2500000, description: "10 Sesi Terapi bersama Regular Therapist (OT / Sensori / Wicara)", leaveQuota: 3, isSatuan: false, isAssessment: false },
  { id: "pkg-vip", invoiceCode: "SNR", name: "Senior Therapist", credits: 10, price: 3500000, description: "10 Sesi Terapi bersama Senior Therapist (1-on-1 Specialist)", leaveQuota: 3, isSatuan: false, isAssessment: false },
  { id: "pkg-consult", invoiceCode: "KON", name: "Paket Konsultasi", credits: 1, price: 500000, description: "1 Sesi Konsultasi Klinis & Review", leaveQuota: 1, isSatuan: true, isAssessment: false },
];

// Konfigurasi cuti sebuah paket master (default aman untuk data lama): jatah hari cuti, paket satuan (cuti maks 1x/bulan,
// jatah tidak reset otomatis), dan penanda paket asesmen.
export const packageLeaveConfig = (master) => ({
  leaveQuota: Math.max(0, Number(master?.leaveQuota) || 0),
  isSatuan: Boolean(master?.isSatuan),
  isAssessment: Boolean(master?.isAssessment),
});

// Nama paket tanpa jumlah sesi, mis. "Regular Therapist (10x)" -> "Regular Therapist" (riwayat sesi client).
export const packageBaseName = (name) => formatPackageName(name).replace(/\s*\(\d+x\)\s*$/i, "").trim();

export const formatPackageName = (name) => {
  if (!name) return "Regular Therapist";
  return name
    .replace(/Paket Reguler/gi, "Regular Therapist")
    .replace(/Paket VIP/gi, "Senior Therapist")
    .replace(/\bReguler\b/gi, "Regular Therapist")
    .replace(/\bVIP\b/gi, "Senior Therapist");
};

// CREDIT LEAVE per paket (revisi 7 Okt 2026, menggantikan kuota cancel 3x): tiap paket membawa sejumlah credit leave (diatur di
// master paket, `leaveQuota`; bawaan 3 untuk paket lama). Saat Admin Schedule membatalkan sesi dengan pilihan "Potong", yang
// dipotong lebih dulu adalah credit leave paket itu (kredit sesi utuh); bila credit leave habis barulah 1 kredit sesi dipotong.
// "Jangan potong" tidak memakai apa pun. Ini BERBEDA dari jatah cuti 30 hari/tahun (domain/leave.js, hanya diubah Finance).
export const DEFAULT_LEAVE_CREDITS = 3;
export const leaveTotalOf = (pkg) => (pkg?.leaveTotal != null ? Number(pkg.leaveTotal) : DEFAULT_LEAVE_CREDITS);
export const leaveRemainingOf = (pkg) => Math.max(0, leaveTotalOf(pkg) - (Number(pkg?.leaveUsed) || 0));
// Total credit leave client = jumlah sisa semua paket yang masih berlaku (turunan; di DB disimpan juga di tabel client)
export const leaveCreditTotal = (record) =>
  (record?.packages || []).filter((p) => p.status !== "voided" && p.status !== "converted").reduce((n, p) => n + leaveRemainingOf(p), 0);

// `by` = pelaku (nama staf / role) yang memicu mutasi kredit; kolom `credit_ledger.created_by` di backend.
const historyEntry = ({ by = null, ...fields }) => ({ id: uid(), date: todayStr(), scheduleId: null, by, ...fields });

// Paket target sesi; fallback ke paket pertama yang masih punya sisa kredit
const findPackageIndex = (packages, packageId) => {
  const exact = packages.findIndex((p) => p.id === packageId || p.packageId === packageId);
  return exact !== -1 ? exact : packages.findIndex((p) => p.remainingCredit > 0);
};

const debitPackage = (pkg, extra = {}) => ({
  ...pkg,
  remainingCredit: Math.max(0, pkg.remainingCredit - 1),
  status: pkg.remainingCredit - 1 <= 0 ? "depleted" : "active",
  ...extra,
});

export function newCreditRecord({ clientId, branchId, id }) {
  return { id: id || `cr-${uid().slice(-6)}`, clientId, branchId, packages: [], history: [] };
}

export const newClientPackageId = () => `cp-${uid().slice(-6)}`;

// `price` = snapshot harga saat paket dibuat/diperpanjang (tidak ikut berubah bila harga master diedit).
export function newClientPackage({ id, packageId, packageName, credits, price = null, leaveTotal = DEFAULT_LEAVE_CREDITS }) {
  return {
    id: id || newClientPackageId(),
    packageId: packageId || "pkg-reguler",
    packageName: packageName || "Regular Therapist (10x)",
    price,
    totalCredit: credits,
    remainingCredit: credits,
    cancelCount: 0,
    leaveTotal, // credit leave paket ini (snapshot master `leaveQuota`)
    leaveUsed: 0,
    status: "active",
  };
}

const REVERTIBLE_ACTIONS = ["used", "cancel_excused", "cancel_penalty", "cancel_leave", "off_excused", "off_penalty"];
// Aksi ledger yang tidak mengubah kredit (kredit utuh)
const KEEP_ACTIONS = ["cancel_excused", "cancel_leave", "off_excused"];

// Mutasi sesi ini yang belum dibalik (belum ada baris `reversal` yang menunjuk id-nya).
// Setelah revert lalu complete lagi, mutasi baru (id berbeda) menjadi mutasi aktif.
export function findLiveSessionEntry(record, scheduleId, actions = REVERTIBLE_ACTIONS) {
  const history = record?.history || [];
  const reversed = new Set(history.filter((h) => h.action === "reversal").map((h) => h.reversesId));
  return [...history].reverse().find((h) => h.scheduleId === scheduleId && actions.includes(h.action) && !reversed.has(h.id)) || null;
}

// Sesi therapy selesai: −1 kredit. Idempoten per scheduleId selama mutasi `used` belum dibalik.
export function applySessionCompleted(record, { packageId, scheduleId, date, by = null }) {
  const packages = record.packages || [];
  if (packages.length === 0) return record;
  const idx = findPackageIndex(packages, packageId);
  if (idx === -1) return record;
  if (findLiveSessionEntry(record, scheduleId, ["used"])) return record;

  const target = packages[idx];
  const nextPackages = [...packages];
  nextPackages[idx] = debitPackage(target);
  return {
    ...record,
    packages: nextPackages,
    history: [
      ...(record.history || []),
      historyEntry({ by,
        date: date || todayStr(),
        scheduleId,
        packageId: target.id,
        packageName: target.packageName,
        action: "used",
        creditChange: -1,
        note: `Sesi terapi selesai menggunakan ${target.packageName}`,
      }),
    ],
  };
}

// Sesi dibatalkan (Cancel / Off). `cancelCount` = jumlah pembatalan paket (statistik). Admin memilih potong atau tidak:
//   • tidak potong (`deductCredit` false) → ledger `cancel_excused`, tidak ada yang berkurang.
//   • potong dan paket masih punya CREDIT LEAVE → ledger `cancel_leave`: credit leave −1, kredit sesi UTUH.
//   • potong tetapi credit leave habis → ledger `cancel_penalty`: 1 kredit sesi dipotong (CHECK sisa ≥ 0).
// Tanpa paket / tanpa sisa apa pun, pemotongan tidak mungkin → `cancel_excused`.
// `kind: "off"` = pembatalan karena CUTI dari Finance (`leaveId`): memotong jatah cuti 30 hari (bukan credit leave paket maupun kredit
// sesi) dan TIDAK menambah `cancelCount`; ledger `off_excused`.
export function applySessionCancelled(record, { packageId, scheduleId, cancelReason, date, deductCredit = false, kind = "cancel", by = null }) {
  const packages = record.packages || [];
  const idx = findPackageIndex(packages, packageId);
  const target = idx !== -1 ? packages[idx] : null;
  const reason = cancelReason || OTHER_REASON;
  const isOff = kind === "off";
  const cancelCount = (target?.cancelCount || 0) + (isOff ? 0 : 1);
  const wantsCut = Boolean(deductCredit) && Boolean(target) && !isOff;
  const useLeave = wantsCut && leaveRemainingOf(target) > 0;
  const deduct = wantsCut && !useLeave && target.remainingCredit > 0;

  const nextPackages = [...packages];
  if (target) {
    nextPackages[idx] = deduct
      ? debitPackage(target, { cancelCount })
      : { ...target, cancelCount, leaveUsed: (target.leaveUsed || 0) + (useLeave ? 1 : 0) };
  }

  const action = isOff ? "off_excused" : useLeave ? "cancel_leave" : deduct ? "cancel_penalty" : "cancel_excused";
  const note = isOff
    ? `Sesi cuti (${cancelReason || "OL"}) memotong jatah cuti; kredit sesi tidak dipotong`
    : useLeave
    ? `Cancel ke-${cancelCount} pada paket (${cancelReason || "Izin"}) — memakai 1 credit leave ${target.packageName} (sisa ${leaveRemainingOf(target) - 1}); kredit sesi utuh`
    : deduct
    ? `Cancel ke-${cancelCount} pada paket — credit leave habis, dipotong 1 kredit ${target.packageName}`
    : `Cancel ke-${cancelCount} pada paket (${cancelReason || "Izin"}) — admin memilih tidak potong kredit`;

  return {
    ...record,
    packages: nextPackages,
    history: [
      ...(record.history || []),
      historyEntry({ by,
        date: date || todayStr(),
        scheduleId,
        packageId: target ? target.id : null,
        packageName: target ? target.packageName : "General",
        action,
        creditChange: deduct ? -1 : 0,
        leaveChange: useLeave ? -1 : 0,
        cancelReason: reason,
        cancelCountAfter: target ? cancelCount : null,
        note,
      }),
    ],
  };
}

// Batalkan efek kredit satu sesi (revert completed / cancel). Ledger append-only: baris lama tidak diubah,
// koreksi = baris `reversal` yang menunjuk id baris asal (`reversesId`); satu baris hanya bisa dibalik sekali.
//   used           → +1 kredit ke paket asal
//   cancel_penalty → +1 kredit, penghitung cancel paket −1
//   cancel_leave   → credit leave +1, penghitung cancel −1 (kredit sesi tidak berubah)
//   cancel_excused → penghitung cancel −1 (kredit tidak berubah)
//   off_penalty    → +1 kredit (penghitung cancel tidak berubah)
//   off_excused    → tidak ada perubahan
export function applySessionReverted(record, { scheduleId, date, reason, by = null }) {
  const entry = findLiveSessionEntry(record, scheduleId);
  if (!entry) return record;

  const packages = record.packages || [];
  const idx = packages.findIndex((p) => p.id === entry.packageId);
  const refunds = !KEEP_ACTIONS.includes(entry.action);
  const isCancel = ["cancel_penalty", "cancel_excused", "cancel_leave"].includes(entry.action); // hanya cancel yang menambah penghitung
  let nextPackages = packages;
  if (idx !== -1 && (refunds || isCancel)) {
    const pkg = packages[idx];
    const remaining = refunds ? Math.min(pkg.totalCredit, pkg.remainingCredit + 1) : pkg.remainingCredit;
    nextPackages = [...packages];
    nextPackages[idx] = {
      ...pkg,
      remainingCredit: remaining,
      status: remaining > 0 ? "active" : pkg.status,
      cancelCount: isCancel ? Math.max(0, (pkg.cancelCount || 0) - 1) : pkg.cancelCount,
      leaveUsed: entry.action === "cancel_leave" ? Math.max(0, (pkg.leaveUsed || 0) - 1) : pkg.leaveUsed,
    };
  }
  return {
    ...record,
    packages: nextPackages,
    history: [
      ...(record.history || []),
      historyEntry({ by,
        date: date || todayStr(),
        scheduleId,
        packageId: entry.packageId,
        packageName: entry.packageName,
        action: "reversal",
        creditChange: refunds && idx !== -1 ? 1 : 0,
        reversesId: entry.id,
        note: `Dibatalkan (revert) — ${reason || "tanpa alasan"}`,
      }),
    ],
  };
}

// Credit leave paket baru (dipanggil sebelum paket ditambahkan ke record): mengembalikan { leaveTotal, packages }.
//  • Paket reguler: tiap pembelian/renewal membawa credit leave BARU sebesar `leaveQuota` master (reset per paket).
//  • Paket satuan (`isSatuan`): credit leave TIDAK reset otomatis. Paket pertama membawa `leaveQuota`; paket berikutnya
//    MELANJUTKAN sisa paket sebelumnya (sisa lama dipindah, jadi total client tetap satu kumpulan). Finance memakai opsi
//    "Reset credit leave" saat renewal (`reset`) untuk mengisi ulang ke `leaveQuota` (sisa lama dihanguskan).
// Total credit leave client (`leaveCreditTotal`) selalu = jumlah sisa semua paket yang berlaku.
export function prepareLeaveCredit(record, master, { reset = false } = {}) {
  const quota = Math.max(0, Number(master?.leaveQuota) || 0);
  const packages = record?.packages || [];
  if (!master?.isSatuan) return { leaveTotal: quota, packages };
  const live = packages.filter((p) => p.status !== "voided" && p.status !== "converted");
  if (reset || live.length === 0) {
    return { leaveTotal: quota, packages: reset ? packages.map((p) => (live.includes(p) ? { ...p, leaveTotal: p.leaveUsed || 0 } : p)) : packages };
  }
  const carried = live.reduce((n, p) => n + leaveRemainingOf(p), 0);
  return { leaveTotal: carried, packages: packages.map((p) => (live.includes(p) ? { ...p, leaveTotal: p.leaveUsed || 0 } : p)) };
}

// Konteks cuti client dari record kredit + master paket: jatah (`granted`), tanggal reset (`since`), dan `isSatuan`
// (paket aktif client = paket satuan → cuti maks 1x per bulan). Dipakai planLeave & form jadwal.
export function clientLeaveContext(record, masterPackages = [], globalSince = null) {
  const active = activePackageOf(record);
  const master = active ? masterPackages.find((m) => m.id === active.packageId) : null;
  return { ...leavePolicyOf(record, globalSince), isSatuan: Boolean(master?.isSatuan) };
}

// Tambah paket kredit baru (pembelian / renewal) ke record client
export function applyPackageAdded(record, pkg, note, by = null) {
  return {
    ...record,
    packages: [...(record.packages || []), pkg],
    history: [
      ...(record.history || []),
      historyEntry({ by, packageId: pkg.id, packageName: pkg.packageName, action: "renewed", creditChange: pkg.totalCredit, note }),
    ],
  };
}

// ---- Invoice (keputusan klien): jenis Paket Sesi, Assessment, dan Cuti ----
export const INVOICE_TYPES = [
  { value: "package", label: "Paket Sesi" },
  { value: "assessment", label: "Assessment" },
  { value: "leave", label: "Cuti" },
];
export const DEFAULT_ASSESSMENT_FEE = 500000; // nominal invoice assessment yang terbit otomatis saat kode kuesioner dibuat (sementara; Finance bisa membuat invoice manual dengan nominal lain)
export const ASSESSMENT_INVOICE_CODE = "ASM"; // kode jenis invoice assessment (dicadangkan; tidak boleh dipakai paket)
export const LEAVE_INVOICE_CODE = "CUT"; // kode jenis invoice cuti (dicadangkan; diterbitkan Finance, opsional tertaut ke log cuti `leaveId`)
export const RESERVED_INVOICE_CODES = [ASSESSMENT_INVOICE_CODE, LEAVE_INVOICE_CODE];

// Invoice lama tanpa `type` = Paket Sesi.
// Invoice cuti (`leave`): diterbitkan FINANCE dengan nominal manual (tab Cuti / Buat Tagihan), opsional tertaut ke log cuti (`leaveId`);
// lunas tanpa efek kredit/paket (seperti assessment). Invoice lama tertaut ke sesi lewat `leaveScheduleId`.
export const invoiceType = (inv) => (inv?.type === "assessment" ? "assessment" : inv?.type === "leave" ? "leave" : "package");
export const invoiceTypeLabel = (inv) => (invoiceType(inv) === "leave" ? "Cuti" : INVOICE_TYPES.find((t) => t.value === invoiceType(inv))?.label || "Paket Sesi");

const normalizeInvoiceCode = (v) =>
  String(v || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);

// Kode jenis invoice paket: `invoiceCode` master paket; paket lama tanpa kode memakai 3 huruf pertama nama.
export const packageInvoiceCode = (pkg) => {
  const code = normalizeInvoiceCode(pkg?.invoiceCode) || normalizeInvoiceCode(pkg?.name).slice(0, 3) || "PKT";
  return RESERVED_INVOICE_CODES.includes(code) ? "PKT" : code;
};

export const invoiceTypeCode = (type, pkg) => (type === "assessment" ? ASSESSMENT_INVOICE_CODE : type === "leave" ? LEAVE_INVOICE_CODE : packageInvoiceCode(pkg));

const ymd = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

// Nomor invoice: INV-{KODE}-{YYYYMMDD}-{NNN}. Increment per kode + tanggal (reset harian), mis. INV-REG-20261003-001.
export function nextInvoiceNumber(invoices = [], { typeCode = "PKT", now = new Date() } = {}) {
  const prefix = `INV-${typeCode}-${ymd(now)}-`;
  const maxSeq = invoices.reduce((max, inv) => {
    const num = inv.invoiceNumber || "";
    if (!num.startsWith(prefix)) return max;
    const n = Number(num.slice(prefix.length));
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  return `${prefix}${String(maxSeq + 1).padStart(3, "0")}`;
}

// ---- Bukti pembayaran: JPG/PNG/PDF maks 5 MB; upload sekali + re-upload maks 3x (total 4) ----
export const MAX_PROOF_UPLOADS = 4;
export const MAX_PROOF_BYTES = 5 * 1024 * 1024;
export const PROOF_ACCEPT = "image/jpeg,image/png,application/pdf";

// Jumlah upload yang sudah terpakai. Invoice lama dengan bukti tapi tanpa penghitung dianggap 1x.
export const proofUploadsUsed = (inv) =>
  inv?.proofUploadCount != null ? inv.proofUploadCount : inv?.proofUrl || inv?.proofOfPaymentUrl ? 1 : 0;

export const proofUploadsLeft = (inv) => Math.max(0, MAX_PROOF_UPLOADS - proofUploadsUsed(inv));

export const canUploadProof = (inv) => Boolean(inv) && inv.status !== "paid" && inv.status !== "void" && proofUploadsLeft(inv) > 0;

// Validasi file bukti: kembalikan pesan error (string) atau null bila valid. `file` = { name, type, size }.
export const validateProofFile = (file) => {
  if (!file) return "File tidak ditemukan.";
  const name = String(file.name || "").toLowerCase();
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
  const isJpg = file.type === "image/jpeg" || /\.jpe?g$/.test(name);
  const isPng = file.type === "image/png" || name.endsWith(".png");
  if (!isPdf && !isJpg && !isPng) return "Format file tidak didukung. Gunakan JPG, PNG, atau PDF.";
  if (file.size > MAX_PROOF_BYTES) return "Ukuran file terlalu besar. Maksimal 5 MB.";
  return null;
};

// Paket yang sedang dipakai: paket pertama yang masih punya sisa (FIFO); bila semua habis, paket terakhir.
export const activePackageOf = (record) => {
  const packages = record?.packages || [];
  const live = packages.filter((p) => p.status !== "voided"); // paket yang dicabut (void) tidak jadi pilihan
  return live.find((p) => p.remainingCredit > 0) || live[live.length - 1] || packages[packages.length - 1] || null;
};

// Paket aktif untuk tampilan ringkas (mis. Client Roster): hanya paket yang masih punya sisa, digabung per jenis paket
// (nama tanpa akhiran "(10x)") sehingga tidak muncul dobel. Paket habis (0) disembunyikan. Urutan = paket pertama muncul.
// `fallbackLast`: bila tak ada paket bersisa sama sekali, kembalikan SATU paket terakhir (0 sesi = Frozen), bukan daftar kosong.
export function distinctActivePackages(packages = [], { fallbackLast = false } = {}) {
  const byName = new Map();
  for (const p of packages) {
    if (!(p.remainingCredit > 0)) continue;
    const name = formatPackageName(p.packageName).replace(/\s*\(\d+x\)\s*$/i, "").trim();
    const prev = byName.get(name);
    byName.set(name, { name, remainingCredit: (prev?.remainingCredit || 0) + p.remainingCredit, packageCount: (prev?.packageCount || 0) + 1 });
  }
  if (byName.size === 0 && fallbackLast && packages.length) {
    const nonVoided = packages.filter((p) => p.status !== "voided");
    if (nonVoided.length === 0) return [];
    const last = nonVoided[nonVoided.length - 1];
    return [{ name: formatPackageName(last.packageName).replace(/\s*\(\d+x\)\s*$/i, "").trim(), remainingCredit: 0, packageCount: 1, depleted: true }];
  }
  return [...byName.values()];
}

// Pencarian baris keuangan (invoice / log kredit): nama anak, nama ortu, kode client (lewat `matchesClientSearch`),
// plus nomor invoice. `client` = data client lengkap (untuk nama ortu & kode); bila tak ada, jatuh ke `row.clientName`.
export function matchesFinanceSearch(row, client, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  const ref = client || { clientName: row?.clientName };
  return matchesClientSearch(ref, q) || String(row?.invoiceNumber || "").toLowerCase().includes(q);
}

// Paket yang dipakai sebuah sesi: paket yang dipilih saat menjadwalkan bila masih punya sisa; bila sudah habis /
// belum dipilih → paket aktif tertua (FIFO), dan bila semua habis → paket terakhir (sesi Frozen).
export function resolveSessionPackage(record, schedule) {
  const packages = record?.packages || [];
  const chosen = packages.find((p) => p.id === schedule?.creditPackageId || p.packageId === schedule?.creditPackageId);
  if (chosen && chosen.remainingCredit > 0) return chosen;
  return activePackageOf(record) || chosen || null;
}

// Sesi terapi mendatang yang masih menunjuk paket habis / tak ada, dan perlu dipindah ke paket aktif saat renewal.
// `targetId` = paket aktif tertua yang sudah ada, atau paket baru bila belum ada yang bersisa. Mengembalikan { ids, targetId }.
const RELINKABLE_STATUSES = ["scheduled", "rescheduled", "reschedule_pending"];
export function planSessionRelink({ record, schedules, newPackageId, today }) {
  const packages = record?.packages || [];
  const activeExisting = packages.find((p) => p.remainingCredit > 0);
  const targetId = activeExisting?.id || newPackageId;
  const usable = new Set(packages.filter((p) => p.remainingCredit > 0).map((p) => p.id));
  const ids = schedules
    .filter((s) => s.type === "therapy" && RELINKABLE_STATUSES.includes(s.status) && (!today || s.date >= today))
    .filter((s) => !s.creditPackageId || !usable.has(s.creditPackageId))
    .filter((s) => s.creditPackageId !== targetId)
    .map((s) => s.id);
  return { ids, targetId };
}

// "Tidak hadir" untuk analitik kehadiran: sesi cancelled yang MEMOTONG kredit (baris ledger `cancel_penalty` yang belum
// dibalik). Cancel yang tidak memotong kredit (`cancel_excused`) tidak dihitung sebagai tidak hadir.
export const isCreditedAbsence = (record, scheduleId) => Boolean(findLiveSessionEntry(record, scheduleId, ["cancel_penalty"]));

// Frozen (turunan, tidak disimpan): kredit client 0 ATAU belum punya record/paket sama sekali.
export const isCreditZero = (record) => !record || !(record.remainingCredit > 0);

// Rincian CREDIT LEAVE PER PAKET (tiap paket punya sendiri; `quota` = total, `cancelCount` = credit leave terpakai, `remaining` =
// sisa). Paket yang dirinci = paket yang masih punya sisa kredit; bila tak ada yang bersisa, paket terakhir. Paket sejenis diberi
// nomor urut ("Regular Therapist #1", "#2"). `total` = sisa credit leave semua paket yang dirinci.
export function cancelQuotaByPackage(record) {
  const packages = record?.packages || [];
  const shown = packages.filter((p) => p.remainingCredit > 0);
  const list = shown.length ? shown : packages.filter((p) => p.status !== "voided").slice(-1);
  const baseName = (p) => formatPackageName(p.packageName).replace(/\s*\(\d+x\)\s*$/i, "").trim();
  const sameName = (p) => list.filter((q) => baseName(q) === baseName(p));
  const rows = list.map((p) => {
    const peers = sameName(p);
    const quota = leaveTotalOf(p);
    const used = Math.min(quota, p.leaveUsed || 0);
    return {
      id: p.id,
      label: peers.length > 1 ? `${baseName(p)} #${peers.indexOf(p) + 1}` : baseName(p),
      remainingCredit: p.remainingCredit || 0,
      cancelCount: used,
      quota,
      remaining: leaveRemainingOf(p),
      over: false,
    };
  });
  return { rows, total: rows.reduce((a, r) => a + r.remaining, 0), anyOver: false };
}

// Ringkasan record untuk UI: total sisa & total kredit semua paket + credit leave paket yang sedang dipakai.
export function summarizeCreditRecord(record) {
  if (!record) return null;
  const packages = record.packages || [];
  const active = activePackageOf(record);
  return {
    ...record,
    remainingCredit: packages.reduce((acc, p) => acc + (p.remainingCredit || 0), 0),
    totalCredit: packages.reduce((acc, p) => acc + (p.totalCredit || 0), 0),
    packages,
    cancelCount: active?.cancelCount || 0,
    leaveUsed: active?.leaveUsed || 0,
    leaveQuota: active ? leaveTotalOf(active) : 0,
    leaveRemaining: active ? leaveRemainingOf(active) : 0,
    leaveCreditTotal: leaveCreditTotal(record),
  };
}

// ---- Konversi paket (Finance): sisa sesi paket lama → paket jenis lain ----
// Keputusan klien: nilai sisa dihitung dari harga bayar paket asal; hasil sesi dibulatkan ke bawah (atau diisi manual,
// tidak boleh melebihi nilai sisa → tidak ada kekurangan bayar); lebihan rupiah jadi SALDO client yang memotong invoice
// paket berikutnya; kuota cancel ikut pindah; semua jadwal mendatang dihapus (admin schedule menjadwalkan ulang).

export const CONVERSION_MODES = [
  { value: "auto", label: "Otomatis" },
  { value: "manual", label: "Manual" },
];

// Harga per sesi dari snapshot harga bayar. Tanpa harga/kredit → null.
export const unitValueOf = (price, credits) => (Number(price) > 0 && Number(credits) > 0 ? Number(price) / Number(credits) : null);

// Hitung konversi. `source` = { remainingCredit, totalCredit, price }, `target` = { credits, price } (master paket tujuan).
// `sessions` kosong/null → otomatis (maks sesi); diisi → manual. Mengembalikan { ok, error?, mode, sessions, maxSessions,
// remainingValue, targetUnit, leftover }. Rupiah dibulatkan utuh.
export function computePackageConversion({ source, target, sessions = null }) {
  const sourceUnit = unitValueOf(source?.price, source?.totalCredit);
  const targetUnit = unitValueOf(target?.price, target?.credits);
  const remaining = Number(source?.remainingCredit) || 0;
  if (!sourceUnit || !targetUnit) return { ok: false, error: "Harga paket asal/tujuan belum lengkap." };
  if (remaining <= 0) return { ok: false, error: "Paket asal tidak punya sisa sesi." };

  const remainingValue = Math.round(remaining * sourceUnit);
  const maxSessions = Math.floor((remainingValue + 1e-6) / targetUnit);
  if (maxSessions < 1) return { ok: false, error: "Nilai sisa paket belum cukup untuk 1 sesi paket tujuan." };

  const manual = sessions !== null && sessions !== undefined && sessions !== "";
  const count = manual ? Number(sessions) : maxSessions;
  if (!Number.isInteger(count) || count < 1) return { ok: false, error: "Jumlah sesi harus bilangan bulat minimal 1." };
  if (count > maxSessions) return { ok: false, error: `Maksimal ${maxSessions} sesi (nilai sisa tidak boleh kurang).` };

  return {
    ok: true,
    mode: manual ? "manual" : "auto",
    sessions: count,
    maxSessions,
    remainingValue,
    targetUnit: Math.round(targetUnit),
    leftover: remainingValue - Math.round(count * targetUnit),
  };
}

// Paket kredit yang terhubung ke invoice. Mengikuti rantai konversi (`convertedToId`) sampai paket yang masih hidup.
// Invoice lama tanpa `invoiceId` di paket: cocokkan paket aktif dengan packageId + jumlah kredit snapshot invoice.
export function resolveInvoicePackage(record, invoice) {
  const packages = record?.packages || [];
  if (!invoice || invoiceType(invoice) !== "package") return null;
  let pkg =
    packages.find((p) => p.invoiceId === invoice.id) ||
    packages.find((p) => !p.invoiceId && !p.convertedFromId && p.packageId === invoice.packageId && p.totalCredit === invoice.credits && p.status !== "converted");
  const seen = new Set();
  while (pkg?.convertedToId && !seen.has(pkg.id)) {
    seen.add(pkg.id);
    pkg = packages.find((p) => p.id === pkg.convertedToId) || null;
  }
  return pkg;
}

// Invoice bisa dikonversi: lunas, BELUM pernah dikonversi (konversi hanya 1x per invoice; dilihat dari log `converted`)
// dan paket hidup masih punya sisa sesi.
export const isInvoiceConvertible = (record, invoice) => {
  if (!invoice || invoice.status !== "paid" || isInvoiceConverted(invoice)) return false;
  const pkg = resolveInvoicePackage(record, invoice);
  return Boolean(pkg) && pkg.status === "active" && pkg.remainingCredit > 0;
};

// Terapkan konversi ke record client. Ledger append-only: `converted_out` (−sisa, paket lama jadi `converted`) dan
// `converted_in` (+sesi, paket baru) berbagi `conversionId`. Kuota cancel paket lama pindah ke paket baru.
// Saldo rupiah client (`balance`) bertambah sebesar lebihan.
export function applyPackageConversion(record, { sourcePackageId, target, sessions, price, leftover = 0, conversionId, note, date, by = null }) {
  const packages = record.packages || [];
  const source = packages.find((p) => p.id === sourcePackageId);
  if (!source || source.status === "converted" || source.remainingCredit <= 0) return record;

  const newPkg = {
    ...newClientPackage({ packageId: target.packageId, packageName: target.packageName, credits: sessions, price }),
    cancelCount: source.cancelCount || 0,
    convertedFromId: source.id,
    conversionId,
  };
  const out = source.remainingCredit;
  const nextPackages = packages
    .map((p) => (p.id === source.id ? { ...p, remainingCredit: 0, status: "converted", convertedToId: newPkg.id, conversionId } : p))
    .concat(newPkg);
  return {
    ...record,
    packages: nextPackages,
    balance: (record.balance || 0) + Math.max(0, leftover),
    history: [
      ...(record.history || []),
      historyEntry({ by, date: date || todayStr(), packageId: source.id, packageName: source.packageName, action: "converted_out", creditChange: -out, conversionId, note }),
      historyEntry({ by, date: date || todayStr(), packageId: newPkg.id, packageName: newPkg.packageName, action: "converted_in", creditChange: sessions, conversionId, note, cancelCountAfter: newPkg.cancelCount }),
    ],
  };
}

// ---- Discharge: sisa sesi hangus ----
// Client di-discharge → sisa sesi semua paket yang masih berjalan HANGUS dan tercatat di ledger sebagai `discharge` (−sisa, satu baris
// per paket, catatan menyebut jumlah & nama paket itu sendiri) sehingga log kredit & saldo rupiah menampilkannya seperti sesi terpakai. Paket jadi `depleted` + `forfeited`. Tidak ada
// refund (refund lewat Finance). Idempoten: paket tanpa sisa dilewati.
export function applyDischargeForfeit(record, { reason = "", note = "", date, by = null } = {}) {
  const live = (record?.packages || []).filter((p) => p.status === "active" && (p.remainingCredit || 0) > 0);
  if (live.length === 0) return record;
  const when = date || todayStr();
  const ids = new Set(live.map((p) => p.id));
  return {
    ...record,
    packages: record.packages.map((p) => (ids.has(p.id) ? { ...p, remainingCredit: 0, status: "depleted", forfeited: true } : p)),
    history: [
      ...(record.history || []),
      ...live.map((p) => historyEntry({ by, date: when, packageId: p.id, packageName: p.packageName, action: "discharge", creditChange: -p.remainingCredit, note: note || `Discharge${reason ? `: ${reason}` : ""}. ${p.remainingCredit} sisa sesi ${packageBaseName(p.packageName)} hangus` })),
    ],
  };
}

// ---- Saldo lebihan konversi → pengurang invoice paket berikutnya ----
// Saldo hanya memotong sampai nominal invoice (tidak pernah membuat invoice negatif); sisanya tetap di saldo.
export function applyBalanceToAmount(balance, gross) {
  const available = Math.max(0, Number(balance) || 0);
  const amount = Math.max(0, Number(gross) || 0);
  const applied = Math.min(available, amount);
  return { gross: amount, applied, net: amount - applied, balanceAfter: available - applied };
}

// ---- Renewal: dua jalur ----
// Ortu tidak mengunggah bukti bayar. `invoice` = terbitkan invoice baru (unpaid, Finance menandai lunas setelah dana diterima);
// `direct` = langsung lunas (pembayaran sudah diterima; catatan Finance opsional).
export const RENEWAL_MODES = {
  invoice: { label: "Terbitkan invoice baru", hint: "Invoice belum lunas; Finance menandai lunas setelah pembayaran diterima." },
  direct: { label: "Langsung lunas", hint: "Pembayaran sudah diterima. Invoice langsung lunas dan paket aktif." },
};

// ---- Hapus & Void invoice (ADR 0005) ----
// Hapus (permanen) HANYA untuk invoice yang belum lunas / ditolak: belum punya paket, jadi hanya bukti bayar & log-nya yang
// ikut hilang dan saldo lebihan yang dipakainya kembali ke client. Invoice lunas dikoreksi lewat VOID (invoice tetap tercatat).
export const canDeleteInvoice = (inv) => Boolean(inv) && inv.status !== "paid" && inv.status !== "void";
export const canVoidInvoice = (inv) => Boolean(inv) && inv.status === "paid";

// Void (keputusan klien Okt 2026): satu pilihan saja = void invoice dengan kredit/paket DIPERTAHANKAN (invoice keluar dari omzet).
// Hanya untuk invoice yang kreditnya BELUM dipakai; bila sudah ada sesi terpakai / paket dikonversi / invoice sudah direfund,
// void ditolak (koreksi lewat refund). Alasan wajib.
export function validateVoid({ reason, blockedReason = null }) {
  if (blockedReason) return blockedReason;
  if (!String(reason || "").trim()) return "Alasan void wajib diisi.";
  return null;
}

// Rantai paket milik invoice: paket asal + turunan konversinya sampai paket hidup (ujung rantai).
export function invoicePackageChain(record, invoice) {
  const packages = record?.packages || [];
  if (!invoice || invoiceType(invoice) !== "package") return [];
  const root = packages.find((p) => p.invoiceId === invoice.id);
  const chain = [];
  const seen = new Set();
  let cur = root || resolveInvoicePackage(record, invoice);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    chain.push(cur);
    cur = cur.convertedToId ? packages.find((p) => p.id === cur.convertedToId) : null;
  }
  return chain;
}

const VOID_UPCOMING = ["scheduled", "rescheduled", "reschedule_pending"];

// Ringkasan untuk dialog Void/Refund: paket hidup, sisa kredit, kredit & sesi yang sudah terpakai, sesi mendatang, dan
// `voidBlocked` (alasan void tidak boleh; null = boleh). Kredit terpakai = totalCredit − sisa paket akar (sesi selesai,
// cancel/off yang memotong kredit), paket yang sudah dikonversi dianggap terpakai.
export function voidSummary(record, invoice, schedules = [], today = "") {
  const chain = invoicePackageChain(record, invoice);
  const live = chain[chain.length - 1] || null;
  const rootPkg = chain[0] || null;
  const ids = new Set(chain.map((p) => p.id));
  const mine = schedules.filter((s) => s.creditPackageId && ids.has(s.creditPackageId));
  const usedSessions = mine.filter((s) => s.status === "completed").length;
  const converted = chain.length > 1;
  const usedCredits = converted ? rootPkg.totalCredit || 0 : rootPkg ? Math.max(0, (rootPkg.totalCredit || 0) - (rootPkg.remainingCredit || 0)) : 0;
  const refunded = Number(invoice?.refundAmount) > 0;
  const voidBlocked = refunded
    ? "Invoice ini sudah direfund, tidak bisa di-void."
    : converted
      ? "Paket invoice ini sudah dikonversi, jadi kreditnya sudah dipakai. Invoice tidak bisa di-void."
      : usedCredits > 0 || usedSessions > 0
        ? `Kredit invoice ini sudah terpakai (${Math.max(usedCredits, usedSessions)} sesi). Invoice tidak bisa di-void; gunakan Refund untuk sisa kredit.`
        : null;
  return {
    hasPackage: Boolean(live),
    packageName: live ? live.packageName : null,
    livePackageId: live ? live.id : null,
    chainIds: [...ids],
    remaining: live ? live.remainingCredit || 0 : 0,
    usedCredits,
    usedSessions,
    upcomingSessions: mine.filter((s) => s.type === "therapy" && VOID_UPCOMING.includes(s.status) && (!today || s.date >= today)).length,
    balanceApplied: invoice?.balanceApplied || 0,
    voidBlocked,
  };
}

// ---- Refund (keputusan klien Okt 2026) ----
// Refund pada invoice paket lunas: sisa kredit paket hidup dikembalikan sebagai uang. Nominal diusulkan otomatis = sisa kredit ×
// harga per sesi (snapshot harga bayar ÷ total sesi); Finance boleh mengubahnya (maks nilai invoice). Bagian yang sudah
// terpakai tetap Verified Revenue; nominal refund tetap masuk Gross Revenue tetapi dikeluarkan dari Verified Revenue.
// Sisa kredit paket jadi 0 (paket `voided` + penanda `refunded`); invoice tetap `paid`, memegang `refundAmount`. Sekali per invoice.
export const canRefundInvoice = (inv) => Boolean(inv) && inv.status === "paid" && invoiceType(inv) === "package" && !(Number(inv.refundAmount) > 0);

export function buildRefundPlan(record, invoice, schedules = [], today = "") {
  const sum = voidSummary(record, invoice, schedules, today);
  const live = invoicePackageChain(record, invoice).slice(-1)[0] || null;
  const errors = [];
  if (!canRefundInvoice(invoice)) errors.push("Invoice ini tidak bisa direfund (harus invoice paket lunas dan belum pernah direfund).");
  else if (!live || (live.remainingCredit || 0) <= 0) errors.push("Tidak ada sisa kredit pada paket invoice ini untuk direfund.");
  const maxAmount = Number(invoice?.amount) || 0;
  const unit = live ? unitValueOf(Number(live.price) > 0 ? live.price : invoice?.grossAmount || invoice?.amount, live.totalCredit) : null;
  const credits = live ? live.remainingCredit || 0 : 0;
  const suggestedAmount = unit == null ? 0 : Math.min(maxAmount, Math.round(unit * credits));
  return { ok: errors.length === 0, errors, summary: sum, livePackageId: live ? live.id : null, packageName: live ? live.packageName : null, credits, unit, suggestedAmount, maxAmount };
}

export function validateRefund({ amount, reason, plan }) {
  if (!plan?.ok) return plan?.errors?.[0] || "Invoice tidak bisa direfund.";
  const value = Number(amount);
  if (!(value > 0)) return "Nominal refund harus lebih dari 0.";
  if (value > plan.maxAmount) return "Nominal refund tidak boleh melebihi nilai invoice.";
  if (!String(reason || "").trim()) return "Alasan refund wajib diisi.";
  return null;
}

// Sisa kredit paket hidup jadi 0 (paket `voided` + `refunded`, ledger `refund` −sisa); saldo lebihan yang dipakai invoice TIDAK
// dikembalikan (sudah menjadi bagian nilai invoice).
export function applyRefund(record, invoice, { amount, note = "", date, by = null } = {}) {
  const live = invoicePackageChain(record, invoice).slice(-1)[0] || null;
  if (!live) return record;
  const out = live.remainingCredit || 0;
  return {
    ...record,
    packages: (record.packages || []).map((p) => (p.id === live.id ? { ...p, remainingCredit: 0, status: "voided", refunded: true } : p)),
    history: [
      ...(record.history || []),
      historyEntry({ by, date: date || todayStr(), packageId: live.id, packageName: live.packageName, action: "refund", creditChange: -out, note: note || `Refund ${invoice.invoiceNumber} (${amount})` }),
    ],
  };
}

// Ringkasan omzet (dashboard Revenue). Invoice void keluar dari semua angka. `totalRevenue` (Gross Invoiced) = semua invoice
// non-void termasuk bagian refund; `grossRevenue` = invoice lunas (refund tetap termasuk); `verifiedRevenue` = lunas dikurangi refund;
// `pendingRevenue` = belum lunas.
export function revenueMetrics(invoices = []) {
  let totalRevenue = 0;
  let grossRevenue = 0;
  let refundTotal = 0;
  let pendingRevenue = 0;
  let paidCount = 0;
  let totalInvoices = 0;
  invoices.forEach((inv) => {
    if (inv.status === "void") return;
    const amt = Number(inv.amount) || 0;
    totalInvoices += 1;
    totalRevenue += amt;
    if (inv.status === "paid") {
      grossRevenue += amt;
      refundTotal += Math.min(amt, Number(inv.refundAmount) || 0);
      paidCount += 1;
    } else {
      pendingRevenue += amt;
    }
  });
  const verifiedRevenue = grossRevenue - refundTotal;
  return { totalRevenue, grossRevenue, verifiedRevenue, refundTotal, pendingRevenue, totalInvoices, paidCount, collectionRate: totalRevenue > 0 ? Math.round((grossRevenue / totalRevenue) * 100) : 0 };
}

// Omzet bersih (Verified) satu invoice lunas, dipakai grafik per cabang/paket.
export const netPaidAmount = (inv) => (inv?.status === "paid" ? Math.max(0, (Number(inv.amount) || 0) - Math.min(Number(inv.amount) || 0, Number(inv.refundAmount) || 0)) : 0);

// Invoice void (pilihan "pertahankan kredit") yang paketnya belum diambil alih invoice pengganti. Invoice baru bisa
// "menggantikan" salah satunya agar paket lama dipakai ulang dan kredit tidak dobel.
export function replacementCandidates(invoices = [], clientId) {
  const replaced = new Set(invoices.map((i) => i.replacesInvoiceId).filter(Boolean));
  return invoices.filter(
    (i) => i.clientId === clientId && i.status === "void" && i.voidCreditAction === "keep" && invoiceType(i) === "package" && !replaced.has(i.id)
  );
}

// Paket yang dipakai ulang oleh invoice pengganti: pindahkan `invoiceId` paket akar ke invoice baru (kredit tidak bertambah).
export function adoptPackageForReplacement(record, replacedInvoiceId, newInvoice) {
  const price = newInvoice.grossAmount || newInvoice.amount;
  let adopted = false;
  const packages = (record.packages || []).map((p) => {
    if (!adopted && p.invoiceId === replacedInvoiceId) {
      adopted = true;
      return { ...p, invoiceId: newInvoice.id, price };
    }
    return p;
  });
  return adopted ? { record: { ...record, packages }, adopted: true } : { record, adopted: false };
}

// ---- Ringkasan saldo lebihan per client (tab Saldo Lebihan Finance) ----
// `sources` = konversi paket yang menghasilkan lebihan (beserta invoice asal), `uses` = invoice yang memakai saldo itu.
// Invoice yang sudah dihapus (tidak ada di daftar) atau di-void dengan "cabut kredit" tidak dihitung sebagai pemakaian karena
// saldonya sudah kembali. `expected` = total masuk − total terpakai; bila beda dari `balance` (data lama / koreksi manual)
// baris ditandai tidak sinkron agar Finance bisa memeriksa.
export function leftoverSummaryByClient({ records = [], conversions = [], invoices = [] } = {}) {
  const byId = new Map(invoices.map((i) => [i.id, i]));
  const clientIds = new Set([
    ...records.filter((r) => (r.balance || 0) > 0).map((r) => r.clientId),
    ...conversions.filter((c) => (c.leftover || 0) > 0).map((c) => c.clientId),
    ...invoices.filter((i) => (i.balanceApplied || 0) > 0).map((i) => i.clientId),
  ]);
  return [...clientIds].map((clientId) => {
    const record = records.find((r) => r.clientId === clientId);
    const sources = conversions
      .filter((c) => c.clientId === clientId && (c.leftover || 0) > 0)
      .map((c) => ({
        conversionId: c.id,
        invoiceId: c.invoiceId,
        invoiceNumber: byId.get(c.invoiceId)?.invoiceNumber || "—",
        toPackageName: c.toPackageName,
        toSessions: c.toSessions,
        mode: c.mode,
        amount: c.leftover,
        date: (c.createdAt || "").slice(0, 10),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    const uses = invoices
      .filter((i) => i.clientId === clientId && (i.balanceApplied || 0) > 0)
      .map((i) => ({
        invoiceId: i.id,
        invoiceNumber: i.invoiceNumber,
        status: i.status,
        amount: i.balanceApplied,
        returned: i.status === "void" && i.voidCreditAction === "revoke",
        date: (i.createdAt || "").slice(0, 10),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    const totalIn = sources.reduce((a, s) => a + s.amount, 0);
    const totalOut = uses.filter((u) => !u.returned).reduce((a, u) => a + u.amount, 0);
    const balance = record?.balance || 0;
    return { clientId, balance, sources, uses, totalIn, totalOut, expected: Math.max(0, totalIn - totalOut), inSync: balance === Math.max(0, totalIn - totalOut) };
  });
}

// ---- Log invoice (milik invoice sendiri, append-only) ----
export const INVOICE_LOG_ACTIONS = {
  issued: { label: "Invoice diterbitkan", tone: "info" },
  proof_uploaded: { label: "Bukti bayar diunggah", tone: "info" },
  verified: { label: "Pembayaran diverifikasi", tone: "success" },
  rejected: { label: "Pembayaran ditolak", tone: "danger" },
  renewal_paid: { label: "Renewal langsung (lunas)", tone: "success" },
  balance_applied: { label: "Saldo lebihan dipakai", tone: "warning" },
  converted: { label: "Paket dikonversi", tone: "warning" },
  voided: { label: "Invoice di-void", tone: "danger" },
  refunded: { label: "Refund", tone: "warning" },
};

export const invoiceLogMeta = (action) => INVOICE_LOG_ACTIONS[action] || { label: action, tone: "neutral" };

// Tambah satu baris log ke invoice (kembalikan invoice baru).
export const appendInvoiceLog = (invoice, { action, by = null, note = "", data = null, at }) => ({
  ...invoice,
  logs: [...(invoice.logs || []), { id: uid(), at: at || new Date().toISOString(), by, action, note, data }],
});

// Status "dikonversi" diturunkan dari log invoice (tidak disimpan). Mengembalikan log `converted` terbaru atau null.
export const lastInvoiceConversion = (invoice) => [...(invoice?.logs || [])].reverse().find((l) => l.action === "converted") || null;
export const isInvoiceConverted = (invoice) => Boolean(lastInvoiceConversion(invoice));
// Nama paket invoice yang ditampilkan: setelah dikonversi = paket tujuan terakhir (nama paket asal tetap ada di log
// invoice `converted`: `data.fromPackage`). Snapshot `packageName` invoice tidak diubah (dipakai penelusuran paket).
export const invoicePackageName = (invoice) => lastInvoiceConversion(invoice)?.data?.toPackage || invoice?.packageName || "";
export const invoiceConversionCount = (invoice) => (invoice?.logs || []).filter((l) => l.action === "converted").length;

// Log untuk tampilan. Invoice lama tanpa `logs` dibuatkan baris dasar dari createdAt / paidAt.
export function invoiceLogsOf(invoice) {
  if (!invoice) return [];
  if (invoice.logs?.length) return invoice.logs;
  const base = [{ id: `${invoice.id}-issued`, at: invoice.createdAt, by: null, action: "issued", note: "", data: null }];
  if (invoice.paidAt) base.push({ id: `${invoice.id}-paid`, at: invoice.paidAt, by: null, action: "verified", note: "", data: null });
  return base;
}

// ---- Renewal cepat (Finance): client aktif dengan sisa kredit < 3 ----
export const RENEWAL_CREDIT_THRESHOLD = 3;

// Client perlu renewal bila punya paket dan total sisa kredit < RENEWAL_CREDIT_THRESHOLD (0 = Frozen ikut).
export const needsRenewal = (record) => {
  const pkgs = (record?.packages || []).filter((p) => p.status !== "voided");
  if (pkgs.length === 0) return false;
  return pkgs.reduce((acc, p) => acc + (p.remainingCredit || 0), 0) < RENEWAL_CREDIT_THRESHOLD;
};

// Data invoice renewal dengan paket yang SAMA dengan paket yang sedang dipakai client (nama, jumlah sesi, harga).
// null bila client belum punya paket. Harga: snapshot paket, fallback harga master.
export function buildSamePackageRenewal(record, masterPackages = []) {
  const pkg = activePackageOf(record);
  if (!pkg) return null;
  const master = masterPackages.find((m) => m.id === pkg.packageId) || null;
  const credits = Number(pkg.totalCredit) || master?.credits || 0;
  const amount = Number(pkg.price) > 0 ? Number(pkg.price) : Number(master?.price) || 0;
  return {
    packageId: pkg.packageId || master?.id || null,
    packageName: master ? `${master.name} (${credits}x)` : pkg.packageName,
    typeCode: packageInvoiceCode(master || { name: pkg.packageName }),
    credits,
    amount,
  };
}

// Sudah ada invoice paket yang belum lunas (menunggu pembayaran) → tidak perlu renewal lagi.
export const hasOpenPackageInvoice = (invoices = [], clientId) =>
  invoices.some((i) => i.clientId === clientId && invoiceType(i) === "package" && i.status !== "paid" && i.status !== "void");

// Invoice cuti yang tertaut ke sebuah log cuti (urut terbaru dulu). Dipakai tab Cuti & Detail cuti.
export const invoicesOfLeave = (invoices = [], leaveId) =>
  invoices.filter((i) => invoiceType(i) === "leave" && i.leaveId === leaveId && i.status !== "void").sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
