import { isApiMode } from "@/config/env";

// Modul yang BELUM tersambung ke backend (di luar cakupan M1–M5). Di mode API halamannya diganti penanda "Sedang dalam pengembangan"
// dan menunya diberi badge "Dev", supaya QA tidak mengira data demo sebagai data server. Mode demo tidak terpengaruh.
// Saat modul selesai disambungkan ke API: hapus path/tab-nya dari daftar ini (dan tambahkan tes lazy-fetch halamannya).
const DEV_PATTERNS = [
  "/admin-inquiry", // Inquiry Dashboard (exact): KPI masih dihitung dari cache 10 client; GET /dashboards/inquiry di backend belum diisi
  "/admin-inquiry/dashboard",
  "/master/revenue",
  "/master/branch-performance",
  "/manager/revenue",
  "/admin-schedule", // Schedule Dashboard (exact)
  "/admin-schedule/calendar",
  "/admin-schedule/clients/:id",
  "/admin-schedule/unreported-reports",
  "/admin-schedule/therapist-utilization",
  "/therapist",
  "/therapist/*",
  "/client",
  "/print/client/:id",
];

// Tab Finance yang sudah memakai API: Menunggu Pembayaran (invoice asesmen) dan Master Data Paket
export const FINANCE_TABS_READY = ["verification", "packages"];

const toRegex = (pattern) => new RegExp(`^${pattern.replace(/:[^/]+/g, "[^/]+").replace(/\*/g, ".*")}/?$`);
const DEV_REGEXES = DEV_PATTERNS.map(toRegex);

export const matchesDevPath = (path) => DEV_REGEXES.some((re) => re.test(String(path).split("?")[0]));
export const isUnderDevelopment = (path) => isApiMode() && matchesDevPath(path);
export const isFinanceTabUnderDevelopment = (tab) => isApiMode() && !FINANCE_TABS_READY.includes(tab);
