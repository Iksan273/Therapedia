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
export const checkQuestionnaireAccess = ({ client, codeItem, invoices = [], now = new Date() }) => {
  if (isQuestionnaireCodeFilled(client, codeItem)) return { ok: false, reason: "submitted" };
  if (isQuestionnaireCodeExpired(codeItem, now)) return { ok: false, reason: "expired" };
  const invoice = assessmentInvoiceNeedingProof(invoices, codeItem?.code);
  if (invoice) return { ok: false, reason: "proof_required", invoice };
  return { ok: true };
};

// Tautan kuesioner yang dikirim admin ke ortu: membuka /assessment dengan kode terisi otomatis.
export const buildQuestionnaireLink = (code, origin = "") =>
  `${String(origin).replace(/\/$/, "")}/assessment?code=${encodeURIComponent(String(code || "").trim().toUpperCase())}`;
