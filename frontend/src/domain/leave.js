import { addDays, format, parseISO } from "date-fns";
import { checkConflicts } from "@/domain/schedule";
import { nowIso, uid } from "@/shared/lib/id";

// Domain cuti client. Aturan di sini adalah acuan untuk Service Laravel (lihat docs/guide/05, 06 & 10).
//
// Cuti HANYA dicatat Finance (revisi 7 Okt 2026): log cuti mengubah sesi terapi terjadwal di rentang tanggalnya menjadi
// `cancelled` (Cancel / Off adalah satu mekanisme; alasan OL, `leaveId` = log cuti). Tidak ada lagi Off manual yang menghitung
// cuti, dan tidak ada invoice cuti. Jatah: saldo di record kredit client (`leaveGranted`, diisi per paket master
// `leaveQuota`). Hari yang dihitung untuk log = hari kalender dari SESI TERAPI PERTAMA sampai TERAKHIR di rentang
// (`countedStart`–`countedEnd`), mis. rentang 07–14 Okt dengan sesi 08 & 12 Okt = 5 hari. Finance hanya bisa mencatat
// cuti bila client punya sesi terapi di rentang itu. Paket satuan: maks 1x cuti per bulan kalender.

export const LEAVE_QUOTA_DAYS = 30; // jatah bawaan bila client belum punya jatah dari paket (data lama)
export const LEAVE_OFF_REASON = "OL"; // kode alasan bawaan "On Leave (Cuti)" (DEFAULT_CANCEL_REASONS)

export const LEAVE_STATUS = { active: "active", voided: "voided" };

// Factory log cuti (default aman). `returnDate` = tanggal anak masuk kembali bila lebih awal dari `endDate`.
export const makeLeave = ({ clientId, branchId, startDate, endDate, countedStart = null, countedEnd = null, sessionIds = [], reason = "", note = "", by = null }) => ({
  id: uid(),
  clientId,
  branchId: branchId || null,
  startDate,
  endDate,
  countedStart: countedStart || startDate, // hari pertama sesi terapi di rentang (awal hitungan jatah)
  countedEnd: countedEnd || endDate, // hari terakhir sesi terapi di rentang (akhir hitungan jatah)
  sessionIds, // sesi terapi yang dibatalkan oleh cuti ini (untuk tampilan Detail; status sesi dibaca dari jadwal)
  returnDate: null,
  returnNote: null,
  returnedAt: null, // kapan & siapa mengakhiri lebih awal (jejak untuk Detail)
  returnedBy: null,
  status: LEAVE_STATUS.active,
  reason: reason.trim(),
  note: note.trim(),
  createdBy: by,
  createdAt: nowIso(),
  updatedBy: by,
  updatedAt: nowIso(),
  voidedAt: null,
  voidedBy: null,
  voidReason: null,
});

const DATE_FMT = "yyyy-MM-dd";
const yearOf = (date) => Number(String(date).slice(0, 4));
const dayBefore = (date) => format(addDays(parseISO(date), -1), DATE_FMT);

// Sesi terapi yang ikut dibatalkan (cancelled, alasan OL) saat cuti dicatat (asesmen tidak disentuh otomatis)
const LEAVABLE_STATUSES = ["scheduled", "rescheduled"];

// Hari terakhir cuti yang masih berlaku: sebelum tanggal masuk kembali (`returnDate`) bila anak masuk lebih awal,
// selain itu `endDate`. Cuti yang di-void tidak punya hari berlaku (null).
export const leaveEffectiveEnd = (leave) => {
  if (!leave || leave.status === LEAVE_STATUS.voided) return null;
  if (leave.returnDate && leave.returnDate <= leave.endDate) return dayBefore(leave.returnDate);
  return leave.endDate;
};

// Fase log cuti untuk label/badge (diturunkan, tidak disimpan): voided | early (masuk lebih awal) | upcoming | ongoing | done
export function leavePhase(leave, today) {
  if (leave.status === LEAVE_STATUS.voided) return "voided";
  if (leave.returnDate && leave.returnDate <= leave.endDate) return "early";
  if (leave.startDate > today) return "upcoming";
  if (leave.endDate < today) return "done";
  return "ongoing";
}

