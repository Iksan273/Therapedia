import { addWeeks, differenceInYears, format, parseISO } from "date-fns";
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
  inquiry: { label: "Inquiry", cls: "bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]" },
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-600" },
  assessment_scheduled: { label: "Assessment Scheduled", cls: "bg-blue-50 text-blue-600" },
  assessment_done: { label: "Assessment Done", cls: "bg-sky-50 text-sky-700" },
  report_ready: { label: "Report Ready", cls: "bg-violet-50 text-violet-600" },
  scheduling: { label: "Scheduling", cls: "bg-cyan-50 text-cyan-700" },
  admitted: { label: "Admitted", cls: "bg-green-50 text-green-600" },
  active: { label: "Active", cls: "bg-green-50 text-green-600" },
  discontinued: { label: "Discontinued", cls: "bg-red-50 text-red-600" },
  discharged: { label: "Discharged", cls: "bg-gray-100 text-gray-600" },
  scheduled: { label: "Scheduled", cls: "bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]" },
  completed: { label: "Completed", cls: "bg-green-50 text-green-600" },
  cancelled: { label: "Cancelled", cls: "bg-red-50 text-red-600" },
  rescheduled: { label: "Rescheduled", cls: "bg-amber-50 text-amber-600" },
  unpaid: { label: "Unpaid", cls: "bg-amber-50 text-amber-600" },
  paid: { label: "Paid", cls: "bg-green-50 text-green-600" },
  therapy: { label: "Therapy", cls: "bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]" },
  assessment: { label: "Assessment", cls: "bg-violet-50 text-violet-600" },
  consultation: { label: "Consultation", cls: "bg-cyan-50 text-cyan-700" },
};

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
  { value: "therapy", label: "Therapy" },
  { value: "assessment", label: "Assessment" },
  { value: "consultation", label: "Consultation" },
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

export function buildRecurringSchedules(base, weeks = 12) {
  return Array.from({ length: weeks }, (_, i) => ({
    ...base,
    id: i === 0 ? base.id : uid(),
    date: format(addWeeks(parseISO(base.date), i), "yyyy-MM-dd"),
    isRecurring: true,
    recurrenceRule: "weekly",
  }));
}

export function makeInquiryClient(form) {
  return {
    id: uid(),
    status: "inquiry",
    clientName: form.clientName.trim(),
    parentName: form.parentName.trim(),
    parentContact: form.parentContact.trim(),
    parentEmail: form.parentEmail.trim(),
    parentComplaint: (form.parentComplaint || "").trim(),
    dob: form.dob,
    serviceType: null,
    assessmentCategoryId: null,
    assessmentAccessCode: null,
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
