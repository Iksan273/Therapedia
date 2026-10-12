# Therapedia Landing

Landing page marketing Therapedia Developmental Center (dua bahasa ID/EN). Project Vite + React **mandiri**, di-deploy terpisah dari aplikasi klinik (`../frontend`). Tidak ada kode yang dibagi antar-project.

## Commands
```bash
cd landing
npm install
npm run dev      # http://localhost:3001
npm test         # Vitest (smoke + pergantian bahasa)
npm run lint
npm run build    # keluaran di dist/
```

## Environment
Salin `.env.example` ke `.env.local`.

| Variabel | Fungsi |
|---|---|
| `VITE_APP_URL` | URL aplikasi klinik (`frontend/`). Tujuan tombol "Buka Aplikasi", Login Staf, dan Kuesioner Asesmen (`src/lib/appNav.js`) |

Sebaliknya, `frontend/` membuka landing lewat `VITE_LANDING_URL` (tombol "Go to Landing Page" di `/`).

## Struktur `src/`
```
pages/Home.js          komposisi section
components/Landing*.js Header, Hero, WhyUs, Programs, Team, Branches, Knowledge, Contact, Footer
data/                  landingData.js (Inggris, sumber) · landingDataId.js (terjemahan Indonesia, kunci = id item)
i18n/                  LanguageContext (useLang, L(en, id), key localStorage landing_lang) · LanguageToggle
config/env.js          satu-satunya pembaca import.meta.env
lib/appNav.js          goToApp(path): navigasi penuh ke aplikasi klinik
```

## Deploy
Vercel: root directory `landing/`, build `vite build`, output `dist` (lihat `vercel.json`). Set `VITE_APP_URL` ke URL produksi aplikasi klinik.
