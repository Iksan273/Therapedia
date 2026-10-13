// Domain RBAC: modul akses, role sistem, dan matriks permission default.
// Acuan untuk tabel roles & policy middleware Laravel (lihat docs/guide/02 & 10).

export const ACCESS_MODULES = [
  { key: "revenue", label: "Dashboard Revenue", desc: "Akses omzet & analitik finansial all-branch", category: "Financial" },
  { key: "branch_performance", label: "Performa Inquiry All-Branch", desc: "Performa inquiry & intake seluruh cabang (KPI, tren, konversi, drop-off)", category: "Financial" },
  { key: "inquiry_pipeline", label: "Inquiry Pipeline", desc: "Intake client baru & kanban pipeline", category: "Inquiry" },
  { key: "inquiry_dashboard", label: "Inquiry Dashboard", desc: "Ringkasan statistik & KPI inquiry", category: "Inquiry" },
  { key: "assessment_master", label: "Assessment Master Data", desc: "Mesin kuesioner: kategori, section, dan soal asesmen", category: "Inquiry" },
  { key: "inquiry_master_data", label: "Master Layanan & Kuadran", desc: "Master layanan, kuadran sensori, alasan Cancel / Off (termasuk Therapist Off), dan alasan Discharge", category: "Inquiry" },
  { key: "weekly_calendar", label: "Weekly Calendar", desc: "Manajemen timetable mingguan & booking slot", category: "Scheduling" },
  { key: "schedule_dashboard", label: "Schedule Dashboard", desc: "Ringkasan statistik & KPI penjadwalan", category: "Scheduling" },
  { key: "active_clients", label: "Active Client", desc: "Roster client aktif & Birthday Hub", category: "Scheduling" },
  { key: "finance", label: "Finance & Invoices", desc: "Verifikasi transfer, input tagihan, & renewal", category: "Financial" },
  { key: "user_management", label: "User Management", desc: "Kelola akun staff dan lokasi cabang", category: "Administration" },
  { key: "branch_master", label: "Master Cabang", desc: "Kelola data cabang klinik (tambah, ubah, aktif/nonaktif)", category: "Administration" },
  { key: "rbac", label: "RBAC", desc: "Konfigurasi hak akses role & modul sistem", category: "Administration" },
  { key: "therapist_module", label: "Therapist Module", desc: "Sesi klinis, activity log & homework terapis", category: "Clinical" },
  { key: "unreported_reports", label: "Monitoring Laporan Sesi", desc: "Daftar sesi completed yang laporannya belum diisi", category: "Scheduling" },
  { key: "holidays", label: "Hari Libur", desc: "Pengaturan tanggal libur (dilewati jadwal berulang, tidak bisa dipilih di kalender)", category: "Scheduling" },
  { key: "therapist_utilization", label: "Utilisasi Terapis", desc: "Jam kerja terapis serta Availability & Utilization Rate per terapis dan cabang", category: "Scheduling" },
];

export const DEFAULT_ROLES = [
  {
    id: "master",
    label: "Master Director",
    badge: "Headquarter",
    isSystem: true,
    description: "Akses penuh tanpa batas ke seluruh modul operasional sistem",
  },
  {
    id: "manager",
    label: "Branch Manager",
    badge: "Manajemen Cabang",
    isSystem: true,
    description: "Supervisi omzet, pipeline, kalender, dan client cabang",
  },
  {
    id: "admin_inquiry",
    label: "Admin Inquiry",
    badge: "Intake & Asesmen",
    isSystem: true,
    description: "Fokus pada penerimaan client baru, pipeline, dan data asesmen",
  },
  {
    id: "admin_schedule",
    label: "Admin Schedule",
    badge: "Timetable & Roster",
    isSystem: true,
    description: "Pengelolaan kalender mingguan, roster client aktif, & slot",
  },
  {
    id: "finance",
    label: "Role Finance",
    badge: "Billing & Verifikasi",
    isSystem: true,
    description: "Verifikasi pembayaran, penerbitan invoice, & data client",
  },
  {
    id: "therapist",
    label: "Therapist",
    badge: "Praktisi Klinis",
    isSystem: true,
    description: "Akses ke jadwal klinik mandiri dan ringkasan dokumentasi terapis",
  },
];

