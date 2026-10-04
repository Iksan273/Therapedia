# Therapedia — One Gate Integrated Clinic System

Sistem operasional klinik tumbuh kembang anak **Therapedia Developmental Center** (multi-cabang Surabaya: East, Citraland, West). Mencakup intake & asesmen, penjadwalan terapi + kredit sesi, finance, portal terapis, portal orang tua, dan dashboard eksekutif.

## Status project
- **Sekarang**: frontend (React + Vite) di `frontend/`, arsitektur feature-based + domain layer. Data mode demo di **localStorage** (seed JSON); login = simulasi role. Lapisan HTTP untuk API sudah siap (`frontend/src/services/http`).
- **Berikutnya**: backend **Laravel 11 + MySQL 8 + Sanctum** (tanpa Redis dan tanpa queue/job async: cache/session driver `database`, semua proses sinkron) sesuai `schema.md` v2. Kode baru harus **siap API** (`docs/guide/10-api-migration.md`).
- Deploy frontend: Vercel (`frontend/vercel.json`).

## Peta repo
| Path | Isi |
|---|---|
| `frontend/` | Aplikasi React. Aturan teknisnya ada di bagian **Aturan teknis frontend** di bawah |
| `docs/guide/` | Panduan developer: arsitektur, alur bisnis, data model, resep, integrasi API |
| `docs/adr/` | Architecture Decision Records |
| `implementation_detail.md` | Rencana backend: API per modul + tabel yang dipakai tiap API (draf review) |
| `schema.md` | Desain database v2: 34 tabel domain (+1 fase akhir) + 7 view, indeks berbasis query, ledger kredit, **log invoice** (tanpa audit log) |
| `.claude/skills/` | Skill project: `design-architecture`, `react-architecture`, `database-design` |
| `PROJECT_CONTEXT_FOR_PROPOSAL_AI.md`, `docs/*.docx` | Dokumen bisnis/proposal: referensi scope fitur |
| `backend/`, `tests/`, `.emergent/`, `memory/`, `test_reports/` | **Legacy** platform Emergent. Abaikan |

## Commands
```bash
cd frontend
npm run dev      # http://localhost:3000
npm test         # Vitest: aturan domain, hook use-case, smoke semua route
npm run lint     # ESLint + batas lapisan (0 error)
npm run build    # wajib lolos sebelum menyatakan selesai
npm run gen:dark # buat ulang src/styles/dark-utilities.css (otomatis sebelum dev/build)
```
Masuk app: `/roles` → pilih role, atau kode client (mis. `AE-00006`) untuk portal ortu. Kuesioner publik: `/assessment` dengan kode kuesioner (mis. `ASM-2016` dari seed demo, atau yang diterbitkan: `{kode jenis}-{acak}`). Akun staf demo: email dari `/login` + password `Therapedia2026!`.

## Domain singkat
- **7 role**: `master`, `manager`, `admin_inquiry`, `admin_schedule`, `finance`, `therapist`, `client` (ortu) + role kustom (RBAC per modul).
- **Pipeline client**: `inquiry → service_selected → assessment_scheduled → assessment_done → admitted | done_consult | done_assessment | discontinued`; `admitted → discharged`. Transisi otomatis hanya maju; perubahan manual boleh ke tahap mana pun. Kode client `AE-00001` (grup huruf pertama nama + 5 digit; juga kode login ortu).
- **Sesi**: `scheduled → completed | cancelled | rescheduled | reschedule_pending`. Therapy completed −1 kredit. Cancel: admin memilih potong kredit atau tidak; kuota cancel 3 per **paket** (penghitung). Revert hanya 1x. Kredit 0 = **Frozen** (turunan, tidak disimpan).
- **Finance**: invoice → ortu upload bukti → Finance verifikasi → paket kredit baru. Konversi paket (Senior → Regular, otomatis/manual) → lebihan jadi saldo pemotong invoice berikutnya; log tiap invoice ada di invoice itu sendiri.
- **Jejak perubahan**: **tidak ada audit log** (ADR 0004). Semua modul memakai `created_by/updated_by`; log khusus hanya `credit_ledger`, `client_status_histories`, **`invoice_logs`** (log milik invoice), `package_conversions`.
- **Akses & hapus**: punya akses modul = boleh semua aksi kecuali hapus; tombol hapus hanya untuk role `can_delete`. **Hapus = permanen dengan cascade** (ADR 0005): hapus client/invoice/cabang menghapus semua data terkait; master ber-FK yang sudah dipakai tidak bisa dihapus. Keputusan klien lengkap + status implementasi: `docs/guide/12-keputusan-klien.md`.

## Skill — gunakan saat
| Skill | Kapan |
|---|---|
| `design-architecture` | Merancang fitur/modul baru, aturan bisnis lintas modul, menentukan letak kode, menulis ADR |
| `react-architecture` | Membuat/mengubah halaman, komponen, store, hook use-case, route; memindahkan store ke API |
| `database-design` | Menambah/mengubah tabel, kolom, indeks, migration, jejak perubahan, performa query, memperbarui `schema.md` |

