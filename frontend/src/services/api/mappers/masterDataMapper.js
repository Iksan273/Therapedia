// Pemetaan payload API M3 (layanan, alasan, master paket, hari libur) ↔ bentuk yang dipakai frontend. Respons sudah
// camelCase (interceptor httpClient); request dikonversi ke snake_case oleh interceptor yang sama.
//
// Bentuk frontend dipertahankan agar halaman & domain tidak berubah:
// - layanan / alasan: kunci `value` (= `code` di server) dan `active` (= `is_active`)
// - paket: `id` = `code` internal server (`pkg-reguler`), sama dengan `packageId` di data kredit/invoice; id angka di `serverId`
// - hari libur: `id` string, `date` yyyy-MM-dd, `branchId` string|null

const str = (v) => (v === null || v === undefined ? null : String(v));

// ---- Layanan intake
export const serviceFromApi = (s) => ({
  value: s.code,
  label: s.label,
  category: s.category || "",
  description: s.description || "",
  active: Boolean(s.isActive),
  sortOrder: s.sortOrder ?? 0,
  // Pemakaian layanan TIDAK ikut daftar (mahal di jutaan client); server menolak hapus layanan terpakai (409 in_use).
});

// `code` hanya dikirim saat tambah (server melarang mengubah kode)
// Hanya field yang diisi yang dikirim, jadi patch parsial (mis. saklar aktif) tidak menimpa field lain.
const pick = (item, keys) => Object.fromEntries(keys.filter((k) => item[k] !== undefined).map((k) => [k, item[k]]));

export const serviceToApi = (item, { create = false } = {}) => ({
  ...(create ? { code: item.value } : {}),
  ...pick(item, ["label", "category", "description"]),
  ...(item.active === undefined ? {} : { isActive: Boolean(item.active) }),
});

// ---- Alasan Cancel/Off (`therapistOff`) dan Discharge
export const reasonFromApi = (r) => ({
  value: r.code,
  label: r.label,
  active: Boolean(r.isActive),
  therapistOff: Boolean(r.isTherapistOff),
  sortOrder: r.sortOrder ?? 0,
});

// `withTherapistOff`: hanya alasan Cancel/Off yang punya penanda Therapist Off
export const reasonToApi = (item, { create = false, withTherapistOff = false } = {}) => ({
  ...(create ? { code: item.value } : {}),
  ...(item.label === undefined ? {} : { label: item.label }),
  ...(item.active === undefined ? {} : { isActive: Boolean(item.active) }),
  ...(withTherapistOff && item.therapistOff !== undefined ? { isTherapistOff: Boolean(item.therapistOff) } : {}),
});

// ---- Master paket
export const packageFromApi = (p) => ({
  id: p.code,
  serverId: String(p.id),
  invoiceCode: p.invoiceCode,
  name: p.name,
  credits: p.credits,
  price: p.price,
  description: p.description || "",
  leaveQuota: p.leaveQuota ?? 0,
  isSatuan: Boolean(p.isSatuan),
  isAssessment: Boolean(p.isAssessment),
  isActive: Boolean(p.isActive),
});

export const packageToApi = (form) => ({
  name: form.name,
  invoiceCode: form.invoiceCode,
  credits: form.credits,
  price: form.price,
  description: form.description ?? "",
  leaveQuota: form.leaveQuota,
  isSatuan: Boolean(form.isSatuan),
  isAssessment: Boolean(form.isAssessment),
});

// ---- Hari libur
export const holidayFromApi = (h) => ({
  id: String(h.id),
  date: h.holidayDate,
  name: h.name,
  branchId: str(h.branchId),
  // Jumlah sesi terjadwal di tanggal itu; hanya ada di respons tambah/ubah
  ...(h.affectedSessions === undefined ? {} : { affectedSessions: h.affectedSessions }),
});

// Satu tanggal → `holidayDate`; rentang → `startDate`..`endDate`. `branchId` kosong/"all" = semua cabang (null).
export const holidayToApi = ({ date, endDate, name, branchId }, { create = false } = {}) => {
  const range = create && endDate && endDate !== date;
  return {
    name: String(name || "").trim(),
    branchId: !branchId || branchId === "all" ? null : Number(branchId),
    ...(range ? { startDate: date, endDate } : { holidayDate: date }),
  };
};
