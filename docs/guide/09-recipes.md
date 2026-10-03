# 09 — Resep Perubahan Umum

Setiap resep diakhiri **Verifikasi**. Minimal (di `frontend/`): `npm run lint` (0 error), `npm test`, `npm run build`, lalu cek manual role terkait lewat `/roles` (termasuk lebar mobile).

## 1. Tambah halaman di modul ber-role
1. Buat `frontend/src/features/<modul>/pages/<NamaHalaman>.js`; sub-komponen di `features/<modul>/components/<sub>/`.
2. `app/router/routes.js`: tambah `const X = lazy(() => import("@/features/<modul>/pages/<NamaHalaman>"));` lalu entry di `PROTECTED_GROUPS[<grup>].children`: `{ path: "…", Component: X, module: "<module_rbac>" }`.
3. `app/layout/navConfig.js`: tambah item ke `NAV_CONFIG[role]` (`to`, `label`, `icon` lucide, `module`, `testid: "nav-<role>-<slug>"`). Untuk role kustom, tambahkan juga ke `CUSTOM_ROLE_ITEMS` bila modulnya baru.
4. Kontainer halaman `data-testid="<slug>-page"`; data per cabang pakai pola scoping (02).
5. Tambahkan path ke `CASES` di `src/app/__tests__/routes.smoke.test.js`.
6. **Verifikasi**: menu muncul hanya untuk role yang benar; URL langsung dengan role lain → `/roles`; smoke test lolos.

## 2. Tambah aksi / mutasi data
1. **Aturan** → fungsi pure di `domain/<entity>.js` + test di `domain/__tests__/`.
2. **Store** → `case "NAMA_AKSI"` di reducer `stores/<x>Store.js` yang memanggil fungsi domain; expose `const doX = (args) => dispatch({ type: "NAMA_AKSI", ...args })`.
3. **Lintas store?** → tambahkan ke hook use-case `features/<modul>/hooks/use<X>Actions.js` (buat bila belum ada). Hook mengembalikan hasil; toast di komponen.
4. **Jejak** → tidak ada audit log (ADR 0004): pelaku cukup `updated_by`/`deleted_by` (backend); bila aksi perlu riwayat sendiri, pakai log khusus (`invoice.logs` untuk invoice, ledger untuk kredit).
5. **API** → tambah URL di `services/api/endpoints.js` dan baris di tabel `docs/guide/10-api-migration.md`.
6. **Verifikasi**: lakukan aksi, refresh (data persist), cek hasilnya di layar terkait, test hook bila lintas store (contoh `features/schedule/__tests__/useSessionActions.test.js`).

## 3. Tambah / ubah field data atau seed
1. Default aman di pembuat entity (mis. `makeInquiryClient` di `domain/client.js`).
2. Semua pembaca memakai fallback (`client.x ?? default`) — data lama di localStorage tidak punya field baru.
3. Seed: ubah `scripts/generate_demo_seed.py` / `src/data/*.seed.json`; tanggal relatif pakai pola `_xxxDaysAgo` (diproses `data/seedLoader.js`).
4. **Naikkan `SEED_VERSION`** di `data/seedRegistry.js` (`demo-YYYY-MM-vN`).
5. Perbarui `docs/guide/03-data-model.md` **dan** kolom padanannya di `schema.md` (pakai skill `database-design`).
6. **Verifikasi**: browser dengan data lama memuat seed baru tanpa crash.

## 4. Tambah modul RBAC / role sistem
- **Modul**: entry di `ACCESS_MODULES` + nilai tiap role di `DEFAULT_PERMISSIONS` (`domain/rbac.js`); pakai `module` di route (`routes.js`) dan menu (`navConfig.js`, termasuk `CUSTOM_ROLE_ITEMS`). Browser lama yang menyimpan `rbacPermissions` lama otomatis memakai nilai default untuk key baru (`withDefaultPermissions`), tanpa Reset Demo Data.
- **Role sistem baru**: `DEFAULT_ROLES` + `DEFAULT_PERMISSIONS` (`domain/rbac.js`), `NAV_CONFIG`, `roles` pada grup di `routes.js`, kartu di `features/auth/pages/RoleSelect.js`, preset di `features/auth/pages/Login.js`, seeder backend.
- **Verifikasi**: `/master/rbac` menampilkan modul/role; toggle permission menyembunyikan menu & memblokir halaman untuk role kustom.

## 5. Tambah status pipeline client
1. `PIPELINE_STATUSES` (+ `PIPELINE_FLOW` bila bagian alur maju) di `domain/client.js`; label di `STATUS_META` (`domain/status.js`).
2. Kolom di `STAGE_COLUMNS` (`features/inquiry/components/pipeline/pipelineConfig.js`).
3. Transisi: handler di `ClientDetailInquiry.js` / `useClientOutcomeActions`; transisi otomatis lewat `advanceStatus`.
4. KPI/funnel di `features/inquiry/components/dashboard/*` & `features/master/pages/BranchPerformance.js`.
5. Enum `clients.status` + `client_status_histories.trigger` di `schema.md`.
6. **Verifikasi**: test `advanceStatus` diperbarui; client bisa dipindah dan muncul di kolom & dashboard.

## 6. Tambah layanan, kuadran, atau paket
Lewat UI: layanan, kuadran, alasan cancel & alasan discharge di `/admin-inquiry/master-data`, paket di `/finance` tab Packages. Default seed: `INTAKE_SERVICES` (`domain/client.js`), `SEED_QUADRANTS` (`stores/masterDataStore.js`), `credits.seed.json.masterPackages`.

## 7. Ubah aturan bisnis kredit / jadwal
1. Ubah fungsi di `domain/credit.js` / `domain/schedule.js` dan test-nya terlebih dulu.
2. Sesuaikan teks toast di komponen yang menjelaskan aturan (mis. `SessionDetailModal`: "Kuota cancel wajar (n/`CANCEL_QUOTA`)").
3. Perbarui `docs/guide/05`, `schema.md` §06 (alur transaksi backend harus identik).
4. **Verifikasi**: `npm test`, lalu complete/cancel sesi client seed dan cek `/admin-schedule/clients/:id`.

## 8. Feature A butuh komponen/hook dari feature B
Export di `features/B/index.js`, import `from "@/features/B"`. Jangan import `@/features/B/components/...` (ESLint error).

## 9. Menyiapkan satu store untuk API
Ikuti skill `react-architecture` §3: implementasi Provider memakai react-query + `api.*`/`ENDPOINTS`, interface value tetap; hook use-case diganti satu mutation ke endpoint transaksional. Aktifkan dengan `VITE_DATA_SOURCE=api` (`config/env.js`, `isApiMode()`).