export const DEFAULT_PERMISSIONS = {
  master: {
    revenue: true,
    branch_performance: true,
    inquiry_pipeline: true,
    inquiry_dashboard: true,
    assessment_master: true,
    inquiry_master_data: true,
    weekly_calendar: true,
    schedule_dashboard: true,
    active_clients: true,
    finance: true,
    user_management: true,
    branch_master: true,
    rbac: true,
    therapist_module: true,
    unreported_reports: true,
    holidays: true,
    therapist_utilization: true,
    inquiry: true,
    schedule: true,
    therapist: true,
  },
  manager: {
    revenue: true,
    branch_performance: false,
    inquiry_pipeline: true,
    inquiry_dashboard: true,
    assessment_master: false,
    inquiry_master_data: false,
    weekly_calendar: true,
    schedule_dashboard: true,
    active_clients: true,
    finance: false,
    user_management: false,
    branch_master: false,
    rbac: false,
    therapist_module: false,
    unreported_reports: true,
    holidays: false,
    therapist_utilization: true,
    inquiry: true,
    schedule: true,
    therapist: false,
  },
  admin_inquiry: {
    revenue: false,
    branch_performance: false,
    inquiry_pipeline: true,
    inquiry_dashboard: true,
    assessment_master: true,
    inquiry_master_data: true,
    weekly_calendar: false,
    schedule_dashboard: false,
    active_clients: false,
    finance: false,
    user_management: false,
    branch_master: false,
    rbac: false,
    therapist_module: false,
    unreported_reports: false,
    holidays: false,
    therapist_utilization: false,
    inquiry: true,
    schedule: false,
    therapist: false,
  },
  admin_schedule: {
    revenue: false,
    branch_performance: false,
    inquiry_pipeline: false,
    inquiry_dashboard: false,
    assessment_master: false,
    inquiry_master_data: false,
    weekly_calendar: true,
    schedule_dashboard: true,
    active_clients: true,
    finance: false,
    user_management: false,
    branch_master: false,
    rbac: false,
    therapist_module: false,
    unreported_reports: true,
    holidays: true,
    therapist_utilization: true,
    inquiry: false,
    schedule: true,
    therapist: false,
  },
  finance: {
    revenue: true,
    branch_performance: false,
    inquiry_pipeline: false,
    inquiry_dashboard: false,
    assessment_master: false,
    inquiry_master_data: false,
    weekly_calendar: false,
    schedule_dashboard: false,
    active_clients: true,
    finance: true,
    user_management: false,
    branch_master: false,
    rbac: false,
    therapist_module: false,
    unreported_reports: false,
    holidays: false,
    therapist_utilization: false,
    inquiry: false,
    schedule: false,
    therapist: false,
  },
  therapist: {
    revenue: false,
    branch_performance: false,
    inquiry_pipeline: false,
    inquiry_dashboard: false,
    assessment_master: false,
    inquiry_master_data: false,
    weekly_calendar: false,
    schedule_dashboard: false,
    active_clients: false,
    finance: false,
    user_management: false,
    branch_master: false,
    rbac: false,
    therapist_module: true,
    unreported_reports: false,
    holidays: false,
    therapist_utilization: false,
    inquiry: false,
    schedule: false,
    therapist: true,
  },
};

// Role bawaan sistem (punya route & menu khusus). Role lain = role kustom buatan Master.
export const SYSTEM_ROLE_IDS = [...DEFAULT_ROLES.map((r) => r.id), "client"];
export const isSystemRole = (roleId) => SYSTEM_ROLE_IDS.includes(roleId);

// Key modul lama yang masih ada di data tersimpan → dipetakan ke gabungan key modul baru
const LEGACY_MODULE_KEYS = {
  inquiry: ["inquiry_pipeline", "inquiry_dashboard", "inquiry"],
  schedule: ["weekly_calendar", "schedule_dashboard", "schedule"],
  therapist: ["therapist_module", "therapist"],
};

// Cek permission murni (tanpa React). Master selalu boleh.
export function roleHasPermission(roleId, permissions, moduleKey) {
  if (!roleId) return false;
  if (roleId === "master") return true;
  const stored = permissions?.[roleId];
  const defaults = DEFAULT_PERMISSIONS[roleId] || {};
  const keys = LEGACY_MODULE_KEYS[moduleKey] || [moduleKey];
  // Key yang belum pernah disimpan (modul baru) memakai nilai default role
  return keys.some((k) => Boolean(stored && k in stored ? stored[k] : defaults[k]));
}

// Matriks permission efektif: nilai tersimpan + default role untuk key yang belum pernah disimpan (modul baru)
export function withDefaultPermissions(permissions = {}) {
  const roleIds = new Set([...Object.keys(DEFAULT_PERMISSIONS), ...Object.keys(permissions || {})]);
  return Object.fromEntries([...roleIds].map((id) => [id, { ...(DEFAULT_PERMISSIONS[id] || {}), ...(permissions?.[id] || {}) }]));
}

// ---- Hapus data (keputusan klien, direvisi 13 Okt 2026) ----
// Tanpa flag per role. Dua tingkat:
//  - Hapus data PENTING (client inquiry/aktif, cabang; ikut menghapus seluruh data turunannya): `masterOnly`, hanya role `master`.
//  - Hapus operasional (invoice belum lunas, sesi, jadwal rutin, libur, master data, kode kuesioner): cukup akses modul terkait.
export const canDeleteIn = ({ roleId, permissions, moduleKey, masterOnly = false }) => {
  if (!roleId) return false;
  if (roleId === "master") return true;
  if (masterOnly) return false;
  return roleHasPermission(roleId, permissions, moduleKey);
};

// ---- Matriks izin dari server (mode API) ----
// Login/`me` membawa matriks `{ kode_modul: boolean }` (snake_case, sama dengan `access_modules.code`). Master selalu boleh.
// Key modul lama (inquiry/schedule/therapist) dipetakan ke gabungan key baru, sama seperti `roleHasPermission`.
export function permissionMapAllows(roleId, permissionMap, moduleKey) {
  if (!roleId) return false;
  if (roleId === "master") return true;
  const keys = LEGACY_MODULE_KEYS[moduleKey] || [moduleKey];
  return keys.some((k) => Boolean(permissionMap?.[k]));
}