export const LEAVE_PHASE_META = {
  upcoming: { label: "Akan Datang", className: "bg-sky-50 text-sky-700 border-sky-200" },
  ongoing: { label: "Berlangsung", className: "bg-violet-50 text-violet-700 border-violet-200" },
  done: { label: "Selesai", className: "bg-slate-100 text-slate-700 border-slate-200" },
  early: { label: "Masuk Lebih Awal", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  voided: { label: "Void", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

// Daftar tanggal ("yyyy-MM-dd") rentang [start, end] inklusif
export function dateRange(start, end) {
  if (!start || !end || start > end) return [];
  const out = [];
  let cur = parseISO(start);
  const last = parseISO(end);
  while (cur <= last) {
    out.push(format(cur, DATE_FMT));
    cur = addDays(cur, 1);
  }
  return out;
}

// Tanggal yang masih berlaku untuk satu log cuti (kosong bila void / masuk kembali tepat di hari mulai)
export const leaveDates = (leave) => dateRange(leave?.startDate, leaveEffectiveEnd(leave));

export const leaveDays = (leave) => leaveDates(leave).length;

// Tanggal unik sesi cancelled yang tertaut sebuah log pada tahun tertentu
export const leaveSessionDates = (leave, schedules = [], year) =>
  new Set(schedules.filter((s) => s.leaveId === leave.id && s.status === "cancelled" && (year == null || yearOf(s.date) === year)).map((s) => s.date));

// Sesi cancelled yang berasal dari log cuti Finance (untuk badge "Cuti" di kalender)
export const isLeaveOff = (s) => Boolean(s) && s.status === "cancelled" && Boolean(s.leaveId);

// Log cuti aktif client yang mencakup tanggal tertentu (hari efektif), atau null. Dipakai saat admin menambah jadwal di
// tanggal cuti: peringatan + pilihan Off (cuti) / tetap aktif.
export const activeLeaveOn = (leaves = [], clientId, date) =>
  leaves.find((l) => l.clientId === clientId && l.startDate <= date && date <= (leaveEffectiveEnd(l) || "")) || null;

// Semua tanggal cuti aktif client (Set yyyy-MM-dd): jadwal berulang MELEWATI tanggal ini seperti hari libur
export const clientLeaveDateSet = (leaves = [], clientId) => {
  const set = new Set();
  leaves.filter((l) => l.clientId === clientId).forEach((l) => leaveDates(l).forEach((d) => set.add(d)));
  return set;
};

// Tanggal yang dihitung sebagai pemakaian jatah oleh sebuah log: hari kalender dari sesi pertama sampai terakhir (dipotong
// tanggal masuk kembali bila anak masuk lebih awal). Log lama tanpa countedStart/End memakai rentang log.
export const leaveCountedDates = (leave) => {
  if (!leave || leave.status === LEAVE_STATUS.voided) return [];
  const eff = leaveEffectiveEnd(leave);
  const end = leave.countedEnd || leave.endDate;
  return dateRange(leave.countedStart || leave.startDate, eff && eff < end ? eff : end);
};

export const leaveCountedDays = (leave) => leaveCountedDates(leave).length;

// Himpunan tanggal unik yang memakai jatah client: hari hitung log cuti aktif. `since` = tanggal
// reset jatah (pemakaian sebelumnya tidak dihitung lagi).
export function usedLeaveDates({ schedules = [], leaves = [], clientId, since = null }) {
  const dates = new Set();
  leaves.filter((l) => l.clientId === clientId).forEach((l) => leaveCountedDates(l).forEach((d) => dates.add(d)));
  return since ? new Set([...dates].filter((d) => d >= since)) : dates;
}

export const usedLeaveDays = (args) => usedLeaveDates(args).size;

// Kebijakan jatah client dari record kredit: `granted` (null = belum ada jatah dari paket → bawaan 30) dan `since` (reset).
export const leavePolicyOf = (record, globalSince = null) => ({
  granted: record?.leaveGranted != null ? Number(record.leaveGranted) : LEAVE_QUOTA_DAYS,
  since: [record?.leaveResetAt, globalSince].filter(Boolean).sort().pop() || null, // reset terbaru: per client atau reset tahunan semua client
});

export const remainingLeaveDays = (args) => Math.max(0, (args.granted ?? LEAVE_QUOTA_DAYS) - usedLeaveDays(args));

// Ringkasan jatah client (kartu client & pratinjau). `over` = hari melewati jatah (peringatan, bukan blokir).
export function leaveQuotaSummary({ schedules, leaves, clientId, granted = LEAVE_QUOTA_DAYS, since = null }) {
  const used = usedLeaveDays({ schedules, leaves, clientId, since });
  return { quota: granted, used, remaining: Math.max(0, granted - used), over: Math.max(0, used - granted) };
}

// Paket satuan: maks 1x cuti per bulan kalender. True bila client sudah punya hari cuti (log aktif) di salah satu
// bulan dari `dates`. `ignoreLeaveId` melewati log tertentu.
export function satuanLeaveBlocked({ leaves = [], schedules = [], clientId, dates = [], ignoreLeaveId = null }) {
  const months = new Set(dates.map((d) => String(d).slice(0, 7)));
  const used = usedLeaveDates({ schedules, leaves: leaves.filter((l) => l.id !== ignoreLeaveId), clientId });
  return [...used].some((d) => months.has(d.slice(0, 7)));
}

// Pratinjau & validasi pencatatan cuti baru (dipakai dialog dan `createLeave`).
// Wajib ada sesi terapi terjadwal di rentang; hari hitung = sesi pertama s.d. terakhir. Melewati jatah hanya peringatan.
export function planLeave({ leaves = [], schedules = [], clientId, startDate, endDate, granted = LEAVE_QUOTA_DAYS, since = null, isSatuan = false }) {
  const errors = [];
  if (!clientId) errors.push("Pilih client.");
  if (!startDate || !endDate) errors.push("Tanggal mulai dan selesai wajib diisi.");
  else if (startDate > endDate) errors.push("Tanggal selesai tidak boleh sebelum tanggal mulai.");

  const dates = errors.length ? [] : dateRange(startDate, endDate);
  const dateSet = new Set(dates);

  const overlapping = errors.length
    ? []
    : leaves.filter((l) => l.clientId === clientId && leaveDates(l).some((d) => dateSet.has(d)));
  if (overlapping.length > 0) errors.push("Rentang bertumpuk dengan cuti aktif client ini.");

  const sessions = errors.length
    ? []
    : schedules
        .filter((s) => s.clientId === clientId && s.type === "therapy" && LEAVABLE_STATUSES.includes(s.status) && dateSet.has(s.date))
        .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  if (!errors.length && sessions.length === 0) errors.push("Client belum punya jadwal sesi terapi di rentang ini, jadi cuti tidak bisa dicatat.");

  const countedStart = sessions.length ? sessions[0].date : null;
  const countedEnd = sessions.length ? sessions[sessions.length - 1].date : null;
  const countedDates = dateRange(countedStart, countedEnd);

  if (!errors.length && isSatuan && satuanLeaveBlocked({ leaves, schedules, clientId, dates: countedDates })) {
    errors.push("Paket satuan hanya boleh 1x cuti dalam 1 bulan; client ini sudah punya cuti di bulan tersebut.");
  }

  // Jatah: hari hitung yang belum terpakai log/Off manual lain tidak dihitung dua kali.
  const used = usedLeaveDates({ schedules, leaves, clientId, since });
  const adding = countedDates.filter((d) => !used.has(d) && (!since || d >= since)).length;
  const after = used.size + adding;
  const balance = { quota: granted, used: used.size, adding, after, remaining: Math.max(0, granted - after), over: Math.max(0, after - granted) };

  const warnings = balance.over > 0
    ? [`Jatah cuti terlewati ${balance.over} hari (${after}/${granted}). Tetap bisa disimpan; tentukan potong kredit sesuai kebijakan.`]
    : [];

  return { ok: errors.length === 0, errors, warnings, days: countedDates.length, countedStart, countedEnd, balance, sessions };
}

// Validasi tanggal masuk kembali (anak masuk lebih cepat). `returnDate` <= `startDate` berarti void penuh.
export function planEarlyReturn({ leave, returnDate, schedules = [], therapists = [] }) {
  const errors = [];
  if (!leave || leave.status === LEAVE_STATUS.voided) errors.push("Cuti sudah di-void.");
  else if (!returnDate) errors.push("Tanggal masuk kembali wajib diisi.");
  else if (returnDate > leaveEffectiveEnd(leave)) errors.push("Tanggal masuk kembali melewati akhir cuti; tidak ada hari yang dikembalikan.");

  const isVoid = errors.length === 0 && returnDate <= leave.startDate;
  const effectiveReturn = isVoid ? leave?.startDate : returnDate;

  // Sesi Off cuti pada/sesudah tanggal masuk kembali dikembalikan ke jadwal aktif; slot yang sudah terisi dilewati.
  const working = schedules.map((s) => ({ ...s }));
  const restorable = [];
  const conflicted = [];
  if (errors.length === 0) {
    schedules
      .filter((s) => s.leaveId === leave.id && s.status === "cancelled" && s.date >= effectiveReturn)
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
      .forEach((s) => {
        const clash = checkConflicts({ therapistId: s.therapistId, date: s.date, startTime: s.startTime, endTime: s.endTime, schedules: working, therapists, excludeId: s.id });
        const idx = working.findIndex((w) => w.id === s.id);
        if (clash.length > 0) {
          conflicted.push(s);
          working[idx] = { ...working[idx], leaveId: null }; // dilepas dari log: tidak lagi dihitung
          return;
        }
        working[idx] = { ...working[idx], status: "scheduled", leaveId: null };
        restorable.push(s);
      });
  }

  // Hari jatah yang kembali = selisih hari hitung sebelum dan sesudah tanggal masuk kembali
  const daysReturned = errors.length ? 0 : Math.max(0, leaveCountedDays(leave) - leaveCountedDays({ ...leave, returnDate: effectiveReturn }));
  return { ok: errors.length === 0, errors, isVoid, returnDate: effectiveReturn, daysReturned, restorable, conflicted };
}

// ---- Reset tahunan jatah cuti (awal tahun): semua client kembali ke `LEAVE_QUOTA_DAYS` (30 hari); sisa yang tidak diambil HANGUS ----
// Pratinjau untuk dialog konfirmasi: jumlah client dan total hari tersisa yang akan hangus. `records` = record kredit (saldo per client;
// client tanpa record memakai jatah bawaan), `globalSince` = tanggal reset tahunan terakhir.
export function planAnnualLeaveReset({ clients = [], records = [], leaves = [], globalSince = null }) {
  const byClient = new Map(records.map((r) => [r.clientId, r]));
  let forfeitedDays = 0;
  let withRemaining = 0;
  clients.forEach((c) => {
    const { granted, since } = leavePolicyOf(byClient.get(c.id), globalSince);
    const used = usedLeaveDays({ leaves, clientId: c.id, since });
    const remaining = Math.max(0, granted - used);
    if (remaining > 0) withRemaining += 1;
    forfeitedDays += remaining;
  });
  return { clients: clients.length, withRemaining, forfeitedDays, quota: LEAVE_QUOTA_DAYS };
}

// Label ringkas satu log cuti untuk pilihan "hubungkan invoice" (mis. "08/10/2026 – 14/10/2026 • 5 hari • Aktif").
export const leaveOptionLabel = (leave, fmt = (d) => d) => {
  const phase = leave.status === LEAVE_STATUS.voided ? "Void" : leave.returnDate ? "Selesai lebih awal" : "Aktif";
  return `${fmt(leave.startDate)} – ${fmt(leave.endDate)} • ${leaveCountedDays(leave)} hari • ${phase}`;
};

// Log cuti client yang boleh disambungkan ke invoice: semua yang belum di-void (aktif atau selesai lebih awal), terbaru dulu.
export const linkableLeaves = (leaves = [], clientId) =>
  leaves.filter((l) => l.clientId === clientId && l.status !== LEAVE_STATUS.voided).sort((a, b) => b.startDate.localeCompare(a.startDate));
