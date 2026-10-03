import { todayStr, uid } from "@/shared/lib/id";

// Domain kredit & paket terapi.
// Aturan di file ini pure (tanpa React/storage). Dipakai reducer creditsStore sekarang,
// dan menjadi acuan CreditService Laravel nanti (lihat docs/guide/05 & 10).

export const DEFAULT_MASTER_PACKAGES = [
  { id: "pkg-reguler", invoiceCode: "REG", name: "Regular Therapist", credits: 10, price: 2500000, description: "10 Sesi Terapi bersama Regular Therapist (OT / Sensori / Wicara)" },
  { id: "pkg-vip", invoiceCode: "SNR", name: "Senior Therapist", credits: 10, price: 3500000, description: "10 Sesi Terapi bersama Senior Therapist (1-on-1 Specialist)" },
  { id: "pkg-consult", invoiceCode: "KON", name: "Paket Konsultasi", credits: 1, price: 500000, description: "1 Sesi Konsultasi Klinis & Review" },
];

export const formatPackageName = (name) => {
  if (!name) return "Regular Therapist";
  return name
    .replace(/Paket Reguler/gi, "Regular Therapist")
    .replace(/Paket VIP/gi, "Senior Therapist")
    .replace(/\bReguler\b/gi, "Regular Therapist")
    .replace(/\bVIP\b/gi, "Senior Therapist");
};

// Kuota cancel PER PAKET (keputusan klien): hanya penghitung. Potong kredit atau tidak ditentukan admin di tiap cancel;
// setelah kuota lewat UI hanya memberi peringatan.
export const CANCEL_QUOTA = 3;

const historyEntry = (fields) => ({ id: uid(), date: todayStr(), scheduleId: null, ...fields });

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

// `price` = snapshot harga saat paket dibuat/diperpanjang (tidak ikut berubah bila harga master diedit).
export function newClientPackage({ packageId, packageName, credits, price = null }) {
  return {
    id: `cp-${uid().slice(-6)}`,
    packageId: packageId || "pkg-reguler",
    packageName: packageName || "Regular Therapist (10x)",
    price,
    totalCredit: credits,
    remainingCredit: credits,
    cancelCount: 0,
    status: "active",
  };
}

const REVERTIBLE_ACTIONS = ["used", "cancel_excused", "cancel_penalty"];

// Mutasi sesi ini yang belum dibalik (belum ada baris `reversal` yang menunjuk id-nya).
// Setelah revert lalu complete lagi, mutasi baru (id berbeda) menjadi mutasi aktif.
export function findLiveSessionEntry(record, scheduleId, actions = REVERTIBLE_ACTIONS) {
  const history = record?.history || [];
  const reversed = new Set(history.filter((h) => h.action === "reversal").map((h) => h.reversesId));
  return [...history].reverse().find((h) => h.scheduleId === scheduleId && actions.includes(h.action) && !reversed.has(h.id)) || null;
}

