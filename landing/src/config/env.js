// Konfigurasi runtime dari environment Vite (file .env / .env.local, prefix VITE_).
// Satu-satunya tempat membaca import.meta.env di project landing.

export const ENV = {
  // URL aplikasi klinik (project `frontend/`) tempat tombol "Buka Aplikasi" / kuesioner mengarah.
  APP_URL: (import.meta.env.VITE_APP_URL || "http://localhost:3000").replace(/\/+$/, ""),
};
