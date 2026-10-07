import { addDays, addWeeks, format, parseISO, startOfWeek } from "date-fns";
import { uid } from "@/shared/lib/id";
import { findHoliday, holidayMessage } from "@/domain/holiday";

// Domain penjadwalan: jam kalender, alasan cancel, deteksi bentrok, dan generator jadwal berulang.
// Aturan di sini adalah acuan untuk Service Laravel (lihat docs/guide/05 & 10).

// Cancel dan Off adalah SATU mekanisme (revisi 7 Okt 2026): satu daftar alasan, satu aksi "Cancel / Off". Setiap alasan punya
// CODE singkat (`value`, mis. S, OL, SCA) yang menjadi STRING tersimpan di sesi/ledger dan yang TAMPIL di riwayat & detail
// semua modul (label panjang hanya untuk pilihan di form). Teks bebas yang diketik user ("Lainnya") tetap boleh disimpan apa adanya.
export const DEFAULT_CANCEL_REASONS = [
  { value: "OL", label: "On Leave (Cuti)" },
  { value: "S", label: "Sick (Sakit / Kondisi Medis)" },
  { value: "SCA", label: "School Activities (Kegiatan Sekolah)" },
  { value: "MCU", label: "Medical Check Up" },
  { value: "FM", label: "Family Matter (Keperluan Keluarga)" },
  { value: "TI", label: "Transport Issue" },
  { value: "H", label: "Holiday (Libur)" },
  { value: "NS", label: "No Show (Tanpa Kabar)" },
];

// Alasan sistem (tidak muncul di dropdown pembatalan biasa)
export const RESCHEDULE_DROPPED = "RD";
export const OTHER_REASON = "LN"; // alasan tidak diketahui / "Lainnya" (default aksi massal & data lama tanpa alasan)

export const SYSTEM_CANCEL_REASONS = [
  { value: RESCHEDULE_DROPPED, label: "Reschedule tidak dilanjutkan" },
  { value: OTHER_REASON, label: "Alasan Lainnya" },
];

// Nilai lama (sebelum alasan memakai CODE) dipetakan ke code baru agar data lama tetap terbaca.
const LEGACY_CANCEL_CODES = {
  sakit: "S",
  izin_keluarga: "FM",
  bentrok_sekolah: "SCA",
  tanpa_kabar: "NS",
  lainnya: OTHER_REASON,
  reschedule_dibatalkan: RESCHEDULE_DROPPED,
};
export const normalizeCancelReason = (val) => (val && LEGACY_CANCEL_CODES[val]) || val || "";

// CODE yang ditampilkan di riwayat/detail. Teks custom ditampilkan apa adanya; kosong → "—".
export const cancelReasonCode = (val) => normalizeCancelReason(val) || "—";

// Label panjang (untuk pilihan di form, tooltip, dan grafik). `list` = daftar pilihan cepat dari Master Data.
// Tidak ditemukan → string apa adanya (teks custom).
export const cancelReasonLabel = (val, list = DEFAULT_CANCEL_REASONS) => {
  const code = normalizeCancelReason(val);
  const found = list.find((r) => r.value === code) || SYSTEM_CANCEL_REASONS.find((r) => r.value === code);
  return found ? found.label : code || "—";
};

// Sesi yang dibatalkan dari status "reschedule menggantung" (alasan sistem). Potong kredit atau tidak tetap pilihan admin
// seperti cancel biasa; penanda ini hanya dipakai statistik kehadiran (bukan kesalahan client).
export const isCreditNeutralCancel = (s) => Boolean(s) && s.status === "cancelled" && normalizeCancelReason(s.cancelReason) === RESCHEDULE_DROPPED;

// Slot waktu sebuah sesi (dipakai untuk jejak jadwal asal reschedule)
export const scheduleSlot = (s) => ({ date: s.date, startTime: s.startTime, endTime: s.endTime, therapistId: s.therapistId });

const sameSlot = (a, b) =>
  Boolean(a) && Boolean(b) && a.date === b.date && a.startTime === b.startTime && a.endTime === b.endTime && a.therapistId === b.therapistId;

// Slot TEPAT SEBELUM reschedule terakhir (`rescheduledPrev`); data lama hanya punya jadwal asal pertama (`rescheduledFrom`).
export const getPrevSlot = (s) => s?.rescheduledPrev || s?.rescheduledFrom || null;

