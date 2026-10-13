// Pemetaan payload API auth → state `auth` frontend (lapisan anti-korupsi: bentuk respons API hanya dikenal di `services/`,
// bukan di `domain/`). Respons `POST /auth/login` | `/auth/client-login` | `GET /auth/me` sudah camelCase karena
// interceptor httpClient (konversi key otomatis, satu-satunya mekanisme).
//
// Konvensi kontrak: key objek = nama field saja. Data (kode modul, id) tidak pernah jadi key, jadi `permissions` dari
// server berupa DAFTAR kode modul (`["finance", "active_clients"]`) dan kode itu utuh karena berada di nilai, bukan key.

// Daftar kode modul → peta `{ kode_modul: true }` untuk `auth.permissions` (dibaca `permissionMapAllows`).
export const permissionsFromList = (codes) => Object.fromEntries((Array.isArray(codes) ? codes : []).map((code) => [code, true]));

// `data.user` dari login/me staf → bentuk state `auth`. `therapistId` memakai id akun terapis.
export const staffSessionToAuth = (user) => ({
  role: user.role.code,
  userId: user.id,
  staffName: user.name,
  email: user.email,
  branchId: user.branchId ?? null,
  branchName: user.branch?.name ?? null,
  therapistId: user.role.code === "therapist" ? String(user.id) : null,
  clientId: null,
  mustChangePassword: Boolean(user.mustChangePassword),
  permissions: permissionsFromList(user.permissions),
});

// `data.client` dari login/me ortu → bentuk state `auth`.
export const clientSessionToAuth = (client) => ({
  role: "client",
  userId: null,
  staffName: null,
  email: null,
  branchId: client.branchId ?? null,
  branchName: client.branch?.name ?? null,
  therapistId: null,
  clientId: client.id,
  clientCode: client.clientCode,
  childName: client.childName,
  mustChangePassword: false,
  permissions: null,
});
