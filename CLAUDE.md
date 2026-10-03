# Therapedia — One Gate Integrated Clinic System

Sistem operasional klinik tumbuh kembang anak **Therapedia Developmental Center** (multi-cabang Surabaya: East, Citraland, West). Mencakup intake & asesmen, penjadwalan terapi + kredit sesi, finance, portal terapis, portal orang tua, dan dashboard eksekutif.

## Status project
- **Sekarang**: frontend (React + Vite) di `frontend/`, arsitektur feature-based + domain layer. Data mode demo di **localStorage** (seed JSON); login = simulasi role. Lapisan HTTP untuk API sudah siap (`frontend/src/services/http`).
- **Berikutnya**: backend **Laravel 11 + MySQL 8 + Sanctum** (tanpa Redis: cache/queue/session driver `database`) sesuai `schema.md` v2. Kode baru harus **siap API** (`docs/guide/10-api-migration.md`).
- Deploy frontend: Vercel (`frontend/vercel.json`).

## Peta repo
| Path | Isi |
|---|---|
| `frontend/` | Aplikasi React. **Baca `frontend/CLAUDE.md` untuk aturan teknis.** |
| `docs/guide/` | Panduan developer: arsitektur, alur bisnis, data model, resep, integrasi API |
| `docs/adr/` | Architecture Decision Records |
| `schema.md` | Desain database v2: 33 tabel domain (+1 fase akhir) + 7 view, indeks berbasis query, ledger kredit, **audit log (schedule & finance)** |
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
```
Masuk app: `/roles` → pilih role, atau kode client (mis. `AE-00006`) untuk portal ortu. Kuesioner publik: `/assessment` dengan kode kuesioner (mis. `ASM-2016` dari seed demo, atau yang diterbitkan: `{kode jenis}-{acak}`). Akun staf demo: email dari `/login` + password `Therapedia2026!`.

## Domain singkat
- **7 role**: `master`, `manager`, `admin_inquiry`, `admin_schedule`, `finance`, `therapist`, `client` (ortu) + role kustom (RBAC per modul).
- **Pipeline client**: `inquiry → service_selected → assessment_scheduled → assessment_done → admitted | done_consult | done_assessment | discontinued`; `admitted → discharged`. Transisi otomatis hanya maju; perubahan manual boleh ke tahap mana pun. Kode client `AE-00001` (grup huruf pertama nama + 5 digit; juga kode login ortu).
- **Sesi**: `scheduled → completed | cancelled | rescheduled | reschedule_pending`. Therapy completed −1 kredit. Cancel: admin memilih potong kredit atau tidak; kuota cancel 3 per **paket** (penghitung). Revert hanya 1x. Kredit 0 = **Frozen** (turunan, tidak disimpan).
- **Finance**: invoice → ortu upload bukti → Finance verifikasi → paket kredit baru.
- **Audit (backend)**: hanya modul **schedule & finance** yang tercatat di `audit_logs` (modul lain `created_by/updated_by/deleted_by`); pembatalan = aksi baru yang menunjuk aksi asal.
- **Akses & hapus**: punya akses modul = boleh semua aksi kecuali hapus; tombol hapus hanya untuk role `can_delete`. Keputusan klien lengkap + status implementasi: `docs/guide/12-keputusan-klien.md`.

## Skill — gunakan saat
| Skill | Kapan |
|---|---|
| `design-architecture` | Merancang fitur/modul baru, aturan bisnis lintas modul, menentukan letak kode, menulis ADR |
| `react-architecture` | Membuat/mengubah halaman, komponen, store, hook use-case, route; memindahkan store ke API |
| `database-design` | Menambah/mengubah tabel, kolom, indeks, migration, audit, performa query, memperbarui `schema.md` |

## Aturan inti
1. Bahasa: UI, komentar kode, dan docs **bahasa Indonesia**; istilah teknis & operasional klinik boleh English.
2. Ikuti pola & lapisan yang ada (`frontend/CLAUDE.md`). Cari dulu di `frontend/src/domain/`, `shared/`, dan `features/<m>/index.js` sebelum membuat yang baru.
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
| Desain DB, indeks, audit log | `schema.md` + skill `database-design` |
| Sebelum memperbaiki sesuatu yang "aneh" | `docs/guide/11-known-issues.md` |
| Keputusan klien / meeting 3 Okt 2026 + status implementasi frontend | `docs/guide/12-keputusan-klien.md`, `pertanyaan_klien.md` |
