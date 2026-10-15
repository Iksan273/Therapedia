// Pemetaan payload API M2 (cabang, terapis, akun staf, role) ↔ bentuk yang dipakai frontend. Respons sudah camelCase karena
// interceptor httpClient; request dikonversi ke snake_case oleh interceptor yang sama (satu format key, lihat docs/guide/10).
//
// Konvensi id: id entity dari server (angka) dijadikan STRING di frontend ("1"). Alasan: nilai Radix Select harus string,
// dan id lokal mode demo juga string ("branch-sby-timur"), jadi perbandingan `a.id === b.id` tetap konsisten.
// Kode role (`finance`, `therapist`, ...) tetap dipakai sebagai `id` role di frontend (sama dengan `auth.role`), id server
// disimpan di `serverId` untuk request.

const str = (v) => (v === null || v === undefined ? null : String(v));

// ---- Cabang
export const branchFromApi = (b) => ({
  id: String(b.id),
  code: b.code,
  name: b.name,
  city: b.city || "",
  address: b.address || "",
  phone: b.phone || "",
  isActive: Boolean(b.isActive),
  bankAccounts: (b.bankAccounts || []).map(bankAccountFromApi),
});

// ---- Rekening bank pembayaran cabang
export const bankAccountFromApi = (a) => ({
  id: String(a.id),
  bankName: a.bankName,
  accountNumber: a.accountNumber,
  accountHolder: a.accountHolder,
  isActive: Boolean(a.isActive),
  sortOrder: a.sortOrder ?? 0,
});

export const bankAccountToApi = (form) => ({
  bankName: String(form.bankName || "").trim(),
  accountNumber: String(form.accountNumber || "").trim(),
  accountHolder: String(form.accountHolder || "").trim(),
});

// Form cabang → body request (kode huruf besar; kosong dikirim sebagai "" agar server menjadikannya null/bawaan)
export const branchToApi = (form) => ({
  name: String(form.name || "").trim(),
  code: String(form.code || "").trim().toUpperCase(),
  city: String(form.city || "").trim(),
  address: String(form.address || "").trim(),
  phone: String(form.phone || "").trim(),
});

// Pratinjau dampak hapus cabang (`GET /branches/{id}/delete-impact`) → { clients, sessions, invoices, staff, holidays }
export const branchImpactFromApi = (data) => ({
  clients: data.impact?.clients ?? 0,
  sessions: data.impact?.schedules ?? 0,
  invoices: data.impact?.invoices ?? 0,
  staff: data.impact?.staff ?? 0,
  holidays: data.impact?.holidays ?? 0,
});

// ---- Terapis (daftar ringan untuk dropdown/penjadwalan)
export const therapistFromApi = (t) => ({
  id: String(t.id),
  name: t.name,
  title: t.title || "",
  specialty: t.specialty || "",
  branchId: str(t.branchId),
  maxSessionsPerMonth: t.maxSessionsPerMonth ?? null,
});

// ---- Akun staf (User Management)
export const staffUserFromApi = (u) => ({
  id: String(u.id),
  name: u.name,
  email: u.email,
  phone: u.phone || "",
  title: u.title || "",
  specialty: u.specialty || "",
  role: u.role?.code ?? null, // kode role (sama dengan `auth.role`)
  roleServerId: u.role ? String(u.role.id) : null,
  branchId: str(u.branchId),
  isActive: Boolean(u.isActive),
  mustChangePassword: Boolean(u.mustChangePassword),
  lastLoginAt: u.lastLoginAt || null,
});

// Form akun → body request. `roles` = daftar role frontend (untuk mencari id server dari kode role).
// `branchId` kosong/"all" = semua cabang (null); role master selalu null.
export const staffUserToApi = (form, roles = []) => {
  const role = roles.find((r) => r.id === form.role);
  const isMasterRole = form.role === "master";
  const body = {
    name: String(form.name || "").trim(),
    email: String(form.email || "").trim(),
    roleId: role?.serverId ? Number(role.serverId) : undefined,
    branchId: isMasterRole || !form.branchId || form.branchId === "all" ? null : Number(form.branchId),
    title: String(form.title || "").trim(),
    specialty: String(form.specialty || "").trim(),
  };
  return body;
};

// ---- Role & matriks izin
export const roleFromApi = (r) => ({
  id: r.code,
  serverId: String(r.id),
  label: r.name,
  badge: r.badge || "",
  description: r.description || "",
  isSystem: Boolean(r.isSystem),
  usersCount: r.usersCount ?? 0,
  permissions: Array.isArray(r.permissions) ? r.permissions : [],
});

// Daftar role → matriks `{ [kodeRole]: { [kodeModul]: boolean } }` (bentuk yang dibaca halaman RBAC). Semua modul punya nilai.
export const permissionMatrixFromRoles = (roles, moduleKeys) =>
  Object.fromEntries(
    roles.map((r) => {
      const allowed = new Set(r.permissions);
      return [r.id, Object.fromEntries(moduleKeys.map((key) => [key, r.id === "master" ? true : allowed.has(key)]))];
    })
  );

// Form role baru → body request. `initialPermissions` = peta modul → boolean; dikirim sebagai DAFTAR kode modul.
export const roleToApi = (form) => ({
  name: String(form.label || "").trim(),
  code: form.id ? String(form.id).trim() : undefined,
  badge: String(form.badge || "").trim(),
  description: String(form.description || "").trim(),
  permissions: Object.entries(form.initialPermissions || {})
    .filter(([, allowed]) => allowed)
    .map(([key]) => key),
});

// Daftar item izin untuk `PUT /roles/{id}/permissions` (array, bukan kamus berkunci kode modul)
export const permissionItem = (moduleKey, allowed) => ({ moduleCode: moduleKey, allowed: Boolean(allowed) });
