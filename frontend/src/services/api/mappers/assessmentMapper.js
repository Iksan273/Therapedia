// Pemetaan payload API M5 (kuesioner) ↔ bentuk yang dipakai frontend. Respons sudah camelCase (interceptor httpClient); request
// dikonversi ke snake_case oleh interceptor yang sama.
//
// Bentuk frontend dipertahankan agar halaman & domain tidak berubah:
// - kategori: `categoryName` (= name), `typeCode`, `respondentProfile`; id server dijadikan STRING
// - section: `sectionId` (= id), `template` (= resultTemplate), `documentUrl`; soal: `type` (= questionType), `required` (= isRequired),
//   `scaleMin/Max`, `minLabel/maxLabel`. Urutan = posisi array (server mengirim terurut `sort_order`).
// - jawaban: nilai mentah per tipe (string / angka / array) ↔ kawat `{ t, v }` (`v` hanya checkbox_multi).
// - struktur snapshot server (kuesioner yang sudah mulai diisi / selesai) memakai bentuk kategori yang sama (`structureToCategory`).

const str = (v) => (v === null || v === undefined ? null : String(v));

const RANGE_DEFAULTS = { min: 1, max: 5, minLabel: "Sangat Rendah / Jarang", maxLabel: "Sangat Tinggi / Sering" };
const SCALE_DEFAULTS = { min: 0, max: 5, minLabel: "Tidak Berlaku", maxLabel: "Hampir Selalu" };

// ---- Soal
export const questionFromApi = (q) => {
  const type = q.questionType || "scale_0_5";
  const d = type === "range" ? RANGE_DEFAULTS : SCALE_DEFAULTS;
  return {
    id: String(q.id),
    itemNo: q.itemNo,
    question: q.question,
    type,
    options: Array.isArray(q.options) ? q.options : [],
    scaleMin: q.rangeMin ?? d.min,
    scaleMax: q.rangeMax ?? d.max,
    minLabel: q.rangeMinLabel || d.minLabel,
    maxLabel: q.rangeMaxLabel || d.maxLabel,
    required: q.isRequired !== false,
  };
};

// Form dialog soal (`payload` di AssessmentMasterData) → body. Kolom yang tidak relevan dikosongkan server.
export const questionToApi = (p) => ({
  question: p.question,
  questionType: p.type || "scale_0_5",
  options: Array.isArray(p.options) && p.options.length > 0 ? p.options : null,
  rangeMin: p.type === "range" || p.type === "scale_0_5" ? Number(p.scaleMin ?? 0) : null,
  rangeMax: p.type === "range" || p.type === "scale_0_5" ? Number(p.scaleMax ?? 5) : null,
  rangeMinLabel: p.type === "range" || p.type === "scale_0_5" ? p.minLabel || null : null,
  rangeMaxLabel: p.type === "range" || p.type === "scale_0_5" ? p.maxLabel || null : null,
  isRequired: p.required !== false,
});

// ---- Section
export const sectionFromApi = (s) => ({
  sectionId: String(s.id),
  title: s.title,
  description: s.description || "",
  documentUrl: s.documentUrl || "",
  documentName: s.documentName || null,
  documentSize: s.documentSize ?? null,
  hasDocumentFile: Boolean(s.hasDocumentFile),
  template: s.resultTemplate || null,
  sortOrder: s.sortOrder ?? 0,
  questions: Array.isArray(s.questions) ? s.questions.map(questionFromApi) : [],
});

export const sectionToApi = (f) => ({
  title: f.title,
  description: f.description || null,
  documentUrl: f.documentUrl || null,
  resultTemplate: f.template || null,
});

// ---- Kategori
// Daftar (tanpa section): ringkasan jumlah dari server. Detail (`sections` ada): pohon lengkap.
export const categoryFromApi = (c) => ({
  id: String(c.id),
  typeCode: c.typeCode,
  categoryName: c.name,
  domain: c.domain || "",
  respondentProfile: c.respondentProfile || "parent",
  active: c.isActive !== false,
  version: c.version ?? 1,
  sectionCount: c.sectionCount ?? null,
  questionCount: c.questionCount ?? null,
  templateSectionCount: c.templateSectionCount ?? null,
  fillingCount: c.fillingCount ?? 0,
  ...(Array.isArray(c.sections) ? { sections: c.sections.map(sectionFromApi) } : {}),
});

export const categoryCreateToApi = (f) => ({
  typeCode: f.typeCode,
  name: f.categoryName,
  domain: f.domain || null,
  respondentProfile: f.respondentProfile || "parent",
});

export const categoryUpdateToApi = (patch, version) => ({
  version,
  ...(patch.categoryName !== undefined ? { name: patch.categoryName } : {}),
  ...(patch.domain !== undefined ? { domain: patch.domain || null } : {}),
  ...(patch.respondentProfile !== undefined ? { respondentProfile: patch.respondentProfile } : {}),
});

