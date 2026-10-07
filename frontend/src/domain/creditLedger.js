import { bookingNoteOf, cancelNoteOf, cancelReasonCode } from "@/domain/schedule";
import { activePackageOf, packageBaseName, unitValueOf } from "@/domain/credit";

// Buku besar kredit + uang per client (modul Finance "Log Kredit & Saldo"). Murni TURUNAN dari `record.history`
// (ledger kredit) dan sesi: tidak ada data baru yang disimpan. Tiap perubahan kredit dinilai dengan harga per sesi
// paketnya (harga bayar paket ÷ total sesi), jadi sesi completed mengurangi saldo rupiah sebesar harga per sesi.

// Pelaku bawaan bila baris lama tidak mencatat `by`: Finance untuk mutasi paket/uang, Admin Schedule untuk mutasi sesi.
const FINANCE_ACTIONS = ["renewed", "converted_in", "converted_out", "manual_adjust", "refund"];
export const actorOf = (by, action) => by || (FINANCE_ACTIONS.includes(action) ? "Finance" : "Admin Schedule");

// Aksi yang berasal dari pembatalan sesi (Cancel / Off): alasan (CODE) ikut tampil di log
const CANCEL_ACTIONS = ["cancel_penalty", "cancel_leave", "cancel_excused", "off_penalty", "off_excused"];

const UPCOMING = ["scheduled", "rescheduled", "reschedule_pending"];

const ACTION_DETAIL = {
  renewed: "Top up paket",
  used: "Sesi terpakai",
  cancel_penalty: "Cancel / Off (potong kredit)",
  cancel_leave: "Cancel / Off (pakai credit leave)",
  cancel_excused: "Cancel / Off (kredit utuh)",
  off_penalty: "Cancel / Off cuti (potong kredit)",
  off_excused: "Cancel / Off cuti (kredit utuh)",
  reversal: "Koreksi / revert",
  manual_adjust: "Koreksi / pencabutan kredit",
  converted_out: "Konversi keluar",
  converted_in: "Konversi masuk",
  refund: "Refund (sisa kredit dikembalikan)",
};

// Harga per sesi sebuah paket client. Paket tanpa snapshot harga memakai harga master (bila ada), selain itu null.
export const packageUnitValue = (pkg, masterPackages = []) => {
  if (!pkg) return null;
  const price = Number(pkg.price) > 0 ? pkg.price : masterPackages.find((m) => m.id === pkg.packageId)?.price;
  return unitValueOf(price, pkg.totalCredit);
};

const packagePrice = (pkg, masterPackages) => {
  const unit = packageUnitValue(pkg, masterPackages);
  return unit == null ? null : Math.round(unit * pkg.totalCredit);
};

// Nilai rupiah sebuah baris ledger (+ menambah saldo, − mengurangi). null = harga paket tidak diketahui.
function valueOfEntry(entry, ctx) {
  const pkg = ctx.packages.find((p) => p.id === entry.packageId);
  const unit = packageUnitValue(pkg, ctx.masterPackages);
  switch (entry.action) {
    case "renewed":
    case "converted_in":
      return packagePrice(pkg, ctx.masterPackages);
    case "used":
    case "cancel_penalty":
    case "off_penalty":
      return unit == null ? null : -Math.round(unit);
    case "cancel_excused":
    case "off_excused":
      return 0;
    case "reversal": {
      const reversed = ctx.byId.get(entry.reversesId);
      const v = reversed ? ctx.valueOf(reversed) : null;
      return v == null ? null : -v;
    }
    case "manual_adjust":
    case "converted_out":
      return unit == null ? null : Math.round(unit * (entry.creditChange || 0));
    default:
      return entry.creditChange && unit != null ? Math.round(unit * entry.creditChange) : 0;
  }
}