// Revert HANYA 1x (keputusan klien): satu langkah mundur per aksi. Setelah revert, `revertedAt` terisi dan revert berikutnya
// diblokir sampai ada transisi baru pada sesi itu (complete / cancel / reschedule / pending mengosongkan `revertedAt`).
//   completed / cancelled → status sebelumnya; rescheduled → jadwal asal (1x reschedule) atau jadwal tersimpan terakhir
//   (sudah 2x reschedule); reschedule_pending → status sebelumnya (jadwal asal, slot tidak berubah).
export const canRevertSession = (s) =>
  Boolean(s) &&
  !s.revertedAt &&
  (s.status === "completed" ||
    s.status === "cancelled" ||
    s.status === "reschedule_pending" ||
    (s.status === "rescheduled" && Boolean(getPrevSlot(s))));

// Status tujuan revert. Reschedule: `scheduled` bila kembali ke jadwal asal pertama, `rescheduled` bila kembali ke slot
// perantara (sudah 2x reschedule). Pending: status sebelumnya (default `scheduled`). Lainnya: `previousStatus`; data lama
// (seed) ditebak dari jejak reschedule.
export const restoreStatusOf = (s) => {
  if (s.status === "rescheduled") return sameSlot(getPrevSlot(s), s.rescheduledFrom) ? "scheduled" : "rescheduled";
  if (s.status === "reschedule_pending") return s.previousStatus && s.previousStatus !== s.status ? s.previousStatus : "scheduled";
  if (s.previousStatus && s.previousStatus !== s.status) return s.previousStatus;
  return s.rescheduledFrom ? "rescheduled" : "scheduled";
};

// Slot tujuan revert: reschedule → slot sebelum reschedule terakhir; lainnya slot sesi saat ini.
export const restoreSlotOf = (s) => (s.status === "rescheduled" && getPrevSlot(s) ? getPrevSlot(s) : scheduleSlot(s));

export const CALENDAR_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const WEEKDAY_OPTIONS = [
  { id: "Monday", label: "Senin (Monday)", short: "Mon" },
  { id: "Tuesday", label: "Selasa (Tuesday)", short: "Tue" },
  { id: "Wednesday", label: "Rabu (Wednesday)", short: "Wed" },
  { id: "Thursday", label: "Kamis (Thursday)", short: "Thu" },
  { id: "Friday", label: "Jumat (Friday)", short: "Fri" },
  { id: "Saturday", label: "Sabtu (Saturday)", short: "Sat" },
];

export const CALENDAR_HOURS = Array.from({ length: 10 }, (_, i) => `${String(8 + i).padStart(2, "0")}:00`);