// Sesi therapy selesai: −1 kredit. Idempoten per scheduleId selama mutasi `used` belum dibalik.
export function applySessionCompleted(record, { packageId, scheduleId, date }) {
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
      historyEntry({
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

// Sesi dibatalkan. Kuota cancel dihitung PER PAKET (`cancelCount`, hanya penghitung). Admin yang menentukan apakah
// kredit dipotong (`deductCredit` true → ledger `cancel_penalty` −1) atau tidak (`cancel_excused`, kredit utuh).
// Tanpa paket / saldo 0, pemotongan tidak mungkin → dicatat `cancel_excused`.
export function applySessionCancelled(record, { packageId, scheduleId, cancelReason, date, deductCredit = false }) {
  const packages = record.packages || [];
  const idx = findPackageIndex(packages, packageId);
  const target = idx !== -1 ? packages[idx] : null;
  const reason = cancelReason || "lainnya";
  const cancelCount = (target?.cancelCount || 0) + 1;
  const deduct = Boolean(deductCredit) && Boolean(target) && target.remainingCredit > 0;

  const nextPackages = [...packages];
  if (target) nextPackages[idx] = deduct ? debitPackage(target, { cancelCount }) : { ...target, cancelCount };

  return {
    ...record,
    packages: nextPackages,
    history: [
      ...(record.history || []),
      historyEntry({
        date: date || todayStr(),
        scheduleId,
        packageId: target ? target.id : null,
        packageName: target ? target.packageName : "General",
        action: deduct ? "cancel_penalty" : "cancel_excused",
        creditChange: deduct ? -1 : 0,
        cancelReason: reason,
        cancelCountAfter: target ? cancelCount : null,
        note: deduct
          ? `Cancel ke-${cancelCount} pada paket — admin memilih potong 1 kredit ${target.packageName}`
          : `Cancel ke-${cancelCount} pada paket (${cancelReason || "Izin"}) — admin memilih tidak potong kredit`,
      }),
    ],
  };
}

// Batalkan efek kredit satu sesi (revert completed / cancel). Ledger append-only: baris lama tidak diubah,
// koreksi = baris `reversal` yang menunjuk id baris asal (`reversesId`); satu baris hanya bisa dibalik sekali.
//   used           → +1 kredit ke paket asal
//   cancel_penalty → +1 kredit, kuota cancel paket −1
//   cancel_excused → kuota cancel paket −1 (kredit tidak berubah)
export function applySessionReverted(record, { scheduleId, date, reason }) {
  const entry = findLiveSessionEntry(record, scheduleId);
  if (!entry) return record;

  const packages = record.packages || [];
  const idx = packages.findIndex((p) => p.id === entry.packageId);
  const refunds = entry.action !== "cancel_excused";
  const isCancel = entry.action !== "used";
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
    };
  }
  return {
    ...record,
    packages: nextPackages,
    history: [
      ...(record.history || []),
      historyEntry({
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

// Tambah paket kredit baru (pembelian / renewal) ke record client
export function applyPackageAdded(record, pkg, note) {
  return {
    ...record,
    packages: [...(record.packages || []), pkg],
    history: [
      ...(record.history || []),
      historyEntry({ packageId: pkg.id, packageName: pkg.packageName, action: "renewed", creditChange: pkg.totalCredit, note }),
    ],
  };
}

// ---- Invoice (keputusan klien): jenis Paket Sesi & Assessment ----
export const INVOICE_TYPES = [
  { value: "package", label: "Paket Sesi" },
  { value: "assessment", label: "Assessment" },
];
export const ASSESSMENT_INVOICE_CODE = "ASM"; // kode jenis invoice assessment (dicadangkan; tidak boleh dipakai paket)

// Invoice lama tanpa `type` = Paket Sesi.
export const invoiceType = (inv) => (inv?.type === "assessment" ? "assessment" : "package");
export const invoiceTypeLabel = (inv) => INVOICE_TYPES.find((t) => t.value === invoiceType(inv))?.label || "Paket Sesi";

const normalizeInvoiceCode = (v) =>
  String(v || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);

// Kode jenis invoice paket: `invoiceCode` master paket; paket lama tanpa kode memakai 3 huruf pertama nama.
export const packageInvoiceCode = (pkg) => {
  const code = normalizeInvoiceCode(pkg?.invoiceCode) || normalizeInvoiceCode(pkg?.name).slice(0, 3) || "PKT";
  return code === ASSESSMENT_INVOICE_CODE ? "PKT" : code;
};

export const invoiceTypeCode = (type, pkg) => (type === "assessment" ? ASSESSMENT_INVOICE_CODE : packageInvoiceCode(pkg));

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
  return packages.find((p) => p.remainingCredit > 0) || packages[packages.length - 1] || null;
};

// Ringkasan record untuk UI: total sisa & total kredit semua paket + kuota cancel paket yang sedang dipakai.
export function summarizeCreditRecord(record) {
  if (!record) return null;
  const packages = record.packages || [];
  const active = activePackageOf(record);
  const cancelCount = active?.cancelCount || 0;
  return {
    ...record,
    remainingCredit: packages.reduce((acc, p) => acc + (p.remainingCredit || 0), 0),
    totalCredit: packages.reduce((acc, p) => acc + (p.totalCredit || 0), 0),
    packages,
    cancelCount,
    cancelQuota: CANCEL_QUOTA,
    leaveUsed: cancelCount,
    leaveQuota: CANCEL_QUOTA,
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

// Invoice bisa dikonversi: paket lunas + paket hidup masih punya sisa sesi.
export const isInvoiceConvertible = (record, invoice) => {
  if (!invoice || invoice.status !== "paid") return false;
  const pkg = resolveInvoicePackage(record, invoice);
  return Boolean(pkg) && pkg.status === "active" && pkg.remainingCredit > 0;
};

// Terapkan konversi ke record client. Ledger append-only: `converted_out` (−sisa, paket lama jadi `converted`) dan
// `converted_in` (+sesi, paket baru) berbagi `conversionId`. Kuota cancel paket lama pindah ke paket baru.
// Saldo rupiah client (`balance`) bertambah sebesar lebihan.
export function applyPackageConversion(record, { sourcePackageId, target, sessions, price, leftover = 0, conversionId, note, date }) {
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
      historyEntry({ date: date || todayStr(), packageId: source.id, packageName: source.packageName, action: "converted_out", creditChange: -out, conversionId, note }),
      historyEntry({ date: date || todayStr(), packageId: newPkg.id, packageName: newPkg.packageName, action: "converted_in", creditChange: sessions, conversionId, note, cancelCountAfter: newPkg.cancelCount }),
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

// ---- Log invoice (milik invoice sendiri, append-only; bukan dari audit log) ----
export const INVOICE_LOG_ACTIONS = {
  issued: { label: "Invoice diterbitkan", tone: "info" },
  proof_uploaded: { label: "Bukti bayar diunggah", tone: "info" },
  verified: { label: "Pembayaran diverifikasi", tone: "success" },
  rejected: { label: "Pembayaran ditolak", tone: "danger" },
  renewal_paid: { label: "Renewal langsung (lunas)", tone: "success" },
  balance_applied: { label: "Saldo lebihan dipakai", tone: "warning" },
  balance_restored: { label: "Saldo lebihan dikembalikan", tone: "neutral" },
  converted: { label: "Paket dikonversi", tone: "warning" },
  deleted: { label: "Invoice dihapus", tone: "danger" },
};

export const invoiceLogMeta = (action) => INVOICE_LOG_ACTIONS[action] || { label: action, tone: "neutral" };

// Tambah satu baris log ke invoice (kembalikan invoice baru).
export const appendInvoiceLog = (invoice, { action, by = null, note = "", data = null, at }) => ({
  ...invoice,
  logs: [...(invoice.logs || []), { id: uid(), at: at || new Date().toISOString(), by, action, note, data }],
});

// Log untuk tampilan. Invoice lama tanpa `logs` dibuatkan baris dasar dari createdAt / paidAt.
export function invoiceLogsOf(invoice) {
  if (!invoice) return [];
  if (invoice.logs?.length) return invoice.logs;
  const base = [{ id: `${invoice.id}-issued`, at: invoice.createdAt, by: null, action: "issued", note: "", data: null }];
  if (invoice.paidAt) base.push({ id: `${invoice.id}-paid`, at: invoice.paidAt, by: null, action: "verified", note: "", data: null });
  return base;
}
