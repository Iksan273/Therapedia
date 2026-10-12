# 0006 — Frontend dan backend satu stack Docker, satu origin
- Status: Diterima
- Tanggal: 2026-10-12

## Konteks
Rencana awal: frontend di Vercel, backend Laravel di VPS (origin berbeda, butuh CORS dan dua hostname). Product owner ingin satu paket yang bisa dijalankan lokal dan di-deploy otomatis ke VPS lewat satu `git push`.

## Keputusan
1. Image **`web`** (Nginx) berisi hasil build frontend (stage `node` di `docker/php/Dockerfile`) dan melayani SPA di `/`; `/api/*` dan `/up` diteruskan ke PHP-FPM (container `app`). Konfigurasi: `docker/nginx/prod.conf` (dev tetap `default.conf`, API saja).
2. **Satu origin, satu hostname** → tanpa CORS; API dipanggil lewat path relatif `/api/v1` (`VITE_API_BASE_URL`).
3. `VITE_*` ditanam saat build; CI mengambilnya dari GitHub Variables. Mode data demo (`VITE_DATA_SOURCE=local`) tetap default sampai integrasi API selesai.
4. CI/CD: test backend (MySQL) + lint/test frontend → build `therapedia-app` dan `therapedia-web` → GHCR → SSH ke VPS (`deploy.sh`). MySQL memakai image resmi dan volume, tidak dibangun CI.
5. Tanpa scheduler dan tanpa queue worker; tugas terjadwal (bila nanti ada) lewat cron VPS.
6. `landing/` tetap project terpisah. `frontend/vercel.json` dibiarkan sebagai opsi.

## Konsekuensi
- Setiap perubahan `frontend/` memicu build ulang image `web` (cache layer npm mempercepat).
- Cloudflare tidak boleh meng-cache `/api/*`; `/assets/*` aman di-cache.
