# 11 — Known Issues & Tech Debt

Diperbarui 2026-10-03 (keputusan klien) setelah restrukturisasi enterprise 2026-10-02. Hapus baris yang sudah diperbaiki.

## Sudah diperbaiki
| # | Masalah lama | Perbaikan |
|---|---|---|
| B1 | Bulk Complete & Bulk Cancel "leave" di Weekly Calendar memanggil fungsi yang tidak ada (TypeError) | `useSessionActions.bulkComplete` / `bulkCancel` (aturan sama dengan aksi tunggal) + test regresi |
| B2 | Tombol cetak terapis ke `/print/client/:id` tanpa route | Route mandiri di `STANDALONE_ROUTES` |
| B3 | Role kustom tidak bisa melewati guard | `RequireAccess` / `RequireModule` berbasis modul RBAC |
| B4 | Approve pembayaran tanpa record kredit tidak menambah kredit | `VERIFY_PAYMENT_PROOF` membuat record baru |
| B5 (sebagian) | Nomor invoice bisa duplikat | `nextInvoiceNumber` berbasis nomor terbesar |
| — | Tidak ada test runner & lint | Vitest (`npm test`), ESLint + batas lapisan (`npm run lint`) |
| B5 (kode) | Kode `TDC-`/`ASM-` acak 4 karakter tanpa cek unik | 3 Okt 2026: kode client berurutan per grup (`nextClientCode`, tanpa bentrok) dan kode kuesioner dicek unik (`buildQuestionnaireCode`) |
| — | Form jadwal berulang: dropdown "Service" per hari menimpa `type` sesi dengan nilai layanan (mis. `b_ota`) | 3 Okt 2026: dropdown service dihapus (keputusan klien); `type` tetap `therapy` |
| — | Modal laporan portal ortu menampilkan teks placeholder palsu bila laporan kosong | 3 Okt 2026: View Report nonaktif bila laporan kosong; bagian kosong tampil "Belum diisi" |

## Masih terbuka
| # | Lokasi | Masalah | Dampak |
|---|---|---|---|
| N1 | Google Calendar (keputusan klien, fase paling akhir) | Belum dikerjakan: butuh OAuth Google + backend (tabel `google_calendar_integrations`, `schedules.google_event_id`) | Dikerjakan setelah backend siap; lihat [12-keputusan-klien.md](12-keputusan-klien.md) F8 |
| N2 | Auth demo | Password staf & OTP disimpan polos di localStorage (`staffUsers`, `passwordResets`); email OTP disimulasikan (kode tampil di layar) | Hanya untuk demo. Backend: hash password, OTP ter-hash + email nyata, throttle (`schema.md` §04-A, §10) |
| N3 | Hapus client (demo) | Menyembunyikan sesi `completed` milik client tanpa revert (guard "revert dulu" hanya berlaku saat hapus sesi tunggal) | Konfirmasi aturan ke klien; saldo/ledger client tidak diubah |
| N4 | Landing dua bahasa | Modal detail program yang sedang terbuka tidak ikut berganti bahasa sampai dibuka ulang; bio/artikel sudah diterjemahkan, nama orang & istilah teknis (SI, NDT) tetap | Minor |
| N5 | Frontend lama di browser | `staffUsers`/`rolesList`/`rbacPermissions` tersimpan dan tidak ikut reset `SEED_VERSION`; akun master & flag `canDelete` memakai fallback (preset demo, default role) | Tombol Reset Demo Data / hapus localStorage bila perlu data bersih |
| I1 | Status invoice | Prototype hanya `unpaid`/`paid`; bukti terunggah tetap `unpaid` | Diselaraskan saat integrasi (lihat 10) |
| I2 | Bukti bayar | Disimpan dataURL di localStorage | Mudah melewati kuota ~5MB; fase API pakai upload multipart |
| I4 | Audit | Mode demo mencatat aksi sesi (`useSessionActions`), outcome/ubah status client (`useClientOutcomeActions`), hapus invoice, dan kode kuesioner; intake, RBAC, user belum tercatat live (hanya dummy) | Backend hanya mencatat modul schedule & finance (`schema.md` §05). Frontend (`domain/audit.js`, `useClientOutcomeActions`, `useQuestionnaireCodeActions`, halaman `AuditLogs`) masih punya kategori/aksi client, asesmen, akses, master, auth: selaraskan (hapus/sembunyikan) saat integrasi API |

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
