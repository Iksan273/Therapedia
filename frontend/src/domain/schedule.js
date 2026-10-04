import { addDays, addWeeks, format, parseISO, startOfWeek } from "date-fns";
import { uid } from "@/shared/lib/id";
import { findHoliday, holidayMessage } from "@/domain/holiday";

// Domain penjadwalan: jam kalender, alasan cancel, deteksi bentrok, dan generator jadwal berulang.
// Aturan di sini adalah acuan untuk Service Laravel (lihat docs/guide/05 & 10).

// Seed pilihan cepat alasan cancel (bisa diubah di Master Data). Alasan yang tersimpan di sesi adalah STRING:
// `value` pilihan cepat atau teks bebas yang diketik user, tanpa relasi ke daftar ini.
export const DEFAULT_CANCEL_REASONS = [
  { value: "sakit", label: "Sakit / Kondisi Medis" },
  { value: "izin_keluarga", label: "Izin / Keperluan Keluarga" },
  { value: "bentrok_sekolah", label: "Bentrok Jadwal Sekolah" },
  { value: "tanpa_kabar", label: "Tanpa Kabar (No Show)" },
];

// Alasan sistem (tidak muncul di dropdown pembatalan biasa)
export const RESCHEDULE_DROPPED = "reschedule_dibatalkan";

export const SYSTEM_CANCEL_REASONS = [
  { value: RESCHEDULE_DROPPED, label: "Reschedule tidak dilanjutkan" },
];

// Kode lama sebelum ada opsi "ketik sendiri"; tetap terbaca di data lama.
const LEGACY_CANCEL_LABELS = { lainnya: "Alasan Lainnya" };

// `list` = daftar pilihan cepat dari Master Data. Tidak ditemukan → string apa adanya (teks custom).
export const cancelReasonLabel = (val, list = DEFAULT_CANCEL_REASONS) => {
  const found = list.find((r) => r.value === val) || SYSTEM_CANCEL_REASONS.find((r) => r.value === val);
  return found ? found.label : LEGACY_CANCEL_LABELS[val] || val || "—";
};

// Sesi yang dibatalkan dari status "reschedule menggantung" (alasan sistem). Potong kredit atau tidak tetap pilihan admin
// seperti cancel biasa; penanda ini hanya dipakai statistik kehadiran (bukan kesalahan client).
export const isCreditNeutralCancel = (s) => Boolean(s) && s.status === "cancelled" && s.cancelReason === RESCHEDULE_DROPPED;

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
const occupiesTherapist = (s) => s.status !== "cancelled" && s.status !== "reschedule_pending";

// Bentrok = terapis yang sama sudah handle client lain di jam yang overlap pada tanggal itu.
// Tidak ada konsep jam kerja terapis.
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
      const g = groups.get(key) || { weekday, day: WEEKDAY_ID[weekday], startTime: s.startTime, endTime: s.endTime, therapistId: s.therapistId, creditPackageId: s.creditPackageId, count: 0, nextDate: s.date, flagged: false };
      g.count += 1;
      g.flagged = g.flagged || Boolean(s.isRecurring) || String(s.recurrenceRule || "").startsWith("weekly");
      groups.set(key, g);
    });
  return [...groups.values()]
    .filter((g) => g.flagged || g.count >= 2)
    .sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.startTime.localeCompare(b.startTime));
}