// Baris laporan per client, urut sesuai ledger. `schedules` = sesi milik client itu. `saldo` = saldo rupiah berjalan
// (null bila ada baris yang nilainya tidak diketahui sejak titik itu).
export function buildClientMoneyLedger(record, schedules = [], { masterPackages = [], getTherapistName = () => "" } = {}) {
  const history = record?.history || [];
  const packages = record?.packages || [];
  const byId = new Map(history.map((h) => [h.id, h]));
  const scheduleById = new Map(schedules.map((s) => [s.id, s]));
  const cache = new Map();
  const ctx = { packages, masterPackages, byId, valueOf: null };
  ctx.valueOf = (entry) => {
    if (!cache.has(entry.id)) cache.set(entry.id, valueOfEntry(entry, ctx));
    return cache.get(entry.id);
  };

  let balance = 0;
  let firstTopUpSeen = false;
  const rows = history.map((h) => {
    const amount = ctx.valueOf(h);
    balance = balance == null || amount == null ? null : balance + amount;
    const s = h.scheduleId ? scheduleById.get(h.scheduleId) : null;
    const pkg = packages.find((p) => p.id === h.packageId);

    let note = "";
    if (h.action === "renewed") {
      note = firstTopUpSeen ? "Renewal" : "Saldo awal";
      firstTopUpSeen = true;
    } else if (h.action === "converted_in" || h.action === "converted_out") note = "Konversi paket";
    else if (h.action === "reversal") note = h.note || ""; // alasan revert (jejak koreksi dari jadwal)
    else if (CANCEL_ACTIONS.includes(h.action)) note = (s?.status === "cancelled" && cancelNoteOf(s)) || bookingNoteOf(s) || "";
    else if (s) note = bookingNoteOf(s) || "";
    else note = h.note || "";

    return {
      id: h.id,
      scheduleId: s?.id || null,
      historyNote: s?.historyNote || "", // catatan sesi (sama dengan Catatan di detail client)
      by: actorOf(h.by, h.action),
      date: s?.date || h.date,
      time: s ? `${s.startTime}–${s.endTime}` : "",
      therapistName: s ? getTherapistName(s.therapistId) : "",
      packageName: packageBaseName(pkg?.packageName || h.packageName),
      status: s?.status || null,
      note,
      detail: ACTION_DETAIL[h.action] || h.action,
      // CODE alasan cancel/off (dari ledger; bila kosong, dari sesi yang masih cancelled)
      reasonCode: CANCEL_ACTIONS.includes(h.action) ? cancelReasonCode(h.cancelReason || (s?.status === "cancelled" ? s.cancelReason : null)) : "",
      leaveChange: h.leaveChange || 0, // credit leave paket yang terpakai (−1) pada baris ini
      creditChange: h.creditChange || 0,
      amount,
      balance,
    };
  });

  // Sesi terapi yang sudah dijadwalkan tetapi belum memotong kredit tampil di akhir (nilai 0, saldo tetap), urut tanggal
  const ledgered = new Set(history.map((h) => h.scheduleId).filter(Boolean));
  const upcoming = schedules
    .filter((s) => s.type === "therapy" && UPCOMING.includes(s.status) && !ledgered.has(s.id))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
    .map((s) => {
      const pkg = packages.find((p) => p.id === s.creditPackageId);
      return {
        id: `sch-${s.id}`,
        scheduleId: s.id,
        historyNote: s.historyNote || "",
        by: actorOf(s.createdBy, "scheduled"),
        date: s.date,
        time: `${s.startTime}–${s.endTime}`,
        therapistName: getTherapistName(s.therapistId),
        packageName: packageBaseName(pkg?.packageName || ""),
        status: s.status,
        note: bookingNoteOf(s) || "",
        detail: "Terjadwal (belum memotong kredit)",
        reasonCode: "",
        leaveChange: 0,
        creditChange: 0,
        amount: 0,
        balance,
      };
    });
  return [...rows, ...upcoming];
}

// Laporan per PAKET: satu entri = satu paket milik satu client, dengan ledger & saldo rupiahnya sendiri. Paket tanpa
// mutasi kredit dilewati. Sesi terjadwal yang belum terhubung ke paket mana pun ikut paket yang sedang aktif.
export function buildPackageMoneyLedgers(record, schedules = [], opts = {}) {
  const packages = record?.packages || [];
  const history = record?.history || [];
  const fallbackId = activePackageOf(record)?.id || packages[packages.length - 1]?.id;
  return packages
    .map((pkg) => {
      // Mutasi tanpa paket (mis. cancel saat client belum punya paket) ikut paket fallback agar tidak hilang dari log
      const pkgHistory = history.filter((h) => h.packageId === pkg.id || (!h.packageId && pkg.id === fallbackId));
      if (pkgHistory.length === 0) return null; // paket tanpa mutasi kredit tidak punya log
      const ledgered = new Set(pkgHistory.map((h) => h.scheduleId).filter(Boolean));
      const pkgSchedules = schedules.filter(
        (s) => ledgered.has(s.id) || s.creditPackageId === pkg.id || (pkg.id === fallbackId && !packages.some((p) => p.id === s.creditPackageId))
      );
      const ledger = buildClientMoneyLedger({ ...record, packages: [pkg], history: pkgHistory }, pkgSchedules, opts);
      return { pkg, ledger, balance: ledger.length ? ledger[ledger.length - 1].balance : 0 };
    })
    .filter(Boolean);
}

// Ringkasan satu client: saldo rupiah saat ini (baris terakhir) dan sisa sesi.
export const summarizeMoneyLedger = (rows) => ({
  balance: rows.length ? rows[rows.length - 1].balance : 0,
  entries: rows.length,
});
