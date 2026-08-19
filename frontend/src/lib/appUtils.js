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

export const PIPELINE_STATUSES = [
  "inquiry",
  "pending",
  "assessment_scheduled",
  "assessment_done",
  "report_ready",
  "scheduling",
  "admitted",
  "discontinued",
];

export const STATUS_META = {
  inquiry: { label: "Inquiry", cls: "bg-sky-50 text-sky-700 border border-sky-200/70" },
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 border border-amber-200/70" },
  assessment_scheduled: { label: "Assessment Scheduled", cls: "bg-blue-50 text-blue-700 border border-blue-200/70" },
  assessment_done: { label: "Assessment Done", cls: "bg-teal-50 text-teal-700 border border-teal-200/70" },
  report_ready: { label: "Report Ready", cls: "bg-indigo-50 text-indigo-700 border border-indigo-200/70" },
  scheduling: { label: "Scheduling", cls: "bg-cyan-50 text-cyan-700 border border-cyan-200/70" },
  admitted: { label: "Admitted", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200/70" },
  active: { label: "Active", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200/70" },
  discontinued: { label: "Discontinued", cls: "bg-rose-50 text-rose-700 border border-rose-200/70" },
  discharged: { label: "Discharged", cls: "bg-slate-100 text-slate-700 border border-slate-200/80" },
  scheduled: { label: "Scheduled", cls: "bg-sky-50 text-sky-700 border border-sky-200/70" },
  completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200/70" },
  cancelled: { label: "Cancelled", cls: "bg-rose-50 text-rose-700 border border-rose-200/70" },
  rescheduled: { label: "Rescheduled", cls: "bg-amber-50 text-amber-700 border border-amber-200/70" },
  unpaid: { label: "Unpaid", cls: "bg-amber-50 text-amber-700 border border-amber-200/70" },
  paid: { label: "Paid", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200/70" },
  frozen: { label: "Frozen (0 Credit)", cls: "bg-cyan-50 text-cyan-800 border border-cyan-300" },
  therapy: { label: "OT / Sensory", cls: "bg-sky-50 text-sky-700 border border-sky-200/70" },
  therapy_speech: { label: "Speech Therapy", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200/70" },
  therapy_physio: { label: "Physiotherapy", cls: "bg-purple-50 text-purple-700 border border-purple-200/70" },
  therapy_behavior: { label: "Behavior Therapy", cls: "bg-amber-50 text-amber-700 border border-amber-200/70" },
  assessment: { label: "Assessment", cls: "bg-indigo-50 text-indigo-700 border border-indigo-200/70" },
  consultation: { label: "Consultation", cls: "bg-teal-50 text-teal-700 border border-teal-200/70" },
};

export const CONCERN_TAGS = [
  { value: "sensory", label: "Sensory", cls: "bg-purple-50 text-purple-700 border border-purple-200/60" },
  { value: "motor", label: "Motor Skills", cls: "bg-blue-50 text-blue-700 border border-blue-200/60" },
  { value: "speech", label: "Speech", cls: "bg-teal-50 text-teal-700 border border-teal-200/60" },
  { value: "behavior", label: "Behaviour", cls: "bg-amber-50 text-amber-700 border border-amber-200/60" },
  { value: "social", label: "Social", cls: "bg-rose-50 text-rose-700 border border-rose-200/60" },
  { value: "feeding", label: "Feeding", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200/60" },
  { value: "attention", label: "Attention / Focus", cls: "bg-orange-50 text-orange-700 border border-orange-200/60" },
];

export const DISCHARGE_REASONS = [
  { value: "moving", label: "Moving / Relocation" },
  { value: "financial", label: "Financial" },
  { value: "conflict_schedule", label: "Schedule Conflict" },
  { value: "expectation_not_met", label: "Expectation Not Met" },
  { value: "graduate", label: "Graduated Goals" },
  { value: "other", label: "Other" },
];

export const dischargeReasonLabel = (value) => {
  const found = DISCHARGE_REASONS.find((r) => r.value === value);
  return found ? found.label : value || "—";
};

export const PACKAGE_OPTIONS = [
  { key: "5", label: "5 Sessions (5x)", credits: 5 },
  { key: "10", label: "10 Sessions (10x)", credits: 10 },
  { key: "20", label: "20 Sessions (20x)", credits: 20 },
];

export const SESSION_TYPES = [
  { value: "therapy", label: "Occupational / Sensory Therapy", shortLabel: "OT / Sensory" },
  { value: "therapy_speech", label: "Speech & Language Therapy", shortLabel: "Speech Therapy" },
  { value: "therapy_physio", label: "Physiotherapy & Gross Motor", shortLabel: "Physiotherapy" },
  { value: "therapy_behavior", label: "Behavioral & Early Intervention", shortLabel: "Behavior Therapy" },
  { value: "assessment", label: "Clinical Assessment", shortLabel: "Assessment" },
  { value: "consultation", label: "Specialist Consultation", shortLabel: "Consultation" },
];

export const CALENDAR_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Hourly rows 08:00 -> 17:00 (slots ending 18:00)
export const CALENDAR_HOURS = Array.from({ length: 10 }, (_, i) => `${String(8 + i).padStart(2, "0")}:00`);

// 30-min interval options 08:00 -> 18:00 for form selects
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
  if (therapist) {
    const slots = therapist.availableSlots.filter((s) => s.day === dayName);
    if (slots.length === 0) {
      issues.push(`${therapist.name} is not available on ${dayName}s.`);
    } else if (
      !slots.some(
        (s) => timeToMin(startTime) >= timeToMin(s.startTime) && timeToMin(endTime) <= timeToMin(s.endTime)
      )
    ) {
      issues.push(
        `Outside ${therapist.name}'s ${dayName} hours (${slots.map((s) => `${s.startTime}–${s.endTime}`).join(", ")}).`
      );
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
    issues.push(`${therapist ? therapist.name : "This therapist"} already has ${clashes.length} overlapping booking(s) at this time.`);
  }
  return issues;
}

export const WEEKDAY_OPTIONS = [
  { id: "Monday", label: "Monday", short: "Mon" },
  { id: "Tuesday", label: "Tuesday", short: "Tue" },
  { id: "Wednesday", label: "Wednesday", short: "Wed" },
  { id: "Thursday", label: "Thursday", short: "Thu" },
  { id: "Friday", label: "Friday", short: "Fri" },
  { id: "Saturday", label: "Saturday", short: "Sat" },
];

export function buildRecurringSchedules(base, weeks = 1, selectedDays = [], dayConfigs = {}) {
  const startAnchor = parseISO(base.date);

  // If no multi-day selection provided, fallback to standard single-day recurrence
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

  const baseWeekStart = startOfWeek(startAnchor, { weekStartsOn: 1 }); // Monday of starting week
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

      results.push({
        ...base,
        id: results.length === 0 && targetDateStr === base.date ? base.id : uid(),
        date: targetDateStr,
        startTime: slotStart,
        endTime: slotEnd,
        therapistId: slotTherapist,
        type: slotType,
        isRecurring: weeks > 1,
        recurrenceRule: weeks > 1 ? `weekly_${selectedDays.join(",")}` : "single_week",
      });
    });
  }

  return results;
}

export function makeInquiryClient(form) {
  const serviceTypes = form.serviceTypes && form.serviceTypes.length > 0
    ? form.serviceTypes
    : form.serviceType
    ? [form.serviceType]
    : ["assessment"];

  return {
    id: uid(),
    status: form.status || "inquiry",
    clientName: form.clientName.trim(),
    parentName: form.parentName.trim(),
    parentContact: form.parentContact.trim(),
    parentEmail: (form.parentEmail || "").trim(),
    parentComplaint: (form.parentComplaint || "").trim(),
    concernTags: form.concernTags || [],
    dob: form.dob,
    serviceTypes,
    serviceType: serviceTypes[0] || "assessment",
    urgency: form.urgency || "regular",
    timePreference: form.timePreference || "anytime",
    isWaitingList: Boolean(form.isWaitingList),
    assessmentCategoryId: form.assessmentCategoryId || null,
    assessmentAccessCode: form.assessmentAccessCode || null,
    assessmentAnswers: [],
    assessmentReportNote: null,
    invoice: null,
    dateOfJoin: null,
    dateOfDischarge: null,
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

export function resetDemoData() {
  clearPersistedData();
  window.location.assign("/");
}
