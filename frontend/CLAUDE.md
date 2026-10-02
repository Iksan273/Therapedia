# Frontend — Aturan Teknis

Dimuat otomatis saat bekerja di `frontend/`. Detail alur di `../docs/guide/` (index di `../CLAUDE.md`). Pola lengkap: skill `react-architecture`; keputusan desain: skill `design-architecture`.

## Stack
React 19 · react-router-dom 7 · Vite 6 · Tailwind 3 + shadcn/Radix · sonner · recharts · date-fns · lucide-react · Vitest 3 · ESLint 8.
Siap untuk fase API: @tanstack/react-query (QueryClient terpasang), axios (`services/http`). Belum dipakai: swr, react-hook-form, zod — jangan dipakai tanpa ADR.

## Commands (dari `frontend/`)
| Perintah | Fungsi |
|---|---|
| `npm run dev` | dev server http://localhost:3000 |
| `npm run build` | build produksi ke `dist/` |
| `npm test` | Vitest: domain, hook use-case, smoke semua route |
| `npm run lint` | ESLint + batas lapisan (harus 0 error) |

## Struktur `src/`
```
app/          App.js · providers/ · router/{routes,guards,AppRouter}.js · layout/{AppLayout,navConfig}.js
features/<m>/ pages/ · components/<sub>/ · hooks/use<X>Actions.js · index.js (public API) · __tests__/
              m = auth | landing | inquiry | assessment | schedule | finance | therapist | parent | master | audit
stores/       <entity>Store.js — Context + reducer tipis + persist
domain/       branch · status · client · schedule · credit · rbac · audit — aturan bisnis PURE (+ __tests__)
services/     storage/localStore.js · http/{httpClient,apiError,tokenStore}.js · api/endpoints.js
shared/       ui/ (shadcn, generated) · components/ · hooks/ · lib/ · constants/testIds/
config/env.js data/ (seed demo)
```

## Aturan wajib

### Lapisan (ditegakkan `npm run lint`)
1. `domain/` pure: tanpa React, store, storage, UI. Hanya `domain/*` & `shared/lib/*`.
2. `shared/lib|ui|hooks`, `services/`, `config/` tidak import `stores/`, `features/`, `app/`. `shared/components` boleh baca store.
3. `stores/` tidak import `features/`/`app/`. Store **tidak memanggil store lain**.
4. Feature lain hanya lewat public API: `import { X } from "@/features/<m>"` (`index.js`). Dilarang import internal feature lain.
5. localStorage hanya lewat `services/storage/localStore.js` (melalui `usePersistentReducer/State`). URL API hanya di `services/api/endpoints.js`. Env hanya di `config/env.js`.

### Data & aturan bisnis
6. Aturan/kalkulasi baru → fungsi pure di `domain/<entity>.js` **+ test** di `domain/__tests__/`.
7. Mutasi 1 store → panggil action store. Mutasi **>1 store** → hook use-case `features/<m>/hooks/use<X>Actions.js` (contoh `useSessionActions`, `useClientOutcomeActions`). Hook mengembalikan hasil; toast/navigate tetap di komponen.
8. Reducer pure & immutable, memanggil fungsi domain; tanpa fetch/toast/navigate.
8b. Aksi yang mengubah data penting dicatat lewat `useAuditLogger().record()` di hook use-case (kode aksi di `AUDIT_ACTIONS`, `domain/audit.js`).
9. Data turunan (saldo kredit, frozen, skor kuadran, KPI) **dihitung** (`useMemo`/domain), tidak disimpan.
10. Field baru: default aman di factory (`makeInquiryClient`, …), baca dengan fallback, update `docs/guide/03` **dan padanan kolom di `schema.md`**. Seed berubah → naikkan `SEED_VERSION` (`data/seedRegistry.js`).
11. Transisi status pipeline otomatis hanya lewat `advanceStatus` (`domain/client.js`). Hak ubah status sesi lewat `canManageSchedule(role)`.

### Konstanta & format
12. Enum/label dari `domain/*` (`STATUS_META` lewat `<StatusBadge/>`) atau `useMasterData()`. Jangan hardcode string enum/warna di halaman.
13. Tanggal simpan `yyyy-MM-dd`/ISO, tampil `fmtDate`; uang `fmtCurrency` (`shared/lib/format.js`); ID `uid()`, kode akses `genCode()` (`shared/lib/id.js`); waktu `HH:mm`.
14. Layanan client via `getClientServiceIds(client)`.

### Routing, role, cabang
15. Halaman baru: entry di `app/router/routes.js` (dengan `module` RBAC) + menu di `app/layout/navConfig.js` + path di smoke test. Jangan mengubah `AppRouter.js`/`guards.js` untuk menambah halaman.
16. Data per cabang mengikuti `activeBranch` (pola `defaultBranch`, `docs/guide/02`).

### UI
17. Pakai `shared/ui` + `shared/components` dulu; gabung class dengan `cn()`. Ikon hanya `lucide-react`.
18. **Mobile wajib**: breakpoint `md`, dialog `max-h-[calc(100dvh-2.5rem)]` + body scroll, tabel `overflow-x-auto`, target sentuh ≥40px. Portal ortu & `/assessment` diuji di 375px.
19. Toast `sonner` (bahasa Indonesia, spesifik); konfirmasi destruktif `useConfirm()`; `data-testid` kebab-case pada kontainer & elemen interaktif.
20. Teks UI & komentar **bahasa Indonesia**; istilah operasional klinik boleh English. Import pakai alias `@/…`.

### Siap API
21. Jangan memanggil axios langsung; pakai `api.*` (`services/http/httpClient.js`) + `ENDPOINTS`. Tangani `ApiError` (`message`, `fieldErrors`, `isConflict`). Kirim `version` untuk entity ber-optimistic-lock.
22. Nama action/hook = nama use-case (calon endpoint), bukan operasi storage.

### Batasan
23. Dependency baru hanya dengan alasan kuat (tulis ADR di `docs/adr/` bila signifikan).
24. Halaman > ~500 baris → pecah ke `components/<sub>/` saat disentuh.
25. Bug di luar scope: jangan diperbaiki diam-diam; catat di `docs/guide/11-known-issues.md` dan laporkan.

## Checklist sebelum selesai
- [ ] `npm run lint` 0 error · `npm test` lolos · `npm run build` lolos
- [ ] Cek di browser dengan role terkait (`/roles`), termasuk refresh & tampilan ≤768px
- [ ] Route baru ada di smoke test; aturan domain baru ada test-nya
- [ ] Docs `docs/guide/*` (dan `schema.md` bila menyentuh data) diperbarui
