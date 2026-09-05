import { addDays, addWeeks, differenceInYears, format, parseISO, startOfWeek } from "date-fns";
import { clearPersistedData } from "@/hooks/useLocalStorage";

export const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const nowIso = () => new Date().toISOString();
export const todayStr = () => format(new Date(), "yyyy-MM-dd");

export const genCode = (prefix) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i += 1) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${s}`;
};

export const BRANCHES = [
  { id: "branch-sby-timur", name: "Surabaya Timur", code: "SBY-T", city: "Surabaya" },
  { id: "branch-citraland", name: "Citraland", code: "CTL", city: "Surabaya Barat" },
  { id: "branch-sby-barat", name: "Surabaya Barat", code: "SBY-B", city: "Surabaya" },
];

export const PIPELINE_STATUSES = [
  "inquiry",
  "service_selected",
  "assessment_scheduled",
  "assessment_done",
  "admitted",
  "done_consult",
  "done_assessment",
  "discontinued",
];

export const STATUS_META = {
  inquiry: { label: "Inquiry Baru", cls: "bg-sky-50 text-sky-700 border border-sky-200/70" },
  service_selected: { label: "Layanan Dipilih", cls: "bg-purple-50 text-purple-700 border border-purple-200/70" },
  assessment_scheduled: { label: "Asesmen Terjadwal", cls: "bg-blue-50 text-blue-700 border border-blue-200/70" },
  assessment_done: { label: "Asesmen Selesai", cls: "bg-teal-50 text-teal-700 border border-teal-200/70" },
  admitted: { label: "Active Client", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200/70" },
  active: { label: "Active Client", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200/70" },
  done_consult: { label: "Done Consult", cls: "bg-amber-50 text-amber-800 border border-amber-200/70" },
  done_assessment: { label: "Done Assessment", cls: "bg-indigo-50 text-indigo-700 border border-indigo-200/70" },
  discontinued: { label: "Discontinued", cls: "bg-rose-50 text-rose-700 border border-rose-200/70" },
  discharged: { label: "Discharged", cls: "bg-slate-100 text-slate-700 border border-slate-200/80" },
  scheduled: { label: "Scheduled", cls: "bg-sky-50 text-sky-700 border border-sky-200/70" },
  completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200/70" },
  cancelled: { label: "Cancelled", cls: "bg-rose-50 text-rose-700 border border-rose-200/70" },
  rescheduled: { label: "Rescheduled", cls: "bg-amber-50 text-amber-700 border border-amber-200/70" },
  unpaid: { label: "Belum Lunas", cls: "bg-rose-50 text-rose-700 border border-rose-200/70" },
  paid: { label: "Lunas Terverifikasi", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200/70" },
  frozen: { label: "Frozen (0 Kredit)", cls: "bg-cyan-50 text-cyan-900 border border-cyan-400 font-bold ring-1 ring-cyan-400/40" },
  b_ota: { label: "BOT-A", cls: "bg-indigo-50 text-indigo-700 border border-indigo-200/70" },
  f_ota: { label: "FOT-A", cls: "bg-purple-50 text-purple-700 border border-purple-200/70" },
  bot_a: { label: "BOT-A", cls: "bg-indigo-50 text-indigo-700 border border-indigo-200/70" },
  fot_a: { label: "FOT-A", cls: "bg-purple-50 text-purple-700 border border-purple-200/70" },
  consult_wo_report: { label: "Consultation without Report", cls: "bg-cyan-50 text-cyan-700 border border-cyan-200/70" },
  consult_w_report: { label: "Consultation with written report", cls: "bg-teal-50 text-teal-700 border border-teal-200/70" },
  assessment: { label: "Asesmen Klinis", cls: "bg-indigo-50 text-indigo-700 border border-indigo-200/70" },
  therapy: { label: "Terapi Reguler", cls: "bg-sky-50 text-sky-700 border border-sky-200/70" },
  therapy_vip: { label: "Terapi VIP", cls: "bg-purple-50 text-purple-700 border border-purple-200/70" },
  therapy_speech: { label: "Terapi Wicara", cls: "bg-teal-50 text-teal-700 border border-teal-200/70" },
  therapy_physio: { label: "Fisioterapi", cls: "bg-orange-50 text-orange-700 border border-orange-200/70" },
};

export const CONCERN_TAGS = [
  { value: "speech", label: "Speech & Language", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "sensory", label: "Sensory Processing", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "motor", label: "Fine/Gross Motor", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "behavior", label: "Behavioral & Focus", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "social", label: "Social Skills", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "school", label: "School Readiness", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
];

export const INTAKE_SERVICES = [
  { value: "b_ota", label: "BOT-A (Brief Occupational Therapy Assessment)", shortLabel: "BOT-A", fullLabel: "BOT-A (Brief Occupational Therapy Assessment)", allowsSchoolCompanion: true, category: "Asesmen", description: "Brief Occupational Therapy Assessment & Sensory Screening" },
  { value: "f_ota", label: "FOT-A (Full Occupational Therapy Assessment)", shortLabel: "FOT-A", fullLabel: "FOT-A (Full Occupational Therapy Assessment)", allowsSchoolCompanion: true, category: "Asesmen", description: "Full Occupational Therapy Comprehensive Assessment" },
  { value: "consult_wo_report", label: "Consultation without Report", shortLabel: "Consultation w/o Report", fullLabel: "Consultation without Report", allowsSchoolCompanion: false, category: "Konsultasi", description: "Konsultasi tatap muka evaluasi klinis tanpa laporan tertulis" },
  { value: "consult_w_report", label: "Consultation with written report", shortLabel: "Consultation w/ Report", fullLabel: "Consultation with written report", allowsSchoolCompanion: false, category: "Konsultasi", description: "Konsultasi klinis mendalam dengan laporan tertulis resmi" },
];

export const CLINICAL_SERVICES = INTAKE_SERVICES;
export const ASSESSMENT_SERVICES = INTAKE_SERVICES;
export const THERAPY_SERVICES = INTAKE_SERVICES;
export const SESSION_TYPES = INTAKE_SERVICES;

export const CANCEL_REASONS = [
  { value: "sakit", label: "Sakit / Kondisi Medis" },
  { value: "izin_keluarga", label: "Izin / Keperluan Keluarga" },
  { value: "bentrok_sekolah", label: "Bentrok Jadwal Sekolah" },
  { value: "tanpa_kabar", label: "Tanpa Kabar (No Show)" },
  { value: "lainnya", label: "Alasan Lainnya" },
];

export const cancelReasonLabel = (val) => {
  const found = CANCEL_REASONS.find((r) => r.value === val);
  return found ? found.label : val || "—";
};

export const DEFAULT_MASTER_PACKAGES = [
  { id: "pkg-reguler", name: "Paket Reguler", credits: 10, price: 2500000, description: "10 Sesi Terapi Reguler (OT / Sensori / Wicara)" },
  { id: "pkg-vip", name: "Paket VIP", credits: 10, price: 3500000, description: "10 Sesi Terapi VIP Spesialis (1-on-1 Senior Practitioner)" },
  { id: "pkg-consult", name: "Paket Konsultasi", credits: 1, price: 500000, description: "1 Sesi Konsultasi Klinis & Review" },
];

export const DISCHARGE_REASONS = [
  { value: "moving", label: "Moving / Relocation" },
  { value: "financial", label: "Financial / Biaya" },
  { value: "conflict_schedule", label: "Schedule Conflict / Bentrok" },
  { value: "expectation_not_met", label: "Expectation Not Met" },
  { value: "graduate", label: "Tercapai Target (Graduated)" },
  { value: "other", label: "Lainnya" },
];

export const dischargeReasonLabel = (value) => {
  const found = DISCHARGE_REASONS.find((r) => r.value === value);
  return found ? found.label : value || "—";
};

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

export function checkConflicts({ therapistId, date, startTime, endTime, schedules, therapists, excludeId }) {
  const issues = [];
  if (!therapistId || !date || !startTime || !endTime) return issues;
  const therapist = therapists.find((t) => t.id === therapistId);
  let dayName = "";
  try {
    dayName = format(parseISO(date), "EEEE");
  } catch (e) {
    return issues;
  }
  if (therapist && therapist.availableSlots) {
    const slots = therapist.availableSlots.filter((s) => s.day === dayName);
    if (slots.length > 0 && !slots.some((s) => timeToMin(startTime) >= timeToMin(s.startTime) && timeToMin(endTime) <= timeToMin(s.endTime))) {
      issues.push(`Di luar jam kerja ${therapist.name} hari ${dayName} (${slots.map((s) => `${s.startTime}–${s.endTime}`).join(", ")}).`);
    }
  }
  const clashes = schedules.filter(
    (s) =>
      s.id !== excludeId &&
      s.therapistId === therapistId &&
      s.date === date &&
      s.status !== "cancelled" &&
      rangesOverlap(startTime, endTime, s.startTime, s.endTime)
  );
  if (clashes.length > 0) {
    issues.push(`${therapist ? therapist.name : "Terapis ini"} sudah memiliki ${clashes.length} jadwal bersamaan di jam tersebut.`);
  }
  return issues;
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

export function makeInquiryClient(form) {
  return {
    id: uid(),
    branchId: form.branchId || "branch-sby-timur",
    status: form.status || "inquiry",
    clientName: form.clientName.trim(),
    parentName: form.parentName.trim(),
    parentContact: form.parentContact.trim(),
    parentEmail: (form.parentEmail || "").trim(),
    dob: form.dob || todayStr(),
    serviceType: form.serviceType || null,
    hasSchoolCompanionProfile: Boolean(form.hasSchoolCompanionProfile),
    assessmentCodes: [],
    assessmentAnswers: [],
    assessmentReportNote: null,
    gdriveClientLink: null,
    invoice: null,
    dateOfJoin: null,
    dateOfDischarge: null,
    finalOutcome: null,
    dischargeReason: null,
    dischargeNote: null,
    clientAccessCode: genCode("TDC"),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

export const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return format(typeof d === "string" ? parseISO(d) : d, "MMM d, yyyy");
  } catch (e) {
    return d;
  }
};

export const calcAge = (dob) => {
  if (!dob) return null;
  try {
    return differenceInYears(new Date(), parseISO(dob));
  } catch (e) {
    return null;
  }
};

export const calcAgeDetailed = (dob, testDate = new Date()) => {
  if (!dob) return { years: 0, months: 0, days: 0 };
  try {
    const birth = typeof dob === "string" ? parseISO(dob) : dob;
    const test = typeof testDate === "string" ? parseISO(testDate) : testDate;
    let years = test.getFullYear() - birth.getFullYear();
    let months = test.getMonth() - birth.getMonth();
    let days = test.getDate() - birth.getDate();
    if (days < 0) {
      months -= 1;
      const prevMonthLastDay = new Date(test.getFullYear(), test.getMonth(), 0).getDate();
      days += prevMonthLastDay;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) };
  } catch (e) {
    return { years: 0, months: 0, days: 0 };
  }
};

export const fmtCurrency = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
};

export function resetDemoData() {
  clearPersistedData();
  window.location.assign("/");
}