export const TIME_OPTIONS = Array.from({ length: 21 }, (_, i) => {
  const minutes = 8 * 60 + i * 30;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

export const timeToMin = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

export const rangesOverlap = (s1, e1, s2, e2) =>
  timeToMin(s1) < timeToMin(e2) && timeToMin(s2) < timeToMin(e1);

// Sesi yang ikut dihitung dalam bentrok: cancelled & reschedule_pending tidak memakai slot terapis.
export const occupiesTherapist = (s) => s.status !== "cancelled" && s.status !== "reschedule_pending";

// Bentrok = terapis yang sama sudah handle client lain di jam yang overlap pada tanggal itu.
// Jam kerja terapis (domain/workHours) tidak memblokir penjadwalan; ia hanya menjadi kapasitas untuk Utilization Rate.
export function checkConflicts({ therapistId, date, startTime, endTime, schedules, therapists, excludeId }) {
  const issues = [];
  if (!therapistId || !date || !startTime || !endTime) return issues;
  const therapist = therapists.find((t) => t.id === therapistId);
  const clashes = schedules.filter(
    (s) =>
      s.id !== excludeId &&
      s.therapistId === therapistId &&
      s.date === date &&
      occupiesTherapist(s) &&
      rangesOverlap(startTime, endTime, s.startTime, s.endTime)
  );
  if (clashes.length > 0) {
    issues.push(`${therapist ? therapist.name : "Terapis ini"} sudah menangani client lain di jam tersebut (${clashes.length} jadwal bersamaan).`);
  }
  return issues;
}

// Reschedule massal ATOMIK: `rows` = [{ id, date, startTime, endTime, therapistId }] (satu baris per sesi, tujuan boleh
// beda-beda). Semua baris dicek terhadap jadwal lain DAN terhadap baris lain di batch yang sama (posisi baru).
// Mengembalikan { ok, issues: { [id]: string[] } }; pemanggil hanya boleh menyimpan bila `ok` (tanpa simpan sebagian).
export function planBulkReschedule({ rows, schedules, therapists, holidays = [] }) {
  const byId = new Map(schedules.map((s) => [s.id, s]));
  const moved = new Map(rows.map((r) => [r.id, r]));
  const working = schedules.map((s) => (moved.has(s.id) ? { ...s, ...moved.get(s.id), status: "rescheduled" } : s));
  const issues = {};
  const add = (id, msg) => {
    (issues[id] ||= []).push(msg);
  };

  rows.forEach((r) => {
    const orig = byId.get(r.id);
    if (!orig) return add(r.id, "Sesi tidak ditemukan.");
    if (!r.date || !r.startTime || !r.endTime || !r.therapistId) return add(r.id, "Tanggal, jam, dan terapis wajib diisi.");
    if (timeToMin(r.endTime) <= timeToMin(r.startTime)) return add(r.id, "Jam selesai harus setelah jam mulai.");
    if (r.date === orig.date && r.startTime === orig.startTime && r.endTime === orig.endTime && r.therapistId === orig.therapistId) {
      return add(r.id, "Belum ada perubahan jadwal.");
    }
    const holiday = findHoliday(holidays, r.date, orig.branchId);
    if (holiday && r.date !== orig.date) add(r.id, holidayMessage(holiday));
    checkConflicts({ ...r, schedules: working, therapists, excludeId: r.id }).forEach((m) => add(r.id, m));
  });
  return { ok: Object.keys(issues).length === 0, issues };
}

// Id semua sesi yang bentrok dengan sesi aktif lain milik terapis & tanggal yang sama (untuk penanda kalender).
export function findTherapistClashIds(schedules) {
  const ids = new Set();
  const groups = new Map();
  for (const s of schedules) {
    if (!s.therapistId || !occupiesTherapist(s)) continue;
    const key = `${s.therapistId}|${s.date}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  for (const list of groups.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (rangesOverlap(list[i].startTime, list[i].endTime, list[j].startTime, list[j].endTime)) {
          ids.add(list[i].id);
          ids.add(list[j].id);
        }
      }
    }
  }
  return ids;
}

// Jadwal berulang MELEWATI tanggal libur (`holidayDates` = Set yyyy-MM-dd; lihat domain/holiday.js): sesi pada tanggal itu
// tidak dibuat dan tidak diganti.
export function buildRecurringSchedules(base, weeks = 1, selectedDays = [], dayConfigs = {}, holidayDates = null) {
  const sessions = buildRecurringRaw(base, weeks, selectedDays, dayConfigs);
  return holidayDates && holidayDates.size > 0 ? sessions.filter((s) => !holidayDates.has(s.date)) : sessions;
}

function buildRecurringRaw(base, weeks = 1, selectedDays = [], dayConfigs = {}) {
  const startAnchor = parseISO(base.date);

  if (!selectedDays || selectedDays.length === 0) {
    return Array.from({ length: weeks }, (_, i) => ({
      ...base,
      id: i === 0 ? base.id : uid(),
      date: format(addWeeks(startAnchor, i), "yyyy-MM-dd"),
      isRecurring: weeks > 1,
      recurrenceRule: weeks > 1 ? "weekly" : "none",
    }));
  }

  const dayIndexMap = {
    Monday: 0,
    Tuesday: 1,
    Wednesday: 2,
    Thursday: 3,
    Friday: 4,
    Saturday: 5,
    Sunday: 6,
  };

  const baseWeekStart = startOfWeek(startAnchor, { weekStartsOn: 1 });
  const results = [];

  for (let w = 0; w < weeks; w++) {
    const currentWeekMonday = addWeeks(baseWeekStart, w);
    selectedDays.forEach((dayName) => {
      const dayOffset = dayIndexMap[dayName] !== undefined ? dayIndexMap[dayName] : 0;
      const targetDate = addDays(currentWeekMonday, dayOffset);
      const targetDateStr = format(targetDate, "yyyy-MM-dd");

      const config = dayConfigs[dayName] || {};
      const slotStart = config.startTime || base.startTime;
      const slotEnd = config.endTime || base.endTime;
      const slotTherapist = config.therapistId || base.therapistId;
      const slotType = config.type || base.type;
      const slotCreditPkg = config.creditPackageId !== undefined ? config.creditPackageId : base.creditPackageId;

      results.push({
        ...base,
        id: results.length === 0 && targetDateStr === base.date ? base.id : uid(),
        date: targetDateStr,
        startTime: slotStart,
        endTime: slotEnd,
        therapistId: slotTherapist,
        type: slotType,
        creditPackageId: slotCreditPkg,
        isRecurring: weeks > 1,
        recurrenceRule: weeks > 1 ? `weekly_${selectedDays.join(",")}` : "single_week",
      });
    });
  }

  return results;
}

// Mengubah status sesi (complete / cancel / reschedule / revert) mengikuti AKSES MODUL (keputusan klien): role yang punya
// akses modul `weekly_calendar` boleh semua aksi non-hapus, termasuk Manager. Terapis hanya mengisi laporan.
// `hasPermission` = fungsi dari authStore (`roleHasPermission` di domain/rbac.js). Tanpa daftar role hardcode.
export const SCHEDULE_ACTION_MODULE = "weekly_calendar";
export const canManageSchedule = (hasPermission) => typeof hasPermission === "function" && Boolean(hasPermission(SCHEDULE_ACTION_MODULE));

// Slot asal sesi: untuk sesi menggantung = slot saat ini; untuk sesi yang sudah dipindah = jejak tersimpan
export const getOriginSlot = (schedule) =>
  schedule.status === "reschedule_pending" ? schedule.pendingFrom || scheduleSlot(schedule) : schedule.rescheduledFrom || null;

// Patch laporan sesi 3 bagian (Activity / Note / Homework). progressNote = salinan noteSection (legacy).
export const buildReportPatch = ({ activitySection = "", noteSection = "", homeworkSection = "" }, now = new Date()) => ({
  activitySection: activitySection.trim(),
  noteSection: noteSection.trim(),
  progressNote: noteSection.trim(),
  homeworkSection: homeworkSection.trim(),
  reportUpdatedAt: now.toISOString(),
});

// Field jejak reschedule menggantung yang dikosongkan saat sesi dipindah/dibatalkan
export const CLEAR_PENDING_PATCH = { pendingFrom: null, pendingAt: null, pendingReason: null, pendingNote: null };

// Catatan sesi dipisah per sumber (tidak digabung): `bookingNote` = catatan penjadwalan oleh admin saat membuat jadwal,
// `cancelNote` = catatan saat cancel, `pendingNote` = catatan reschedule menggantung. Data lama memakai satu field `notes`:
// dibaca sebagai catatan cancel bila sesi `cancelled`, selain itu sebagai catatan penjadwalan.
export const bookingNoteOf = (s) => s?.bookingNote ?? (s?.status === "cancelled" ? null : s?.notes) ?? null;
export const cancelNoteOf = (s) => s?.cancelNote ?? (s?.status === "cancelled" ? s?.notes : null) ?? null;

// Filter sesi berdasarkan rentang tanggal inklusif (yyyy-MM-dd). Batas kosong = tidak dibatasi.
export const filterSessionsByDate = (sessions, from = "", to = "") =>
  sessions.filter((s) => (!from || s.date >= from) && (!to || s.date <= to));

// Jumlah bagian laporan sesi yang terisi (0..3): Activity, Note, Homework.
export const reportFilledCount = (s) => [s?.activitySection, s?.noteSection, s?.homeworkSection].filter((v) => String(v || "").trim()).length;

// Laporan dianggap BELUM diisi bila ketiga bagiannya kosong (dasar View Report portal ortu & monitoring manager).
export const isReportEmpty = (s) => reportFilledCount(s) === 0;

// Sesi completed yang laporannya belum diisi (modul monitoring untuk manager; view `v_unreported_sessions`).
export const isUnreportedSession = (s) => Boolean(s) && s.status === "completed" && isReportEmpty(s);

// ---- Detail client: jadwal rutin (recurring) & jadwal aktif di kalender ----
export const ACTIVE_SESSION_STATUSES = ["scheduled", "rescheduled", "reschedule_pending"];

const WEEKDAY_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// Jadwal yang sedang aktif di kalender: sesi mendatang (hari ini atau setelahnya) berstatus scheduled / rescheduled /
// reschedule_pending, urut terdekat dulu.
export const upcomingActiveSessions = (sessions = [], today) =>
  sessions
    .filter((s) => ACTIVE_SESSION_STATUSES.includes(s.status) && s.date >= today)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

// Jadwal rutin (recurring): pola hari + jam + terapis dari sesi aktif mendatang. Sesi bertanda recurring (seri berulang)
// atau yang berulang >= 2x pada pola yang sama dianggap rutin. Sesi asesmen tidak dihitung.
export function deriveRecurringRoutines(sessions = [], today) {
  const groups = new Map();
  upcomingActiveSessions(sessions, today)
    .filter((s) => s.type !== "assessment" && s.status !== "reschedule_pending")
    .forEach((s) => {
      const weekday = new Date(`${s.date}T00:00:00`).getDay();
      const key = `${weekday}|${s.startTime}|${s.endTime}|${s.therapistId}`;
      const g = groups.get(key) || { weekday, day: WEEKDAY_ID[weekday], startTime: s.startTime, endTime: s.endTime, therapistId: s.therapistId, creditPackageId: s.creditPackageId, count: 0, nextDate: s.date, lastDate: s.date, seriesId: s.seriesId || null, flagged: false };
      g.count += 1;
      g.lastDate = s.date; // sesi diurutkan menaik: nextDate = sesi terjadwal pertama (tanggal mulai), lastDate = terakhir (tanggal akhir)
      g.flagged = g.flagged || Boolean(s.isRecurring) || String(s.recurrenceRule || "").startsWith("weekly");
      groups.set(key, g);
    });
  return [...groups.values()]
    .filter((g) => g.flagged || g.count >= 2)
    .sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.startTime.localeCompare(b.startTime));
}

// ---- Ganti / hapus jadwal rutin (recurring) ----
// Tidak ada id seri: sebuah rutinitas dikenali dari polanya (hari + jam + terapis, `routineKeyOf`). Yang diganti/dihapus
// HANYA sesi terapi berstatus `scheduled` (belum disentuh) pada pola itu mulai tanggal tertentu; sesi completed, cancelled,
// rescheduled, dan reschedule_pending tidak pernah diubah.
const WEEKDAY_NAME_BY_INDEX = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const weekdayNameOf = (weekdayIndex) => WEEKDAY_NAME_BY_INDEX[weekdayIndex];

export const routineKeyOf = (s) => `${new Date(`${s.date}T00:00:00`).getDay()}|${s.startTime}|${s.endTime}|${s.therapistId}`;
export const routineKeyOfRow = (r) => `${r.weekday}|${r.startTime}|${r.endTime}|${r.therapistId}`;

// Sesi yang akan terhapus bila rutinitas `keys` diganti/dihapus mulai `from` (yyyy-MM-dd, inklusif).
export const routineSessionsToRemove = (sessions = [], keys = [], from) => {
  const set = new Set(keys);
  return sessions.filter((s) => s.type === "therapy" && s.status === "scheduled" && s.date >= from && set.has(routineKeyOf(s)));
};

// Jumlah minggu bawaan penggantian: dari `from` sampai sesi terjadwal terakhir pada rutinitas client (min 4, maks 52; 12 bila kosong).
export function defaultRoutineWeeks(sessions = [], from) {
  const dates = sessions.filter((s) => s.type === "therapy" && s.status === "scheduled" && s.date >= from).map((s) => s.date).sort();
  if (dates.length === 0) return 12;
  const days = Math.round((new Date(`${dates[dates.length - 1]}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000);
  return Math.min(52, Math.max(4, Math.floor(days / 7) + 1));
}

// Rencana mengganti rutinitas satu client (pure; belum menyimpan apa pun).
//   rows: [{ originalKey|null, weekday(0-6), startTime, endTime, therapistId, creditPackageId?, originalPackageId?, removed }] — originalKey = kunci rutinitas lama
//         (null = hari baru). Baris tak berubah dibiarkan; baris berubah/dihapus → sesi lamanya dihapus; baris berubah/baru →
//         sesi baru dibuat mingguan sebanyak `weeks` mulai `from`, melewati hari libur (`holidayDates`).
//   template: field tetap sesi baru { clientId, branchId, creditPackageId, serviceType, createdBy, ... }.
// Mengembalikan { removeIds, createList, conflicts, skippedHoliday }. Bentrok terapis dicek terhadap jadwal lain (sesi yang
// dihapus tidak dihitung) dan antar sesi baru; pemanggil tidak boleh menyimpan bila `conflicts` tidak kosong.
export function planRoutineChange({ sessions = [], rows = [], from, weeks = 12, holidayDates = null, template = {}, therapists = [] }) {
  // Berubah = hari/jam/terapis beda, atau paket kredit beda dari pola lama (creditPackageId undefined = ikut template)
  const packageChanged = (r) => r.creditPackageId !== undefined && r.originalPackageId !== undefined && r.creditPackageId !== r.originalPackageId;
  const isChanged = (r) => r.originalKey == null || r.removed || routineKeyOfRow(r) !== r.originalKey || packageChanged(r);
  const replacedKeys = rows.filter((r) => r.originalKey != null && isChanged(r)).map((r) => r.originalKey);
  const removed = routineSessionsToRemove(sessions, replacedKeys, from);
  const removeIds = removed.map((s) => s.id);

  const createList = [];
  const seriesId = uid(); // pola baru = satu seri baru (satu masa berlaku)
  let skippedHoliday = 0;
  rows
    .filter((r) => !r.removed && isChanged(r))
    .forEach((r) => {
      const day = weekdayNameOf(Number(r.weekday));
      const creditPackageId = r.creditPackageId !== undefined ? r.creditPackageId : template.creditPackageId ?? null;
      const base = { activitySection: "", homeworkSection: "", ...template, creditPackageId, id: uid(), type: "therapy", status: "scheduled", date: from, startTime: r.startTime, endTime: r.endTime, therapistId: r.therapistId };
      const raw = buildRecurringSchedules(base, weeks, [day], { [day]: { startTime: r.startTime, endTime: r.endTime, therapistId: r.therapistId, creditPackageId } }).filter((s) => s.date >= from);
      const kept = holidayDates && holidayDates.size > 0 ? raw.filter((s) => !holidayDates.has(s.date)) : raw;
      skippedHoliday += raw.length - kept.length;
      kept.forEach((s) => createList.push({ ...s, seriesId, isRecurring: true, recurrenceRule: `weekly_${day}` }));
    });

  const gone = new Set(removeIds);
  const working = sessions.filter((s) => !gone.has(s.id));
  const conflicts = [];
  createList.forEach((s) => {
    checkConflicts({ therapistId: s.therapistId, date: s.date, startTime: s.startTime, endTime: s.endTime, schedules: working, therapists }).forEach((m) =>
      conflicts.push(`${s.date} ${s.startTime}–${s.endTime}: ${m}`)
    );
    working.push(s);
  });
  return { removeIds, createList, conflicts, skippedHoliday };
}

// Masa berlaku SATU seri (semua hari/jam pada seri yang sama berbagi tanggal mulai & akhir): dari sesi paling awal sampai paling akhir
// seri itu, semua status (termasuk yang sudah lewat). `seriesId` null = data lama tanpa id seri: semua sesi terapi berulang tanpa
// `seriesId` dianggap satu seri. Backend: `schedule_series.starts_on` / `ends_on`.
export function seriesPeriod(sessions = [], seriesId = null) {
  const dates = sessions
    .filter((s) => s.type !== "assessment" && (seriesId ? s.seriesId === seriesId : !s.seriesId && (s.isRecurring || String(s.recurrenceRule || "").startsWith("weekly"))))
    .map((s) => s.date)
    .sort();
  return dates.length ? { start: dates[0], end: dates[dates.length - 1] } : null;
}

// ---- Rekap harian sesi selesai (report terapis, revisi 7 Okt 2026) ----
// Durasi sesi dalam jam (1 jam = 1 sesi standar), mis. 09:00–10:30 = 1.5.
export const sessionHours = (s) => Math.max(0, (timeToMin(s.endTime) - timeToMin(s.startTime)) / 60);

// "3 Hours" / "1.5 Hours" / "1 Hour"
export const formatHours = (h) => {
  const n = Math.round(h * 10) / 10;
  return `${n} ${n === 1 ? "Hour" : "Hours"}`;
};

// Kelompokkan sesi per tanggal (terbaru dulu): jumlah sesi, total jam, dan client unik hari itu (urut jam mulai).
// `getClientName` memberi nama client; sesi tanpa nama diberi "Client".
export function dailySessionReport(sessions = [], getClientName = () => "Client") {
  const byDate = new Map();
  [...sessions]
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
    .forEach((s) => {
      const row = byDate.get(s.date) || { date: s.date, sessions: 0, hours: 0, clients: [] };
      row.sessions += 1;
      row.hours += sessionHours(s);
      if (!row.clients.some((c) => c.id === s.clientId)) row.clients.push({ id: s.clientId, name: getClientName(s.clientId) || "Client" });
      byDate.set(s.date, row);
    });
  const rows = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
  const totals = {
    days: rows.length,
    sessions: rows.reduce((n, r) => n + r.sessions, 0),
    hours: rows.reduce((n, r) => n + r.hours, 0),
    clients: new Set(sessions.map((s) => s.clientId)).size,
  };
  return { rows, totals };
}
