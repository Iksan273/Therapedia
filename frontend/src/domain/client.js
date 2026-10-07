import { uid, nowIso, todayStr } from "@/shared/lib/id";

// Domain client: tahap pipeline, layanan, alasan discharge, dan factory client baru.

export const PIPELINE_STATUSES = [
  "inquiry",
  "service_selected",
  "assessment_scheduled",
  "assessment_done",
  "admitted",
  "done_consult",
  "done_assessment",
  "discontinued",
  "discharged",
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

// Active Client Roster: client yang sedang terapi + yang sudah keluar (discharged / discontinued).
export const isActiveClient = (client) =>
  (client?.status === "admitted" || client?.status === "active") && !client?.dateOfDischarge;

// Hanya client yang sudah keluar yang boleh diaktifkan kembali.
export const canReactivateClient = (client) => client?.status === "discharged" || client?.status === "discontinued";

export const ROSTER_STATUS_FILTERS = [
  { value: "all", label: "Semua Status" },
  { value: "active", label: "Active" },
  { value: "discharged", label: "Discharged" },
  { value: "discontinued", label: "Discontinued" },
];

// Client masuk roster bila active, discharged, atau discontinued.
export const isRosterClient = (client) => isActiveClient(client) || canReactivateClient(client);

// Cocokkan client dengan nilai filter status roster (`ROSTER_STATUS_FILTERS`).
export const matchesRosterStatus = (client, filter) => {
  if (filter === "all") return isRosterClient(client);
  if (filter === "active") return isActiveClient(client);
  return client?.status === filter;
};

// Patch untuk menjadikan client Active (admit pertama kali maupun reaktivasi). Tanggal bergabung
// asal dipertahankan; data discharge dikosongkan. Pure: `today` dikirim dari pemanggil.
export const buildActivationPatch = (client, today) => ({
  status: "admitted",
  finalOutcome: "admitted",
  dateOfJoin: client?.dateOfJoin || today,
  dateOfDischarge: null,
  dateOfDiscontinue: null,
  dischargeReason: null,
  dischargeNote: null,
});

// Perubahan status MANUAL ke tahap pipeline mana pun (maju maupun mundur): koreksi outcome yang salah, kembali ke tahap
// awal, reaktivasi. Transisi otomatis tetap hanya maju (`advanceStatus`). Pure: `today` dikirim dari pemanggil.
//   admitted → aktivasi; done_consult / done_assessment → outcome; discontinued → `dateOfDiscontinue`;
//   discharged → `dateOfDischarge` (+ alasan); tahap awal → outcome & data keluar dikosongkan.
const CLEAR_EXIT_PATCH = { dateOfDischarge: null, dateOfDiscontinue: null, dischargeReason: null, dischargeNote: null };

export const buildStatusChangePatch = (client, toStatus, today, { reason, note } = {}) => {
  switch (toStatus) {
    case "admitted":
      return buildActivationPatch(client, today);
    case "done_consult":
    case "done_assessment":
      return { status: toStatus, finalOutcome: toStatus, ...CLEAR_EXIT_PATCH };
    case "discontinued":
      return { status: toStatus, finalOutcome: "discontinued", ...CLEAR_EXIT_PATCH, dateOfDiscontinue: today, dischargeReason: "other", dischargeNote: (reason || note || "").trim() || null };
    case "discharged":
      return { status: toStatus, ...CLEAR_EXIT_PATCH, dateOfDischarge: today, dischargeReason: (reason || "").trim() || null, dischargeNote: note?.trim() || null };
    default:
      return { status: toStatus, finalOutcome: null, ...CLEAR_EXIT_PATCH };
  }
};

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

// Seed pilihan cepat alasan discharge (bisa diubah di Master Data). `dischargeReason` di client adalah STRING:
// `value` pilihan cepat atau teks bebas yang diketik user, tanpa relasi ke daftar ini.
export const DEFAULT_DISCHARGE_REASONS = [
  { value: "moving", label: "Moving / Relocation" },
  { value: "financial", label: "Financial / Biaya" },
  { value: "conflict_schedule", label: "Schedule Conflict / Bentrok" },
  { value: "expectation_not_met", label: "Expectation Not Met" },
  { value: "graduate", label: "Tercapai Target (Graduated)" },
];

// Kode lama (discontinue otomatis memakai "other" + catatan); tetap terbaca di data lama.
const LEGACY_DISCHARGE_LABELS = { other: "Lainnya" };

// `list` = daftar pilihan cepat dari Master Data. Tidak ditemukan → string apa adanya (teks custom).
export const dischargeReasonLabel = (value, list = DEFAULT_DISCHARGE_REASONS) => {
  const found = list.find((r) => r.value === value);
  return found ? found.label : LEGACY_DISCHARGE_LABELS[value] || value || "—";
};

// Statistik discharge untuk dashboard Inquiry: total client berstatus `discharged` dan pembagiannya per alasan (urut terbanyak).
// Discontinue (batal sebelum admitted) TIDAK dihitung; walau juga mengisi `dischargeReason`, ia punya log sendiri.
// `list` = pilihan alasan dari Master Data; alasan kosong dikelompokkan sebagai "Tanpa alasan".
export function dischargeStats(clients = [], list = DEFAULT_DISCHARGE_REASONS) {
  const discharged = clients.filter((c) => c.status === "discharged");
  const byReason = new Map();
  discharged.forEach((c) => {
    const key = String(c.dischargeReason || "").trim() || "__none";
    byReason.set(key, (byReason.get(key) || 0) + 1);
  });
  const total = discharged.length;
  const rows = [...byReason.entries()]
    .map(([key, count]) => ({
      key,
      label: key === "__none" ? "Tanpa alasan" : dischargeReasonLabel(key, list),
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return { total, rows };
}

// Kode kuesioner sudah diisi ortu? Kode baru punya `status` ("issued" | "submitted"); kode lama (seed) tanpa status
// dianggap terisi bila sudah ada jawaban untuk kategorinya. Kode yang belum diisi boleh dihapus.
export const isQuestionnaireCodeFilled = (client, codeItem) => {
  if (codeItem?.status) return codeItem.status === "submitted" || codeItem.status === "completed";
  return (client?.assessmentAnswers || []).some((a) => a.categoryId === codeItem?.categoryId);
};

// Kode client = grup 2 huruf dari HURUF PERTAMA nama + "-" + 5 digit counter per grup (global lintas cabang).
// Grup: A–E = AE, F–J = FJ, K–O = KO, P–T = PT, U–Z = UZ. Contoh: "Kenzo" → KO-00001, "Ayla" → AE-00001.
// Kode juga dipakai login portal ortu (bersama tanggal lahir anak) dan tidak berubah walau nama diedit.
export const CLIENT_CODE_GROUPS = ["AE", "FJ", "KO", "PT", "UZ"];

const CLIENT_CODE_PATTERN = /^([A-Z]{2})-(\d{5})$/;

export const clientCodeGroup = (name) => {
  const letters = String(name || "")
    .normalize("NFD")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  const first = letters.charCodeAt(0);
  if (Number.isNaN(first)) return CLIENT_CODE_GROUPS[0];
  return CLIENT_CODE_GROUPS[Math.min(Math.floor((first - 65) / 5), CLIENT_CODE_GROUPS.length - 1)];
};

// `existingCodes` = semua kode client yang sudah ada (termasuk yang sudah dihapus bila ada). Counter = angka terbesar
// pada grup yang sama + 1 (backend: tabel `client_code_counters`, schema.md §04-C).
export const nextClientCode = (name, existingCodes = []) => {
  const group = clientCodeGroup(name);
  let max = 0;
  existingCodes.forEach((code) => {
    const m = CLIENT_CODE_PATTERN.exec(String(code || "").toUpperCase());
    if (m && m[1] === group) max = Math.max(max, Number(m[2]));
  });
  return `${group}-${String(max + 1).padStart(5, "0")}`;
};

// Pencarian client: AWAL nama anak, AWAL nama orang tua (per kata, mis. "Ken" → Kenzo Wirawan; "Wir" juga cocok), atau awal
// kode client (case-insensitive). Backend: prefix `LIKE 'abc%'` pada `child_name`, `parent_name`, `client_code` (schema.md Q5).
const startsWithWord = (text, q) =>
  String(text || "")
    .toLowerCase()
    .split(/\s+/)
    .some((w) => w.startsWith(q));

export const matchesClientSearch = (client, query) => {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  return (
    startsWithWord(client?.clientName, q) ||
    startsWithWord(client?.parentName, q) ||
    String(client?.clientCode || "").toLowerCase().startsWith(q)
  );
};

// `existingCodes` = kode client yang sudah ada (untuk counter per grup).
export function makeInquiryClient(form, existingCodes = []) {
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
    intakeNote: (form.intakeNote || "").trim() || null,
    gdriveClientLink: null,
    invoice: null,
    dateOfJoin: null,
    dateOfDischarge: null,
    dateOfDiscontinue: null,
    finalOutcome: null,
    dischargeReason: null,
    dischargeNote: null,
    clientCode: nextClientCode(form.clientName, existingCodes),
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
