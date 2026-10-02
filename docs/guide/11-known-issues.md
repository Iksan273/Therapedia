# 11 — Known Issues & Tech Debt

Diperbarui 2026-10-02 setelah restrukturisasi enterprise. Hapus baris yang sudah diperbaiki.

## Sudah diperbaiki (2026-10-02)
| # | Masalah lama | Perbaikan |
|---|---|---|
| B1 | Bulk Complete & Bulk Cancel "leave" di Weekly Calendar memanggil fungsi yang tidak ada (TypeError) | `useSessionActions.bulkComplete` / `bulkCancel` (aturan sama dengan aksi tunggal) + test regresi |
| B2 | Tombol cetak terapis ke `/print/client/:id` tanpa route | Route mandiri di `STANDALONE_ROUTES` |
| B3 | Role kustom tidak bisa melewati guard | `RequireAccess` / `RequireModule` berbasis modul RBAC |
| B4 | Approve pembayaran tanpa record kredit tidak menambah kredit | `VERIFY_PAYMENT_PROOF` membuat record baru |
| B5 (sebagian) | Nomor invoice bisa duplikat | `nextInvoiceNumber` berbasis nomor terbesar |
| — | Tidak ada test runner & lint | Vitest (`npm test`), ESLint + batas lapisan (`npm run lint`) |

## Masih terbuka
| # | Lokasi | Masalah | Dampak |
|---|---|---|---|
| B5 | `shared/lib/id.js` `genCode` | Kode `TDC-`/`ASM-` acak 4 karakter tanpa cek unik | Potensi duplikat di demo; backend wajib UNIQUE (`schema.md`) |
| I1 | Status invoice | Prototype hanya `unpaid`/`paid`; bukti terunggah tetap `unpaid` | Diselaraskan saat integrasi (lihat 10) |
| I2 | Bukti bayar | Disimpan dataURL di localStorage | Mudah melewati kuota ~5MB; fase API pakai upload multipart |
| I3 | Revert sesi | Belum ada UI "batalkan completed/cancel" | Backend sudah dirancang (`schema.md` §06.3) |
| I4 | Audit | Mode demo baru mencatat aksi sesi (`useSessionActions`) & outcome client (`useClientOutcomeActions`). Intake, kuesioner, invoice, RBAC, user belum tercatat live (hanya dummy) | Backend mencatat semua aksi (`schema.md` §05); di demo tambahkan `useAuditLogger` bila perlu |

## Inkonsistensi data
- `clients[].serviceType` (legacy) dan `serviceTypes[]` berdampingan → selalu `getClientServiceIds()`.
- `schedules[].progressNote` duplikat `noteSection` (dijaga `buildReportPatch`).
- Invoice punya `proofUrl` dan `proofOfPaymentUrl` (duplikat).
- `credits.renewals` selalu `[]`.
- Alias konstanta `CLINICAL_SERVICES = ASSESSMENT_SERVICES = THERAPY_SERVICES = SESSION_TYPES = INTAKE_SERVICES`.
- `frontend/README.md` masih template Create React App.

## Code health
- `npm run lint`: 0 error, ±124 warning `no-unused-vars` (import/variabel sisa kode lama). Bersihkan saat file disentuh.
- File besar: `AssessmentFill.js` (~740 baris), `AppLayout.js` (~600), `CalendarPage.js` (~670), `DashboardRevenue.js` (~680), `ClientDashboard.js` (~650), `DashboardSchedule.js` (~650). Pecah ke sub-komponen saat disentuh.
- `migrateRawState` (`services/storage/localStore.js`) melakukan string-replace pada seluruh JSON tersimpan.
- `therapist` boleh masuk grup `/admin-inquiry` (untuk hasil asesmen) tanpa menu ke sana.
- `packageManager` menyebut yarn, repo memakai `package-lock.json` (npm).

## Repo hygiene
- Sisa Emergent: `backend/server.py`, `tests/`, `.emergent/`, `memory/`, `test_reports/`, `frontend/plugins/health-check/`, devDependency `@emergentbase/visual-edits`, folder `frontend/build/`.
- File temp Office di `docs/`: `~$erapedia_Final_Requirement_v1.0.docx`, `~WRL2799.tmp`.