## Aturan inti
1. Bahasa: UI, komentar kode, dan docs **bahasa Indonesia**; istilah teknis & operasional klinik boleh English.
2. Ikuti pola & lapisan yang ada (bagian **Aturan teknis frontend** di bawah). Cari dulu di `frontend/src/domain/`, `shared/`, dan `features/<m>/index.js` sebelum membuat yang baru.
3. Perubahan data/field/aturan bisnis → selaraskan **frontend `domain/` ↔ `schema.md` ↔ `docs/guide/10`** dalam perubahan yang sama.
4. **Jangan edit** dokumen proposal atau `.docx` kecuali diminta. `schema.md` hanya diubah lewat skill `database-design`.
5. Perubahan alur, route, atau aturan → **perbarui doc terkait di `docs/guide/`** dalam perubahan yang sama.
6. Bug di luar scope: jangan diperbaiki diam-diam. Catat di `docs/guide/11-known-issues.md` dan laporkan.
7. Verifikasi = `npm run lint` + `npm test` + `npm run build` lolos, lalu cek manual role terkait (termasuk mobile). Jangan klaim selesai tanpa itu.
8. Jangan commit/push kecuali diminta.

## Baca saat…
| Saat mengerjakan | Baca |
|---|---|
| Pertama kali / gambaran besar | `docs/guide/00-index.md`, `01-architecture.md`, `docs/adr/` |
| Route, menu, hak akses, cabang | `docs/guide/02-roles-routing-rbac.md` |
| Field data, seed, enum, modul domain | `docs/guide/03-data-model.md` |
| Intake, pipeline, kuesioner, hasil asesmen | `docs/guide/04-flow-inquiry-assessment.md` |
| Kalender, jadwal berulang, bentrok, kredit | `docs/guide/05-flow-schedule-credit.md` |
| Invoice, bukti bayar, renewal, paket | `docs/guide/06-flow-finance.md` |
| Portal terapis/ortu, dashboard, user & RBAC | `docs/guide/07-flow-portals-dashboards.md` |
| Membuat/mengubah UI | `docs/guide/08-ui-conventions.md` |
| Perubahan umum (halaman, field, role, status) | `docs/guide/09-recipes.md` |
| Integrasi backend / endpoint / nama field API | `docs/guide/10-api-migration.md` + `schema.md` |
| Desain DB, indeks, jejak perubahan | `schema.md` + skill `database-design` |
| Sebelum memperbaiki sesuatu yang "aneh" | `docs/guide/11-known-issues.md` |
| Keputusan klien / meeting 3 Okt 2026 + status implementasi frontend | `docs/guide/12-keputusan-klien.md`, `pertanyaan_klien.md` |

## Aturan teknis frontend
Berlaku untuk semua kode di `frontend/`. Detail alur di `docs/guide/`; pola lengkap: skill `react-architecture`; keputusan desain: skill `design-architecture`.

### Stack
React 19 · react-router-dom 7 · Vite 6 · Tailwind 3 + shadcn/Radix · sonner · recharts · date-fns · lucide-react · Vitest 3 · ESLint 8.
Siap untuk fase API: @tanstack/react-query (QueryClient terpasang), axios (`services/http`). Belum dipakai: swr, react-hook-form, zod — jangan dipakai tanpa ADR.

### Struktur `src/`
```
app/          App.js · providers/ · router/{routes,guards,AppRouter}.js · layout/{AppLayout,navConfig}.js
features/<m>/ pages/ · components/<sub>/ · hooks/use<X>Actions.js · index.js (public API) · __tests__/
              m = auth | landing | inquiry | assessment | schedule | finance | therapist | parent | master
stores/       <entity>Store.js — Context + reducer tipis + persist
domain/       branch · status · client · schedule · credit · rbac — aturan bisnis PURE (+ __tests__)
services/     storage/localStore.js · http/{httpClient,apiError,tokenStore}.js · api/endpoints.js
shared/       ui/ (shadcn, generated) · components/ · hooks/ · lib/ · constants/testIds/
config/env.js data/ (seed demo)
```

### Aturan wajib

#### Lapisan (ditegakkan `npm run lint`)
1. `domain/` pure: tanpa React, store, storage, UI. Hanya `domain/*` & `shared/lib/*`.
2. `shared/lib|ui|hooks`, `services/`, `config/` tidak import `stores/`, `features/`, `app/`. `shared/components` boleh baca store.
3. `stores/` tidak import `features/`/`app/`. Store **tidak memanggil store lain**.
4. Feature lain hanya lewat public API: `import { X } from "@/features/<m>"` (`index.js`). Dilarang import internal feature lain.
5. localStorage hanya lewat `services/storage/localStore.js` (melalui `usePersistentReducer/State`). URL API hanya di `services/api/endpoints.js`. Env hanya di `config/env.js`.