// Snapshot struktur dari server (`structure`) → kategori bentuk FE (dipakai form ortu & halaman hasil).
export const structureToCategory = (structure) => ({
  ...categoryFromApi({ ...structure.category, name: structure.category.name, sections: undefined }),
  respondentFields: structure.category.respondentFields || [],
  sections: (structure.sections || []).map(sectionFromApi),
});

// ---- Jawaban
const questionIndex = (category) => {
  const map = {};
  (category?.sections || []).forEach((s) => (s.questions || []).forEach((q) => (map[q.id] = q)));
  return map;
};

// Nilai mentah FE → kawat `{ t, v? }`; `null` (hapus jawaban) tetap null.
export const answerToApi = (value) => {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return { t: "", v: value.map(String) };
  return { t: String(value) };
};

export const answersPatchToApi = (patch = {}) => Object.fromEntries(Object.entries(patch).map(([id, v]) => [id, answerToApi(v)]));

// Kawat `{ t, v }` → nilai mentah FE sesuai tipe soal (`category` = bentuk FE dengan section & soal).
export const answersFromApi = (map = {}, category = null) => {
  const index = questionIndex(category);
  return Object.fromEntries(
    Object.entries(map || {}).map(([id, a]) => {
      const type = index[id]?.type;
      if (type === "checkbox_multi") return [id, Array.isArray(a?.v) ? a.v : []];
      if (type === "range") return [id, a?.t === "" || a?.t == null ? undefined : Number(a.t)];
      return [id, a?.t ?? ""];
    })
  );
};

// Draft server → draft FE `{ answers, respondent, answeredCount, lastSectionId, consentAt, version, startedAt }`
export const draftFromApi = (d, category) =>
  d
    ? {
        answers: answersFromApi(d.answers, category),
        respondent: d.respondent || {},
        answeredCount: d.answeredCount ?? 0,
        lastSectionId: str(d.lastSectionId),
        consentAt: d.consentAt ?? null,
        version: d.version ?? 1,
        startedAt: d.startedAt ?? null,
      }
    : null;

// ---- Kode kuesioner (bentuk `client.assessmentCodes[]` FE)
export const codeFromApi = (c) => ({
  id: String(c.id),
  code: c.code,
  categoryId: String(c.categoryId),
  categoryName: c.category?.name || "Kuesioner",
  name: c.category?.name || "Kuesioner",
  typeCode: c.category?.typeCode || null,
  status: c.status === "submitted" ? "submitted" : "issued",
  invoiceRequired: Boolean(c.invoiceRequired),
  issuedAt: c.issuedAt || null,
  expiresAt: c.expiresAt || null,
  submittedAt: c.submittedAt || null,
  hasDraft: Boolean(c.hasDraft),
  answeredCount: c.answeredCount ?? 0,
  questionCount: c.questionCount ?? 0,
  draftStartedAt: c.draftStartedAt || null,
  // Invoice asesmen otomatis dari server (ringkasan; modul Finance penuh menyusul)
  invoice: c.invoice
    ? { id: String(c.invoice.id), invoiceNumber: c.invoice.invoiceNumber, status: c.invoice.status, amount: c.invoice.amount, packageName: c.invoice.packageName, proofUploadCount: c.invoice.proofUploadCount ?? 0, type: "assessment", assessmentCode: c.code, createdAt: c.issuedAt || null }
    : null,
  client: c.client ? { id: String(c.client.id), clientCode: c.client.clientCode, clientName: c.client.childName } : null,
});

export const codeIssueToApi = ({ categoryId, validityDays = null, withInvoice = true, masterPackageId = null }) => ({
  categoryId: Number(categoryId),
  validityDays: validityDays || null,
  withInvoice,
  ...(withInvoice && masterPackageId ? { masterPackageId: Number(masterPackageId) } : {}),
});

// ---- Hasil (bentuk entri `client.assessmentAnswers[]` FE). `structure` = snapshot beku (bukan master terbaru).
export const resultFromApi = (r) => {
  const category = structureToCategory(r.structure);
  const questions = {};
  category.sections.forEach((s) => s.questions.forEach((q) => (questions[q.id] = { q, s })));
  return {
    code: r.code,
    categoryId: String(r.category?.id ?? category.id),
    categoryName: r.category?.name || category.categoryName,
    submittedAt: r.submittedAt,
    consentAt: r.consentAt,
    respondent: r.respondent || null,
    structure: category,
    answers: (r.answers || []).map((a) => {
      const found = questions[String(a.questionId)];
      return {
        questionId: String(a.questionId),
        itemNo: a.itemNo,
        sectionId: found?.s.sectionId || null,
        template: found?.s.template || null,
        domain: found?.s.title || "Umum",
        question: found?.q.question || "",
        answer: a.answerText,
        answerValues: a.answerValues || null,
        score: a.score ?? null,
      };
    }),
  };
};
