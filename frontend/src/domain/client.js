import { uid, nowIso, todayStr, genCode } from "@/shared/lib/id";

// Domain client: tahap pipeline, layanan, tag keluhan, alasan discharge, dan factory client baru.

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

// Alur utama pipeline (urut). Status hasil akhir (done_*, discontinued, discharged) di luar urutan ini.
export const PIPELINE_FLOW = ["inquiry", "service_selected", "assessment_scheduled", "assessment_done", "admitted"];

// Transisi otomatis hanya MAJU: status berubah ke `target` bila status sekarang ada di alur utama
// dan berada sebelum target. Status lain (hasil akhir / sudah lewat) dibiarkan.
export const advanceStatus = (current, target) => {
  const from = PIPELINE_FLOW.indexOf(current);
  const to = PIPELINE_FLOW.indexOf(target);
  return from !== -1 && to !== -1 && from < to ? target : current;
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
  { value: "b_ota", label: "BOT-A (Brief Occupational Therapy Assessment)", shortLabel: "BOT-A", fullLabel: "BOT-A (Brief Occupational Therapy Assessment)", category: "Asesmen", description: "Brief Occupational Therapy Assessment & Sensory Screening" },
  { value: "f_ota", label: "FOT-A (Full Occupational Therapy Assessment)", shortLabel: "FOT-A", fullLabel: "FOT-A (Full Occupational Therapy Assessment)", category: "Asesmen", description: "Full Occupational Therapy Comprehensive Assessment" },
  { value: "school_companion", label: "School Companion Profile", shortLabel: "School Companion", fullLabel: "School Companion Profile", category: "Asesmen", description: "Profil observasi anak di lingkungan sekolah (dapat dipilih bersama layanan lain)" },
  { value: "consult_wo_report", label: "Consultation without Report", shortLabel: "Consultation w/o Report", fullLabel: "Consultation without Report", category: "Konsultasi", description: "Konsultasi tatap muka evaluasi klinis tanpa laporan tertulis" },
  { value: "consult_w_report", label: "Consultation with written report", shortLabel: "Consultation w/ Report", fullLabel: "Consultation with written report", category: "Konsultasi", description: "Konsultasi klinis mendalam dengan laporan tertulis resmi" },
];

export const CLINICAL_SERVICES = INTAKE_SERVICES;

export const ASSESSMENT_SERVICES = INTAKE_SERVICES;

export const THERAPY_SERVICES = INTAKE_SERVICES;

export const SESSION_TYPES = INTAKE_SERVICES;

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

export function makeInquiryClient(form) {
  return {
    id: uid(),
    branchId: form.branchId || "branch-sby-timur",
    status: form.status || "inquiry",
    clientName: form.clientName.trim(),
    gender: form.gender || "male",
    parentName: form.parentName.trim(),
    parentContact: form.parentContact.trim(),
    parentEmail: (form.parentEmail || "").trim(),
    dob: form.dob || todayStr(),
    serviceType: form.serviceType || null,
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

// Daftar id layanan sebuah klien (mendukung multi-layanan dan data lama yang hanya punya serviceType)
export const getClientServiceIds = (client) => {
  if (!client) return [];
  if (Array.isArray(client.serviceTypes) && client.serviceTypes.length > 0) return client.serviceTypes;
  return client.serviceType ? [client.serviceType] : [];
};
