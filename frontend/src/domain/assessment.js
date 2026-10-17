import { isQuestionnaireCodeFilled } from "@/domain/client";

// Domain asesmen: kode kuesioner publik (kode jenis asesmen + suffix acak), masa berlaku opsional, dan
// aturan akses ortu (sekali isi, kedaluwarsa). Pure: waktu & random dikirim dari pemanggil bila perlu.

const SUFFIX_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa 0/O/1/I
export const QUESTIONNAIRE_SUFFIX_LENGTH = 6;
export const DEFAULT_TYPE_CODE = "ASM";

// Pilihan masa berlaku saat generate kode: null = tanpa masa berlaku.
export const CODE_VALIDITY_OPTIONS = [
  { value: "none", label: "Tanpa masa berlaku", days: null },
  { value: "7", label: "7 hari", days: 7 },
  { value: "14", label: "14 hari", days: 14 },
  { value: "30", label: "30 hari", days: 30 },
];

// Kode jenis asesmen: huruf/angka kapital, maks 10 karakter (kolom `assessment_categories.type_code`).
export const normalizeTypeCode = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);

// Kode jenis untuk salinan template: `{kode}C`, `{kode}C2`, ... (maks 10 karakter) yang belum dipakai.
export const suggestCopyTypeCode = (typeCode, existing = []) => {
  const taken = new Set((existing || []).map(normalizeTypeCode));
  const base = normalizeTypeCode(typeCode) || DEFAULT_TYPE_CODE;
  for (let n = 1; n < 1000; n += 1) {
    const suffix = n === 1 ? "C" : `C${n}`;
    const code = `${base.slice(0, 10 - suffix.length)}${suffix}`;
    if (!taken.has(code)) return code;
  }
  return `${base.slice(0, 6)}${Date.now().toString(36).toUpperCase().slice(-4)}`;
};

