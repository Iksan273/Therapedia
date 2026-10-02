import { addDays, addWeeks, format, parseISO, startOfWeek } from "date-fns";
import { uid } from "@/shared/lib/id";

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
  { value: RESCHEDULE_DROPPED, label: "Reschedule tidak dilanjutkan (tanpa potong kredit)" },
];

// Kode lama sebelum ada opsi "ketik sendiri"; tetap terbaca di data lama.
const LEGACY_CANCEL_LABELS = { lainnya: "Alasan Lainnya" };

// `list` = daftar pilihan cepat dari Master Data. Tidak ditemukan → string apa adanya (teks custom).
export const cancelReasonLabel = (val, list = DEFAULT_CANCEL_REASONS) => {
  const found = list.find((r) => r.value === val) || SYSTEM_CANCEL_REASONS.find((r) => r.value === val);
  return found ? found.label : LEGACY_CANCEL_LABELS[val] || val || "—";
};

// Sesi yang dibatalkan dari status "reschedule menggantung": tidak memotong kredit, tidak dihitung kuota cancel
export const isCreditNeutralCancel = (s) => Boolean(s) && s.status === "cancelled" && s.cancelReason === RESCHEDULE_DROPPED;

// Revert: sesi completed / cancelled kembali ke status sebelumnya; sesi rescheduled kembali ke slot asal.
export const canRevertSession = (s) =>
  Boolean(s) && (s.status === "completed" || s.status === "cancelled" || (s.status === "rescheduled" && Boolean(s.rescheduledFrom)));

// Status tujuan revert: reschedule → scheduled (di slot asal); lainnya `previousStatus` bila tersimpan,
// data lama (seed) ditebak dari jejak reschedule.
export const restoreStatusOf = (s) => {
  if (s.status === "rescheduled") return "scheduled";
  if (s.previousStatus && s.previousStatus !== s.status) return s.previousStatus;
  return s.rescheduledFrom ? "rescheduled" : "scheduled";
};

// Slot tujuan revert: reschedule → slot asal (`rescheduledFrom`); lainnya slot sesi saat ini.
export const restoreSlotOf = (s) => (s.status === "rescheduled" && s.rescheduledFrom ? s.rescheduledFrom : scheduleSlot(s));

// Slot waktu sebuah sesi (dipakai untuk jejak jadwal asal reschedule)
export const scheduleSlot = (s) => ({ date: s.date, startTime: s.startTime, endTime: s.endTime, therapistId: s.therapistId });

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

export function buildRecurringSchedules(base, weeks = 1, selectedDays = [], dayConfigs = {}) {
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

// Role yang boleh mengubah status sesi (complete / cancel / reschedule). Terapis hanya mengisi laporan.
export const SCHEDULE_MANAGER_ROLES = ["master", "admin_schedule"];
export const canManageSchedule = (role) => SCHEDULE_MANAGER_ROLES.includes(role);

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

// Filter sesi berdasarkan rentang tanggal inklusif (yyyy-MM-dd). Batas kosong = tidak dibatasi.
export const filterSessionsByDate = (sessions, from = "", to = "") =>
  sessions.filter((s) => (!from || s.date >= from) && (!to || s.date <= to));
