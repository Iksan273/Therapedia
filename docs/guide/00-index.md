# Panduan Developer Therapedia — Index

Panduan teknis untuk developer dan Claude Code. Path ditulis relatif dari root repo (path pendek seperti `domain/credit.js` = `frontend/src/domain/credit.js`).
Docs **merujuk** ke file sumber (path + nama fungsi), tidak menyalin kode. Bila kode dan doc berbeda, **kode yang benar** — perbaiki doc-nya.

## Urutan baca (developer baru)
1. [01-architecture.md](01-architecture.md) — lapisan, struktur folder, boot, persistence
2. [02-roles-routing-rbac.md](02-roles-routing-rbac.md) — role, konfigurasi route, guard, menu
3. [03-data-model.md](03-data-model.md) — bentuk data, modul domain, mapping ke `schema.md`
4. Flow bisnis sesuai modul (04–07)
5. [08-ui-conventions.md](08-ui-conventions.md) sebelum membuat UI
6. [09-recipes.md](09-recipes.md) saat mengerjakan perubahan umum
7. [10-api-migration.md](10-api-migration.md) saat menyentuh integrasi backend

## Peta "tugas → doc → file"
| Tugas | Baca | File utama |
|---|---|---|
| Tambah/ubah halaman atau route | 02, 09 | `frontend/src/app/router/routes.js`, `frontend/src/app/layout/navConfig.js` |
| Hak akses role / modul RBAC | 02 | `frontend/src/domain/rbac.js`, `frontend/src/stores/authStore.js` |
| Field data / seed | 03, 09 | `frontend/src/stores/*.js`, `frontend/src/domain/*.js`, `frontend/src/data/*` |
| Aturan bisnis (kredit, jadwal, pipeline) | 03, 05 | `frontend/src/domain/*.js` + `__tests__` |
| Intake, pipeline, kuesioner, hasil asesmen | 04 | `frontend/src/features/inquiry/`, `frontend/src/features/assessment/` |
| Kalender, jadwal berulang, bentrok, kredit sesi | 05 | `frontend/src/features/schedule/`, `frontend/src/domain/credit.js` |
| Invoice, bukti bayar, renewal, paket | 06 | `frontend/src/features/finance/`, `frontend/src/stores/creditsStore.js` |
| Portal terapis / ortu, dashboard, user & RBAC | 07 | `frontend/src/features/therapist/`, `parent/`, `master/` |
| Styling, komponen, mobile, testId | 08 | `frontend/src/shared/components/`, `frontend/src/index.css` |
| Integrasi Laravel API | 10 | `frontend/src/services/`, `frontend/src/config/env.js`, `schema.md` |
| Desain tabel / indeks / audit log | `schema.md` | skill `database-design` |
| Audit log (halaman, pencatatan aksi) | 07 §F, `schema.md` §05 | `frontend/src/features/audit/`, `frontend/src/domain/audit.js` |
| Cek bug & tech debt | 11 | — |
| Keputusan klien & status implementasinya | 12 | — |

## Daftar dokumen
| No | File | Isi |
|---|---|---|
| 01 | [01-architecture.md](01-architecture.md) | Lapisan & aturan dependensi, struktur folder, boot, provider, persistence, seed, build/test/lint |
| 02 | [02-roles-routing-rbac.md](02-roles-routing-rbac.md) | 7 role, `routes.js`, guard `RequireAccess`/`RequireModule`, `navConfig`, RBAC, scoping cabang |
| 03 | [03-data-model.md](03-data-model.md) | Shape entity, modul domain & konstanta, mapping ke `schema.md` v2 |
| 04 | [04-flow-inquiry-assessment.md](04-flow-inquiry-assessment.md) | Intake → pipeline → kuesioner → hasil kuadran → outcome |
| 05 | [05-flow-schedule-credit.md](05-flow-schedule-credit.md) | Weekly calendar, recurring, conflict, `useSessionActions`, aturan kredit |
| 06 | [06-flow-finance.md](06-flow-finance.md) | Master paket, invoice, upload & verifikasi bukti, renewal |
| 07 | [07-flow-portals-dashboards.md](07-flow-portals-dashboards.md) | Portal terapis, portal ortu, dashboard, user management, RBAC UI |
| 08 | [08-ui-conventions.md](08-ui-conventions.md) | Design tokens, komponen, mobile, testId, microcopy |
| 09 | [09-recipes.md](09-recipes.md) | Resep langkah demi langkah |
| 10 | [10-api-migration.md](10-api-migration.md) | Lapisan HTTP, mapping use-case → endpoint → tabel → kode audit |
| 11 | [11-known-issues.md](11-known-issues.md) | Bug yang sudah/masih terbuka, tech debt |
| 12 | [12-keputusan-klien.md](12-keputusan-klien.md) | Keputusan klien & hasil meeting (3 Okt 2026) + pelacak implementasi frontend |

## Dokumen & aset lain
| File | Status |
|---|---|
| `schema.md` | Desain database v2 (MySQL 8 + Laravel 11): 33 tabel domain (+1 fase akhir) + 7 view, indeks berbasis query, ledger kredit, audit log (schedule & finance) |
| `docs/adr/` | Architecture Decision Records (mulai `0001-feature-based-architecture.md`) |
| `.claude/skills/` | Skill Claude Code: `design-architecture`, `react-architecture`, `database-design` |
| `PROJECT_CONTEXT_FOR_PROPOSAL_AI.md`, `docs/*.docx` | Dokumen bisnis/proposal. Referensi scope, **jangan diedit** kecuali diminta |
| `backend/`, `tests/`, `.emergent/`, `memory/`, `test_reports/` | Sisa platform Emergent (legacy). Tidak dipakai |