// Nama salinan: "{nama} (Salinan)", "(Salinan 2)", ... yang belum dipakai.
export const suggestCopyName = (name, existing = []) => {
  const taken = new Set((existing || []).map((n) => String(n || "").trim().toLowerCase()));
  const base = String(name || "Template").replace(/\s*\(Salinan(?: \d+)?\)\s*$/i, "").trim();
  for (let n = 1; n < 1000; n += 1) {
    const candidate = n === 1 ? `${base} (Salinan)` : `${base} (Salinan ${n})`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${base} (Salinan)`;
};

// Urutan id setelah `id` dipindah `delta` posisi (−1 naik, +1 turun); di luar batas = tidak berubah.
export const moveId = (ids, id, delta) => {
  const from = ids.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
};

// Urutan id setelah `id` dijatuhkan ke posisi `targetId` (drag & drop).
export const moveIdTo = (ids, id, targetId) => {
  const from = ids.indexOf(id);
  const to = ids.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) return ids;
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
};

// Kategori lama tanpa `typeCode` memakai awalan umum "ASM".
export const categoryTypeCode = (category) => normalizeTypeCode(category?.typeCode) || DEFAULT_TYPE_CODE;

// Kode kuesioner = `{typeCode}-{suffix acak}`; diulang bila bentrok dengan kode yang sudah ada.
export const buildQuestionnaireCode = (category, existingCodes = [], rand = Math.random) => {
  const prefix = categoryTypeCode(category);
  const taken = new Set((existingCodes || []).map((c) => String(c || "").toUpperCase()));
  for (let attempt = 0; attempt < 50; attempt += 1) {
    let suffix = "";
    for (let i = 0; i < QUESTIONNAIRE_SUFFIX_LENGTH; i += 1) suffix += SUFFIX_CHARS[Math.floor(rand() * SUFFIX_CHARS.length)];
    const code = `${prefix}-${suffix}`;
    if (!taken.has(code)) return code;
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-QUESTIONNAIRE_SUFFIX_LENGTH)}`;
};

// Kode `typeCode` kategori harus unik (abaikan kategori yang sedang diedit).
export const isTypeCodeTaken = (categories, typeCode, ignoreId = null) => {
  const code = normalizeTypeCode(typeCode);
  return (categories || []).some((c) => c.id !== ignoreId && normalizeTypeCode(c.typeCode) === code);
};

// Batas berlaku: `days` null/0 → tanpa masa berlaku (null). Hasil ISO.
export const buildExpiresAt = (days, now = new Date()) => {
  const n = Number(days);
  if (!n || n < 0) return null;
  return new Date(now.getTime() + n * 24 * 60 * 60 * 1000).toISOString();
};

// Kedaluwarsa dicek saat kode dibuka (bukan oleh job harian).
export const isQuestionnaireCodeExpired = (codeItem, now = new Date()) =>
  Boolean(codeItem?.expiresAt) && new Date(codeItem.expiresAt).getTime() < now.getTime();

// Invoice assessment terbit otomatis saat kode kuesioner dibuat (`assessmentCode` = kode pemicunya). Sebelum membuka
// kuesioner, ortu WAJIB mengunggah bukti transfer (cukup terunggah; lunas diverifikasi Finance terpisah).
// Invoice lama tanpa `assessmentCode` (dibuat manual oleh Finance) berlaku untuk semua kode client itu.
const hasProof = (inv) => Number(inv?.proofUploadCount) > 0 || Boolean(inv?.proofUrl || inv?.proofOfPaymentUrl);

// Invoice assessment yang masih menuntut bukti transfer untuk `code`; null bila tidak ada.
export const assessmentInvoiceNeedingProof = (invoices = [], code) =>
  invoices.find(
    (i) =>
      i.type === "assessment" &&
      i.status !== "paid" &&
      i.status !== "void" &&
      (!i.assessmentCode || String(i.assessmentCode).toUpperCase() === String(code || "").toUpperCase()) &&
      !hasProof(i)
  ) || null;

// Hasil akses kode kuesioner oleh ortu: { ok } atau { ok:false, reason: submitted | expired | proof_required, invoice? }.
export const checkQuestionnaireAccess = ({ client, codeItem, invoices = [], now = new Date(), draft = null }) => {
  if (isQuestionnaireCodeFilled(client, codeItem)) return { ok: false, reason: "submitted" };
  // Kode kedaluwarsa tetap boleh diselesaikan bila draft dimulai sebelum `expiresAt`.
  if (isQuestionnaireCodeExpired(codeItem, now) && !canFinishExpiredWithDraft(codeItem, draft)) return { ok: false, reason: "expired" };
  const invoice = assessmentInvoiceNeedingProof(invoices, codeItem?.code);
  if (invoice) return { ok: false, reason: "proof_required", invoice };
  return { ok: true };
};

// Tautan kuesioner yang dikirim admin ke ortu: membuka /assessment dengan kode terisi otomatis.
export const buildQuestionnaireLink = (code, origin = "") =>
  `${String(origin).replace(/\/$/, "")}/assessment?code=${encodeURIComponent(String(code || "").trim().toUpperCase())}`;

// Daftar kuesioner client untuk asesor ("Pilih Kuesioner" di laporan hasil): satu opsi per KODE yang diterbitkan, lengkap dengan
// jawabannya bila sudah diisi. Jawaban baru menyimpan `code`; jawaban lama (tanpa `code`) dipasangkan ke kode sekategori yang
// sudah terisi. Jawaban tanpa kode yang cocok tetap tampil (key `ans-{indeks}`).
// Mengembalikan [{ key, code, categoryId, categoryName, filled, issuedAt, submittedAt, entry }] urut penerbitan.
export function listQuestionnaireResults(client) {
  const answers = client?.assessmentAnswers || [];
  const used = new Set();
  const same = (a, b) => String(a || "").toUpperCase() === String(b || "").toUpperCase();
  const codes = client?.assessmentCodes || [];

  const options = codes.map((c) => {
    const filled = isQuestionnaireCodeFilled(client, c);
    let idx = answers.findIndex((a, i) => !used.has(i) && a.code && same(a.code, c.code));
    if (idx === -1 && filled) idx = answers.findIndex((a, i) => !used.has(i) && !a.code && a.categoryId === c.categoryId);
    if (idx !== -1) used.add(idx);
    const entry = idx !== -1 ? answers[idx] : null;
    return {
      key: c.code,
      code: c.code,
      categoryId: c.categoryId,
      categoryName: c.name || c.categoryName || entry?.categoryName || "Kuesioner",
      filled: Boolean(entry),
      issuedAt: c.issuedAt || c.createdAt || null,
      submittedAt: entry?.submittedAt || c.submittedAt || null,
      entry,
    };
  });

  answers.forEach((a, i) => {
    if (used.has(i)) return;
    options.push({ key: `ans-${i}`, code: a.code || null, categoryId: a.categoryId, categoryName: a.categoryName || "Kuesioner", filled: true, issuedAt: null, submittedAt: a.submittedAt || null, entry: a });
  });
  return options;
}

// ---- Draft kuesioner (simpan otomatis / lanjutkan; schema.md `assessment_drafts`) ----
// Kuesioner bisa 200+ soal: jawaban disimpan sebagai draft per KODE dan dilanjutkan dengan kode yang sama.
// Draft bukan hasil: tidak dibaca laporan/dashboard dan tidak mengubah status client. Dihapus saat submit.

// Jawaban terisi? (teks kosong / array kosong / null = belum). Angka 0 tetap terisi.
export const isAnswerFilled = (val) => {
  if (val === undefined || val === null) return false;
  if (Array.isArray(val)) return val.length > 0;
  return String(val).trim().length > 0;
};

export const countAnswered = (questionIds = [], answers = {}) => questionIds.filter((id) => isAnswerFilled(answers[id])).length;

// ---- Soal wajib / opsional (schema.md `assessment_questions.is_required`) ----
// Soal lama / seed lama tanpa `required` tetap wajib; hanya `required: false` yang opsional.
export const isQuestionRequired = (q) => q?.required !== false;

export const requiredQuestions = (questions = []) => questions.filter(isQuestionRequired);

// Soal WAJIB yang belum terjawab (dipakai validasi kirim, filter "belum diisi", dan lompat ke soal kosong).
export const unansweredRequired = (questions = [], answers = {}) =>
  questions.filter((q) => isQuestionRequired(q) && !isAnswerFilled(answers[q.id]));

// Progres pengisian: hanya soal wajib yang menentukan 100%; soal opsional yang diisi tidak menambah penyebut.
export const requiredProgress = (questions = [], answers = {}) => {
  const required = requiredQuestions(questions);
  const answered = required.filter((q) => isAnswerFilled(answers[q.id])).length;
  return { answered, total: required.length, percent: required.length > 0 ? Math.round((answered / required.length) * 100) : 100 };
};

// ---- Dokumen section (kesepakatan dll.): link Google Docs / Drive ditampilkan di layar lewat iframe ----
// Hanya host Google yang diizinkan (cegah iframe ke domain sembarang). `/edit`, `/view`, dan parameter lain diubah ke bentuk
// yang boleh di-embed: `/preview` (dokumen harus dibagikan "Siapa saja yang memiliki link"). null = tidak valid / bukan Google.
const DOC_ID = "[\\w-]{10,}";
const DOCS_PUBLISHED = new RegExp(`^/document/d/e/(${DOC_ID})`);
const DOCS_DOCUMENT = new RegExp(`^/document/d/(${DOC_ID})`);
const DRIVE_FILE = new RegExp(`^/file/d/(${DOC_ID})`);

export const toDocumentEmbedUrl = (url) => {
  let parsed;
  try {
    parsed = new URL(String(url || "").trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  const path = parsed.pathname;
  if (parsed.hostname === "docs.google.com") {
    const published = path.match(DOCS_PUBLISHED);
    if (published) return `https://docs.google.com/document/d/e/${published[1]}/pub?embedded=true`;
    const doc = path.match(DOCS_DOCUMENT);
    if (doc) return `https://docs.google.com/document/d/${doc[1]}/preview`;
    return null;
  }
  if (parsed.hostname === "drive.google.com") {
    const file = path.match(DRIVE_FILE);
    if (file) return `https://drive.google.com/file/d/${file[1]}/preview`;
  }
  return null;
};

// PDF yang disimpan di aplikasi sendiri (`public/documents/*.pdf`), dirender per halaman lewat pdf.js (bukan iframe),
// sehingga pas lebar layar & bisa di-scroll di HP. Hanya path same-origin (tanpa `..`), bukan URL luar (CORS & keamanan).
const LOCAL_PDF = /^\/documents\/[\w.-]+\.pdf$/i;
export const isLocalPdfUrl = (url) => LOCAL_PDF.test(String(url || "").trim());

// Link boleh dikosongkan (section tanpa dokumen); bila diisi harus link Google yang bisa di-embed atau PDF lokal.
export const isValidDocumentUrl = (url) => toDocumentEmbedUrl(url) !== null || isLocalPdfUrl(url);

// Jumlah soal sebuah kategori (bentuk bersarang `sections[].questions[]` atau datar `questions[]`).
// Jumlah soal kategori: dari pohon bila dimuat; kategori ringkas dari server (mode API, tanpa section) memakai `questionCount`.
export const countCategoryQuestions = (category) => {
  if (!category) return 0;
  if (Array.isArray(category.sections) && category.sections.length > 0) {
    return category.sections.reduce((n, sec) => n + (sec.questions || []).length, 0);
  }
  if (typeof category.questionCount === "number") return category.questionCount;
  return (category.questions || []).length;
};

// Jumlah section / domain kategori (pohon bila dimuat, kalau tidak `sectionCount` dari server).
export const countCategorySections = (category) => {
  if (!category) return 0;
  if (Array.isArray(category.sections) && category.sections.length > 0) return category.sections.length;
  if (typeof category.sectionCount === "number") return category.sectionCount;
  return category.domain ? 1 : category.questions?.length ? 1 : 0;
};

// Selisih jawaban sebagai PATCH (nilai null = jawaban dihapus). Dikirim apa adanya ke `PUT /public/assessments/{code}/draft`.
export const diffAnswers = (prev = {}, next = {}) => {
  const patch = {};
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  Object.keys(next).forEach((id) => {
    if (isAnswerFilled(next[id]) && !same(prev[id], next[id])) patch[id] = next[id];
    if (!isAnswerFilled(next[id]) && isAnswerFilled(prev[id])) patch[id] = null;
  });
  Object.keys(prev).forEach((id) => {
    if (!(id in next) && isAnswerFilled(prev[id])) patch[id] = null;
  });
  return patch;
};

// ---- Langkah bawaan "Data Pengisi" (profil per kategori; padanan backend `AssessmentRespondent`) ----
// Profil kategori: `parent` (orang tua), `teacher` (guru / pendamping School Companion), `none` (tanpa langkah; kategori yang
// sudah punya section pengisi sendiri, mis. KON/TDL). Nama dan tanggal lahir anak tidak ditanya ulang (dari kode client).
export const RESPONDENT_PROFILES = [
  { value: "parent", label: "Orang tua", hint: "Nama pengisi, hubungan dengan anak, HP, email" },
  { value: "teacher", label: "Guru / pendamping sekolah", hint: "Nama guru, peran, sekolah, kelas, HP, email (School Companion)" },
  { value: "none", label: "Tanpa langkah Data Pengisi", hint: "Gunakan bila kuesioner sudah punya section pengisi sendiri" },
];

const REL_PARENT = ["Ayah", "Ibu", "Wali", "Lainnya"];
const REL_TEACHER = ["Guru kelas", "Guru pendamping", "Lainnya"];

export const RESPONDENT_FIELDS = {
  parent: [
    { key: "name", label: "Nama yang mengisi", required: true, max: 150, autoComplete: "name" },
    { key: "relation", label: "Hubungan dengan anak", required: true, max: 50, options: REL_PARENT },
    { key: "phone", label: "Nomor HP", required: false, max: 30, inputMode: "tel", autoComplete: "tel" },
    { key: "email", label: "Email", required: false, max: 150, inputMode: "email", autoComplete: "email" },
  ],
  teacher: [
    { key: "name", label: "Nama guru / pendamping", required: true, max: 150, autoComplete: "name" },
    { key: "relation", label: "Peran", required: true, max: 50, options: REL_TEACHER },
    { key: "school", label: "Nama sekolah", required: true, max: 150 },
    { key: "class", label: "Kelas", required: true, max: 50 },
    { key: "phone", label: "Nomor HP", required: false, max: 30, inputMode: "tel", autoComplete: "tel" },
    { key: "email", label: "Email", required: false, max: 150, inputMode: "email", autoComplete: "email" },
  ],
};

// Kategori tanpa `respondentProfile` (data lama / kustom lokal) = tanpa langkah, agar alur lama tidak berubah.
export const respondentProfileOf = (category) => (RESPONDENT_FIELDS[category?.respondentProfile] ? category.respondentProfile : "none");

export const respondentFields = (profile) => RESPONDENT_FIELDS[profile] || [];

// Bersihkan nilai: hanya key profil, trim, kosong dibuang.
export const cleanRespondent = (profile, values = {}) => {
  const out = {};
  respondentFields(profile).forEach((f) => {
    const v = String(values?.[f.key] ?? "").trim().slice(0, f.max);
    if (v) out[f.key] = v;
  });
  return out;
};

// Key wajib yang belum terisi.
export const missingRespondentFields = (profile, values = {}) =>
  respondentFields(profile).filter((f) => f.required && !String(values?.[f.key] ?? "").trim()).map((f) => f.key);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{6,30}$/;

// Galat format per key (email / HP opsional tetapi bila diisi harus valid).
export const respondentFormatErrors = (profile, values = {}) => {
  const errors = {};
  const email = String(values?.email ?? "").trim();
  const phone = String(values?.phone ?? "").trim();
  if (respondentFields(profile).some((f) => f.key === "email") && email && !EMAIL_RE.test(email)) errors.email = "Format email tidak valid.";
  if (respondentFields(profile).some((f) => f.key === "phone") && phone && !PHONE_RE.test(phone)) errors.phone = "Format nomor HP tidak valid.";
  return errors;
};

// Selisih nilai Data Pengisi sebagai PATCH (null = dihapus), dikirim ke `PUT …/draft` bagian `respondent`.
export const diffRespondent = (prev = {}, next = {}) => {
  const patch = {};
  Object.keys(next).forEach((k) => {
    if (String(next[k] ?? "").trim() !== String(prev[k] ?? "").trim()) patch[k] = String(next[k] ?? "").trim() || null;
  });
  Object.keys(prev).forEach((k) => {
    if (!(k in next) && String(prev[k] ?? "").trim()) patch[k] = null;
  });
  return patch;
};

// Terapkan patch ke draft (pure). `respondent`: patch Data Pengisi (null = hapus; `respondentProfile` menyaring key). `validQuestionIds` (opsional): id di luar kategori dibuang. Draft baru dibuat bila belum ada.
// `consentAt`: undefined = tidak diubah; null = dicabut; string = waktu persetujuan.
export const applyDraftPatch = (draft, { code, clientId, answers = {}, respondent = {}, respondentProfile = null, validQuestionIds = null, lastSectionId, consentAt }, now) => {
  const base = draft || { code, clientId, answers: {}, respondent: {}, answeredCount: 0, lastSectionId: null, consentAt: null, version: 0, startedAt: now };
  const mergedRespondent = { ...(base.respondent || {}) };
  Object.keys(respondent || {}).forEach((k) => {
    if (respondent[k] === null || respondent[k] === "") delete mergedRespondent[k];
    else mergedRespondent[k] = respondent[k];
  });
  const respondentValues = respondentProfile ? cleanRespondent(respondentProfile, mergedRespondent) : mergedRespondent;
  const valid = validQuestionIds ? new Set(validQuestionIds.map(String)) : null;
  const merged = { ...base.answers };
  Object.keys(answers).forEach((id) => {
    if (valid && !valid.has(String(id))) return;
    if (!isAnswerFilled(answers[id])) delete merged[id];
    else merged[id] = answers[id];
  });
  const keptIds = Object.keys(merged).filter((id) => !valid || valid.has(String(id)));
  const clean = Object.fromEntries(keptIds.map((id) => [id, merged[id]]));
  return {
    ...base,
    answers: clean,
    respondent: respondentValues,
    answeredCount: keptIds.length,
    lastSectionId: lastSectionId !== undefined ? lastSectionId : base.lastSectionId,
    consentAt: consentAt !== undefined ? consentAt : base.consentAt,
    version: (base.version || 0) + 1,
    updatedAt: now,
  };
};

// Kode kedaluwarsa tetap boleh diselesaikan bila draft sudah dimulai sebelum `expiresAt` (keputusan 11 Okt 2026).
export const canFinishExpiredWithDraft = (codeItem, draft) =>
  Boolean(draft?.startedAt && codeItem?.expiresAt) && new Date(draft.startedAt).getTime() <= new Date(codeItem.expiresAt).getTime();

// Kode kuesioner boleh dihapus admin? Tidak bila sudah diisi (`filled`) atau SEDANG diisi / sudah punya draft (`draft`).
export const canDeleteQuestionnaireCode = (client, codeItem, draft = null) => {
  if (isQuestionnaireCodeFilled(client, codeItem)) return { ok: false, reason: "filled" };
  if (draft) return { ok: false, reason: "draft" };
  return { ok: true };
};

// Progres draft untuk bar & daftar "Menunggu Kuesioner": { answered, total, percent }.
export const draftProgress = (draft, total) => {
  const answered = draft?.answeredCount || 0;
  return { answered, total, percent: total > 0 ? Math.min(100, Math.round((answered / total) * 100)) : 0 };
};

// Jumlah draft aktif (kode sedang diisi) pada sebuah kategori — peringatan di Master Asesmen sebelum soal diubah.
export const countActiveDraftsForCategory = (clients = [], drafts = [], categoryId) => {
  const codes = new Set(
    clients.flatMap((c) => (c.assessmentCodes || []).filter((item) => item.categoryId === categoryId).map((item) => String(item.code).toUpperCase()))
  );
  return drafts.filter((d) => codes.has(String(d.code).toUpperCase())).length;
};
