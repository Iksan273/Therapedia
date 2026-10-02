# 0001 — Arsitektur frontend feature-based + domain layer, siap Laravel API
- Status: Diterima
- Tanggal: 2026-10-02

## Konteks
Prototype awal (hasil generator) menaruh semua halaman di `pages/`, komponen di `components/`, state di `context/`, dan **semua** konstanta + aturan bisnis di satu file `lib/appUtils.js`. Orkestrasi lintas domain (complete sesi → potong kredit → ubah status client) tersebar di handler komponen, dan aturan kredit ada di dalam reducer. Akibatnya:
- sulit diuji (tidak ada test runner; aturan bercampur React),
- integrasi Laravel API harus menyentuh banyak komponen,
- ada bug karena komponen memanggil fungsi store yang tidak ada (bulk complete),
- route & guard di-hardcode dalam JSX, role kustom tidak bisa masuk.

## Keputusan
1. Struktur **feature-based**: `features/<modul>/{pages,components,hooks,index.js}`; komposisi di `app/` (router berbasis konfigurasi, guard, layout, provider).
2. Lapisan **`domain/`** berisi aturan bisnis pure (kredit, jadwal, pipeline, RBAC) dengan unit test — juga acuan Action/Service Laravel.
3. **Store per entity** di `stores/` (Context + reducer tipis yang memanggil domain). Store tidak saling memanggil.
4. **Hook use-case** per feature untuk aksi lintas store; satu fungsi = satu endpoint transaksional saat API aktif.
5. **Lapisan services**: `storage/localStore.js` (satu-satunya akses localStorage), `http/httpClient.js` (axios + konversi case + `ApiError`), `api/endpoints.js`.
6. Batas lapisan **ditegakkan ESLint**; Vitest untuk domain, hook, dan smoke test semua route.

## Alternatif yang ditolak
- **Redux Toolkit / Zustand**: menambah dependency & pola baru; Context + reducer sudah cukup untuk ukuran app, dan fase API akan memakai react-query (sudah terpasang).
- **Langsung react-query + mock server (MSW)** sekarang: menunda demo localStorage yang masih dipakai stakeholder; dipilih transisi bertahap per store.
- **TypeScript penuh**: bernilai tinggi tetapi menggandakan scope refactor; ditunda (bisa bertahap dengan `checkJs`/JSDoc).

## Konsekuensi
- Positif: aturan bisnis teruji (52 test), migrasi API per store tanpa mengubah halaman, bug lintas store bisa dicegah di satu tempat.
- Negatif: lebih banyak folder; developer harus mengikuti aturan lapisan (dibantu lint & skill `react-architecture`).
- Lanjutan: implementasi store mode API (`VITE_DATA_SOURCE=api`), UI revert sesi & timeline audit, bersihkan warning `no-unused-vars`.
- Dokumen terkait: `docs/guide/01`, `02`, `05`, `09`, `10`; `frontend/CLAUDE.md`; `schema.md`.
