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

// Invoice assessment yang belum dibayar memblokir akses kuesioner ortu (invoice dibuat Finance, jenis "assessment").
export const UNPAID_INVOICE_STATUSES = ["unpaid", "pending_verification", "rejected"];

export const hasPendingAssessmentInvoice = (invoices = []) =>
  invoices.some((i) => i.type === "assessment" && UNPAID_INVOICE_STATUSES.includes(i.status || "unpaid"));

// Hasil akses kode kuesioner oleh ortu: { ok } atau { ok:false, reason: submitted | expired | invoice_unpaid }.
export const checkQuestionnaireAccess = ({ client, codeItem, invoices = [], now = new Date() }) => {
  if (isQuestionnaireCodeFilled(client, codeItem)) return { ok: false, reason: "submitted" };
  if (isQuestionnaireCodeExpired(codeItem, now)) return { ok: false, reason: "expired" };
  if (hasPendingAssessmentInvoice(invoices)) return { ok: false, reason: "invoice_unpaid" };
  return { ok: true };
};
