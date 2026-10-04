---
name: design-architecture
description: Merancang arsitektur fitur/modul baru Therapedia end-to-end (domain → store → use-case → UI → API → DB), menentukan letak kode di lapisan yang benar, dan menulis ADR. Pakai saat membuat fitur/modul baru, mengubah alur lintas modul, menambah aturan bisnis, merencanakan integrasi Laravel API, atau saat ragu "kode ini taruh di mana".
---

# Design Architecture — Therapedia

Skill ini dipakai untuk **keputusan desain**, bukan untuk mengetik kode. Hasil akhirnya: rencana per lapisan + ADR bila keputusannya signifikan. Implementasi React mengikuti skill `react-architecture`, desain tabel mengikuti skill `database-design`.

## 1. Peta lapisan (sumber kebenaran)

```
          ┌──────────────────────── frontend/src ────────────────────────┐
 UI       │ app/ (router, guard, layout, providers)                      │
          │ features/<modul>/ pages → components → hooks (use-case)      │
 State    │ stores/<domain>Store.js  (Context + reducer, persist lokal)  │
 Rules    │ domain/*.js  (aturan bisnis pure, tanpa React)               │
 Infra    │ services/storage (localStorage) · services/http (Laravel)    │
          │ shared/ (ui shadcn, components, hooks, lib) · config/env.js  │
          └──────────────────────────────────────────────────────────────┘
                          │ fase API: services/http + services/api/endpoints.js
                          ▼
          Laravel 11: Controller → FormRequest → Action/Service (transaksi) → Model
                          ▼
          MySQL 8 (schema.md) — juga untuk cache dan session (driver database; tanpa Redis, tanpa queue — semua sinkron)
          Laravel Scheduler: job malam (schema.md §11)
```

Aturan dependensi (ditegakkan ESLint `frontend/.eslintrc.cjs`):
- `domain/` → hanya `shared/lib`. Tidak boleh React, store, storage, atau UI.
- `shared/lib|ui|hooks`, `services/`, `config/` → tidak boleh import `stores/`, `features/`, `app/`.
- `shared/components` → boleh baca `stores/`, tidak boleh `features/`/`app/`.
- `stores/` → `domain`, `shared`, `services`. Tidak boleh `features/`/`app/`.
- `features/A` → feature lain **hanya** lewat `@/features/B` (file `index.js`).
- `app/` → boleh semuanya (komposisi).

## 2. Proses mendesain fitur baru

Kerjakan berurutan; tulis jawabannya di rencana sebelum coding.

1. **Use-case & aktor** — siapa (role) melakukan apa; tulis sebagai kalimat kerja: "Finance memverifikasi bukti bayar".
2. **Aturan bisnis** — invarian, transisi status, efek samping (kredit, status client, notifikasi). Taruh di `domain/<entity>.js` sebagai fungsi pure + unit test.
3. **Data** — entity & field baru. Cek `docs/guide/03-data-model.md` dan `schema.md`. Field baru wajib punya padanan kolom DB (atau catat gap).
4. **State** — store mana yang memegang data. Satu entity = satu store. Jangan buat store baru bila entity sudah punya store.
5. **Orkestrasi** — jika satu aksi menyentuh >1 store → **hook use-case** di `features/<modul>/hooks/use<X>Actions.js`. Satu aksi = calon satu endpoint transaksional.
6. **UI & akses** — route di `app/router/routes.js` (role + `module` RBAC), menu di `app/layout/navConfig.js`, halaman di `features/<modul>/pages/`.
7. **API & DB** — endpoint di `services/api/endpoints.js`, kontrak di `docs/guide/10-api-migration.md`, tabel/indeks/jejak di `schema.md`.
8. **Jejak** — tidak ada audit log (ADR 0004): kolom `created_by`/`updated_by`/`deleted_by`; log khusus (`invoice_logs`, ledger) hanya bila dibutuhkan logika/UI, termasuk pasangan pembatalan.
9. **Verifikasi** — test domain (Vitest), smoke route (`src/app/__tests__`), `npm run lint`, `npm run build`.

## 3. Heuristik penempatan kode

| Pertanyaan | Jawaban |
|---|---|
| Menghitung/memutuskan sesuatu dari data? | `domain/` (pure + test) |
| Mengubah 1 entity lewat 1 aksi store? | Langsung panggil action store dari halaman |
| Mengubah >1 entity / >1 store? | Hook use-case di feature |
| Dipakai >1 feature dan tanpa logika domain? | `shared/components` atau `shared/lib` |
| Komponen milik feature lain yang dibutuhkan? | Export lewat `features/<x>/index.js` |
| Konstanta enum / label status? | `domain/<entity>.js` (`STATUS_META` di `domain/status.js`) |
| Akses localStorage? | Hanya `services/storage/localStore.js` via `shared/hooks/usePersistentState` |
| URL API? | `services/api/endpoints.js` |
| Env var? | `config/env.js` |

## 4. Prinsip non-fungsional

- **Siap API**: nama action = nama use-case; jangan simpan data turunan (saldo, frozen, skor kuadran) — hitung, atau biarkan backend yang menyimpan versi resminya.
- **Transaksi**: efek lintas tabel (complete sesi → ledger kredit → status client) = satu transaksi DB di backend.
- **Idempoten**: aksi yang bisa terkirim dua kali (complete, verify) harus aman diulang (kunci idempotensi).
- **Reversible**: aksi penting punya pasangan pembatalan yang tercatat (baris `reversal` di ledger / kolom `previous_*`), bukan hard delete/overwrite.
- **Konkurensi**: data yang bisa diedit bersamaan memakai kolom `version` (optimistic lock → HTTP 409, sudah ditangani `ApiError.isConflict`).
- **Performa**: query list selalu ber-filter cabang + periode dan didukung indeks komposit; dashboard membaca tabel ringkasan.

## 5. ADR (Architecture Decision Record)

Tulis ADR bila keputusan: mengubah aturan lapisan, menambah dependency besar, mengubah aturan bisnis lintas modul, atau memilih antara beberapa desain DB/API.

Lokasi: `docs/adr/NNNN-judul-singkat.md` (nomor urut 4 digit). Template:

```markdown
# NNNN — <Judul keputusan>
- Status: Diusulkan | Diterima | Digantikan oleh NNNN
- Tanggal: YYYY-MM-DD

## Konteks
<masalah, batasan, data pendukung>

## Keputusan
<apa yang dipilih, dalam 3–6 poin>

## Alternatif yang ditolak
<opsi + alasan singkat>

## Konsekuensi
<positif, negatif, pekerjaan lanjutan, file/dok yang harus diperbarui>
```

## 6. Output yang diharapkan dari skill ini

1. Ringkasan desain per lapisan (tabel: lapisan → file → perubahan).
2. Daftar aturan bisnis + kasus tepi + test yang akan ditulis.
3. Dampak ke `schema.md` / `docs/guide/10` (tabel, indeks, endpoint, kolom pelaku/log khusus).
4. ADR bila memenuhi kriteria di atas.
5. Daftar dokumen `docs/guide/*` yang harus diperbarui.

Referensi: `docs/guide/01-architecture.md`, `docs/guide/10-api-migration.md`, `schema.md`, `docs/adr/`.