#### Data & aturan bisnis
6. Aturan/kalkulasi baru → fungsi pure di `domain/<entity>.js` **+ test** di `domain/__tests__/`.
7. Mutasi 1 store → panggil action store. Mutasi **>1 store** → hook use-case `features/<m>/hooks/use<X>Actions.js` (contoh `useSessionActions`, `useClientOutcomeActions`). Hook mengembalikan hasil; toast/navigate tetap di komponen.
8. Reducer pure & immutable, memanggil fungsi domain; tanpa fetch/toast/navigate.
8b. Tidak ada audit log (ADR 0004). Invoice mencatat riwayatnya sendiri lewat `appendInvoiceLog` (`domain/credit.js`, reducer `creditsStore`); pelaku dikirim sebagai `by`.
9. Data turunan (saldo kredit, frozen, skor kuadran, KPI) **dihitung** (`useMemo`/domain), tidak disimpan.
10. Field baru: default aman di factory (`makeInquiryClient`, …), baca dengan fallback, update `docs/guide/03` **dan padanan kolom di `schema.md`**. Seed berubah → naikkan `SEED_VERSION` (`data/seedRegistry.js`).
11. Transisi status pipeline otomatis hanya lewat `advanceStatus` (`domain/client.js`); perubahan manual ke tahap mana pun lewat `buildStatusChangePatch`. Hak aksi mengikuti **akses modul** (`useAuth().hasPermission`, mis. `canManageSchedule(hasPermission)`); aksi **hapus** hanya lewat `DeleteButton`/`IfCanDelete` (`shared/components/DeleteControls.js`) yang mengecek flag `canDelete` role + akses modul.

#### Konstanta & format
12. Enum/label dari `domain/*` (`STATUS_META` lewat `<StatusBadge/>`) atau `useMasterData()`. Jangan hardcode string enum/warna di halaman.
13. Tanggal simpan `yyyy-MM-dd`/ISO, tampil `fmtDate`; uang `fmtCurrency` (`shared/lib/format.js`); ID `uid()` (`shared/lib/id.js`), kode client `nextClientCode()` (`domain/client.js`), kode kuesioner `buildQuestionnaireCode()` (`domain/assessment.js`); waktu `HH:mm`.
14. Layanan client via `getClientServiceIds(client)`.

#### Routing, role, cabang
15. Halaman baru: entry di `app/router/routes.js` (dengan `module` RBAC) + menu di `app/layout/navConfig.js` + path di smoke test. Jangan mengubah `AppRouter.js`/`guards.js` untuk menambah halaman.
16. Data per cabang mengikuti `activeBranch` (pola `defaultBranch`, `docs/guide/02`).

#### UI
17. Pakai `shared/ui` + `shared/components` dulu; gabung class dengan `cn()`. Ikon hanya `lucide-react`.
18. **Mobile wajib**: breakpoint `md`, dialog `max-h-[calc(100dvh-2.5rem)]` + body scroll, tabel `overflow-x-auto`, target sentuh ≥40px. Portal ortu & `/assessment` diuji di 375px.
18b. **List = pagination 10 data per halaman**, tanpa infinite scroll: `usePagination` + `TablePagination` (`resetKey` = filter). Detail: `docs/guide/08`.
19. Toast `sonner` (bahasa Indonesia, spesifik); konfirmasi destruktif `useConfirm()`; `data-testid` kebab-case pada kontainer & elemen interaktif.
20. Teks UI & komentar **bahasa Indonesia**; istilah operasional klinik boleh English. Import pakai alias `@/…`.

#### Siap API
21. Jangan memanggil axios langsung; pakai `api.*` (`services/http/httpClient.js`) + `ENDPOINTS`. Tangani `ApiError` (`message`, `fieldErrors`, `isConflict`). Kirim `version` untuk entity ber-optimistic-lock.
22. Nama action/hook = nama use-case (calon endpoint), bukan operasi storage.

#### Mode gelap
- Class `dark` dipasang di `<html>` oleh `useAppTheme()` (dipanggil sekali di `AppLayout`); halaman publik (landing, `/assessment`, `/roles`) tetap terang. Preferensi tersimpan di key `ui_theme`.
- Pakai token (`bg-background`, `text-muted-foreground`, …) atau class warna Tailwind biasa: padanan gelap `bg-white`, `*-slate-*`, dan warna `*-50..300 / 600..950` dihasilkan otomatis dari `scripts/gen-dark-css.cjs`. Warna di luar itu (hex arbitrary, inline style, varian `[&_…]`) tidak ikut: tambahkan `dark:` manual atau aturan di `index.css`.
- Jangan edit `dark-utilities.css` manual (dihasilkan).

#### Batasan
23. Dependency baru hanya dengan alasan kuat (tulis ADR di `docs/adr/` bila signifikan).
24. Halaman > ~500 baris → pecah ke `components/<sub>/` saat disentuh.
25. Bug di luar scope: jangan diperbaiki diam-diam; catat di `docs/guide/11-known-issues.md` dan laporkan.

### Checklist sebelum selesai
- [ ] `npm run lint` 0 error · `npm test` lolos · `npm run build` lolos
- [ ] Cek di browser dengan role terkait (`/roles`), termasuk refresh & tampilan ≤768px
- [ ] Route baru ada di smoke test; aturan domain baru ada test-nya
- [ ] Docs `docs/guide/*` (dan `schema.md` bila menyentuh data) diperbarui
