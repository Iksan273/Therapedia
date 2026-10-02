// Konfigurasi runtime dari environment Vite (file .env / .env.local, prefix VITE_).
// Satu-satunya tempat membaca import.meta.env; modul lain import dari sini.

export const ENV = {
  // "local" = data demo di localStorage (sekarang). "api" = Laravel API (fase integrasi).
  DATA_SOURCE: import.meta.env.VITE_DATA_SOURCE || "local",
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1",
  API_TIMEOUT_MS: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 15000,
  IS_DEV: import.meta.env.DEV,
};

export const isApiMode = () => ENV.DATA_SOURCE === "api";
