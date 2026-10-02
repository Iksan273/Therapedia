import { hasPersisted, removePersisted } from "@/services/storage/localStore";

// Seed demo (~270 KB) hanya diunduh bila ada data yang belum tersimpan di localStorage.
// Pengguna yang sudah punya data tidak perlu memuat chunk seed sama sekali.
const SEEDED_KEYS = ["clients", "schedules", "credits", "therapists", "assessment_categories", "audit_logs"];

// Naikkan nilai ini setiap kali data seed berubah. Browser yang menyimpan seed versi lama akan
// otomatis memakai seed baru (hanya data domain; akun, RBAC, dan master layanan/kuadran tidak disentuh).
const SEED_VERSION = "demo-2026-10-v3";
const VERSION_KEY = "therapedia_seed_version";

let loader = null;

function resetStaleSeedData() {
  try {
    if (window.localStorage.getItem(VERSION_KEY) === SEED_VERSION) return;
    SEEDED_KEYS.forEach(removePersisted);
    window.localStorage.setItem(VERSION_KEY, SEED_VERSION);
  } catch {
    // storage tidak tersedia: abaikan
  }
}

export async function ensureSeedsIfNeeded() {
  resetStaleSeedData();
  if (SEEDED_KEYS.every(hasPersisted)) return;
  loader = await import("@/data/seedLoader");
}

// Dipanggil oleh initializer state saat localStorage kosong; bootstrap di index.js menjamin loader sudah ada.
export function getSeedLoader() {
  if (!loader) throw new Error("Seed belum dimuat: jalankan ensureSeedsIfNeeded() sebelum render.");
  return loader;
}
