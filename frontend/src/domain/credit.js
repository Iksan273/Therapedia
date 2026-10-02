import { todayStr, uid } from "@/shared/lib/id";

// Domain kredit & paket terapi.
// Aturan di file ini pure (tanpa React/storage). Dipakai reducer creditsStore sekarang,
// dan menjadi acuan CreditService Laravel nanti (lihat docs/guide/05 & 10).

export const DEFAULT_MASTER_PACKAGES = [
  { id: "pkg-reguler", name: "Regular Therapist", credits: 10, price: 2500000, description: "10 Sesi Terapi bersama Regular Therapist (OT / Sensori / Wicara)" },
  { id: "pkg-vip", name: "Senior Therapist", credits: 10, price: 3500000, description: "10 Sesi Terapi bersama Senior Therapist (1-on-1 Specialist)" },
  { id: "pkg-consult", name: "Paket Konsultasi", credits: 1, price: 500000, description: "1 Sesi Konsultasi Klinis & Review" },
];

export const formatPackageName = (name) => {
  if (!name) return "Regular Therapist";
  return name
    .replace(/Paket Reguler/gi, "Regular Therapist")
    .replace(/Paket VIP/gi, "Senior Therapist")
    .replace(/\bReguler\b/gi, "Regular Therapist")
    .replace(/\bVIP\b/gi, "Senior Therapist");
};

// Jumlah cancel wajar per client (sepanjang masa). Cancel berikutnya memotong 1 kredit.
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
  return { id: id || `cr-${uid().slice(-6)}`, clientId, branchId, packages: [], cancelCountTotal: 0, history: [] };
}

export function newClientPackage({ packageId, packageName, credits }) {
  return {
    id: `cp-${uid().slice(-6)}`,
    packageId: packageId || "pkg-reguler",
    packageName: packageName || "Regular Therapist (10x)",
    totalCredit: credits,
    remainingCredit: credits,
    cancelCount: 0,
    status: "active",
  };
}

// Sesi therapy selesai: −1 kredit. Idempoten per scheduleId (tidak memotong dua kali).
export function applySessionCompleted(record, { packageId, scheduleId, date }) {
  const packages = record.packages || [];
  if (packages.length === 0) return record;
  const idx = findPackageIndex(packages, packageId);
  if (idx === -1) return record;
  if ((record.history || []).some((h) => h.scheduleId === scheduleId && h.action === "used")) return record;

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

// Sesi dibatalkan: cancel ke-1..CANCEL_QUOTA kredit utuh; selebihnya penalti −1 kredit.
export function applySessionCancelled(record, { packageId, scheduleId, cancelReason, date }) {
  const cancelCount = (record.cancelCountTotal || 0) + 1;
  const packages = record.packages || [];
  const idx = findPackageIndex(packages, packageId);
  const target = idx !== -1 ? packages[idx] : null;
  const reason = cancelReason || "lainnya";

  if (cancelCount <= CANCEL_QUOTA || !target) {
    return {
      ...record,
      cancelCountTotal: cancelCount,
      history: [
        ...(record.history || []),
        historyEntry({
          date: date || todayStr(),
          scheduleId,
          packageId: target ? target.id : null,
          packageName: target ? target.packageName : "General",
          action: "cancel_excused",
          creditChange: 0,
          cancelReason: reason,
          note: `Cancel ke-${cancelCount} (${cancelReason || "Izin"}) — Kuota wajar (Kredit utuh)`,
        }),
      ],
    };
  }

  const nextPackages = [...packages];
  nextPackages[idx] = debitPackage(target, { cancelCount: (target.cancelCount || 0) + 1 });
  return {
    ...record,
    cancelCountTotal: cancelCount,
    packages: nextPackages,
    history: [
      ...(record.history || []),
      historyEntry({
        date: date || todayStr(),
        scheduleId,
        packageId: target.id,
        packageName: target.packageName,
        action: "cancel_penalty",
        creditChange: -1,
        cancelReason: reason,
        note: `Cancel ke-${cancelCount} (>${CANCEL_QUOTA}x) — Penalti memotong 1 kredit ${target.packageName}`,
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

// Nomor invoice unik: INV-<tahun>-<urut>, urut = max(nomor terbesar tahun itu, jumlah invoice) + 1
export function nextInvoiceNumber(invoices = [], now = new Date()) {
  const year = now.getFullYear();
  const re = new RegExp(`^INV-${year}-(\\d+)$`);
  const maxSeq = invoices.reduce((max, inv) => {
    const m = re.exec(inv.invoiceNumber || "");
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
  return `INV-${year}-${String(Math.max(maxSeq, invoices.length) + 1).padStart(3, "0")}`;
}

// Ringkasan record untuk UI: total sisa & total kredit semua paket
export function summarizeCreditRecord(record) {
  if (!record) return null;
  const packages = record.packages || [];
  return {
    ...record,
    remainingCredit: packages.reduce((acc, p) => acc + (p.remainingCredit || 0), 0),
    totalCredit: packages.reduce((acc, p) => acc + (p.totalCredit || 0), 0),
    packages,
    cancelCountTotal: record.cancelCountTotal || 0,
    leaveUsed: record.cancelCountTotal || 0,
    leaveQuota: CANCEL_QUOTA,
  };
}
