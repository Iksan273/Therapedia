// Pemetaan payload API M4 (client) ↔ bentuk client yang dipakai frontend (nama field mode demo dipertahankan agar kartu/halaman
// lama tetap bekerja). Respons sudah camelCase karena interceptor httpClient; request dikonversi ke snake_case oleh interceptor yang sama.
//
// Beda nama: `child_name` → clientName, `date_of_birth` → dob, `parent_phone` → parentContact, `service_codes` → serviceTypes,
// `gdrive_links[]` → gdriveClientLink (link pertama; FE lama satu link) + gdriveLinks. Id server dijadikan STRING.
// Field turunan dari server (tidak disimpan di FE): `creditBalance`, `frozen`.

const str = (v) => (v === null || v === undefined ? null : String(v));

export const clientFromApi = (c) => {
  const serviceTypes = Array.isArray(c.serviceCodes) ? c.serviceCodes : [];
  const gdriveLinks = Array.isArray(c.gdriveLinks) ? c.gdriveLinks.map((d) => ({ id: String(d.id), url: d.url, label: d.label || "" })) : [];
  return {
    id: String(c.id),
    clientCode: c.clientCode,
    branchId: str(c.branchId),
    clientName: c.childName,
    gender: c.gender || "male",
    dob: c.dateOfBirth || "",
    parentName: c.parentName || "",
    parentContact: c.parentPhone || "",
    parentEmail: c.parentEmail || "",
    address: c.address || "",
    intakeNote: c.intakeNote || null,
    status: c.status,
    finalOutcome: c.finalOutcome ?? null,
    statusChangedAt: c.statusChangedAt ?? null,
    dateOfJoin: c.dateOfJoin ?? null,
    dateOfDischarge: c.dateOfDischarge ?? null,
    dateOfDiscontinue: c.dateOfDiscontinue ?? null,
    dischargeReason: c.dischargeReason ?? null,
    dischargeNote: c.dischargeNote ?? null,
    serviceTypes,
    serviceType: serviceTypes[0] || "",
    gdriveLinks,
    gdriveClientLink: gdriveLinks[0]?.url || "",
    creditBalance: c.creditBalance ?? 0,
    frozen: Boolean(c.frozen),
    // Belum terintegrasi (M5): kuesioner, invoice ringkas
    assessmentCodes: [],
    assessmentAnswers: [],
    invoice: null,
    version: c.version ?? 1,
    createdAt: c.createdAt || null,
    updatedAt: c.createdAt || null,
  };
};

// Form New Intake (create) → body `POST /clients`. Cabang hanya dipakai master/akun semua cabang (staf ber-cabang dipaksa server).
export const clientCreateToApi = (form) => ({
  branchId: form.branchId ? Number(form.branchId) : undefined,
  childName: String(form.clientName || "").trim(),
  gender: form.gender || "male",
  dateOfBirth: form.dob,
  parentName: String(form.parentName || "").trim(),
  parentPhone: String(form.parentContact || "").trim(),
  parentEmail: String(form.parentEmail || "").trim() || undefined,
  address: String(form.address || "").trim() || undefined,
  intakeNote: String(form.intakeNote || "").trim() || undefined,
});

// Form Edit Intake → body `PATCH /clients/{id}` (+ version). Cabang dan kode client tidak bisa diubah.
export const clientUpdateToApi = (form, version) => ({
  version,
  childName: String(form.clientName || "").trim(),
  gender: form.gender,
  dateOfBirth: form.dob,
  parentName: String(form.parentName || "").trim(),
  parentPhone: String(form.parentContact || "").trim(),
  parentEmail: String(form.parentEmail || "").trim() || null,
  intakeNote: String(form.intakeNote || "").trim() || null,
});

// Perubahan status → body `POST /clients/{id}/transition`
export const transitionToApi = (toStatus, version, { reason, note } = {}) => ({
  toStatus,
  version,
  reason: String(reason || "").trim() || undefined,
  note: String(note || "").trim() || undefined,
});
