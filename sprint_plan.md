# Rencana Sprint Therapedia (Backend + Integrasi + UAT)

**Dua timeline:**
- **Target internal (developer): 4 sprint.** Semua fitur selesai, terintegrasi, dan siap UAT di akhir Sprint 4.
- **Timeline ke klien (user/UAT): 6 sprint.** Sprint 5–6 dipakai untuk UAT, perbaikan, migrasi data, training, dan go-live. Selisih 2 sprint ini adalah **buffer**.

1 sprint = 1 minggu kerja (Senin–Jumat). Mulai **Senin, 5 Oktober 2026**. Tanggal belum memperhitungkan hari libur atau cuti; cek kalender sebelum dikunci ke klien.

| Sprint | Tanggal | Internal (developer) | Ke klien |
|---|---|---|---|
| S1 | 5–9 Okt 2026 | Fondasi backend, auth, master data | Kickoff, finalisasi requirement, fondasi |
| S2 | 12–16 Okt 2026 | Inquiry, pipeline, mesin asesmen | Login & master data, inquiry |
| S3 | 19–23 Okt 2026 | Penjadwalan, kredit, finance | Asesmen, penjadwalan |
| S4 | 26–30 Okt 2026 | Portal, dashboard, audit, job, deploy, **UAT-ready** | Kredit & finance |
| S5 | 2–6 Nov 2026 | Buffer: perbaikan UAT, change request | Portal & dashboard, **UAT ronde 1** |
| S6 | 9–13 Nov 2026 | Buffer: migrasi data, training, go-live | **UAT ronde 2**, migrasi data, training, **go-live** |

Dokumen ini masih level detail rencana. Sebelum tiap sprint dimulai, pecah lagi menjadi task harian.

---

## 0. Konteks & asumsi

- **Yang sudah ada:** frontend prototype lengkap (React + Vite) dengan data demo di localStorage, lapisan HTTP siap API (`frontend/src/services/http`), daftar endpoint (`services/api/endpoints.js`), desain DB (`schema.md`, 29 tabel + 6 view), dan alur per fitur (`technical_workflow.md`).
- **Yang dikerjakan di 4 sprint:** backend Laravel 11 + MySQL 8 + Sanctum (tanpa Redis), integrasi frontend dari localStorage ke API, deploy, dan persiapan UAT.
- **Kapasitas:** 1 developer, ±5 hari efektif per sprint (20 hari total). Estimasi kasar di bawah totalnya **±21,5 hari**, jadi target 4 sprint **ketat**; buffer S5–S6 yang menjaga komitmen ke klien.
- **Default keputusan:** bila klien belum menjawab, pakai kolom "Usulan teknis" di `pertanyaan_klien.md` (WA klik-kirim, paket tanpa masa berlaku, satu cabang per terapis, dan seterusnya).
- **Aturan kerja yang berlaku:** `CLAUDE.md`, `frontend/CLAUDE.md`, `docs/guide/10-api-migration.md`. Setiap perubahan data diselaraskan `domain/` ↔ `schema.md` ↔ docs.

## 1. Pra-sprint (sebelum Senin 5 Okt)

| # | Item | Kenapa | Output |
|---|---|---|---|
| P1 | Kirim `pertanyaan_klien.md` ke klien, minta jawaban 🔴 paling lambat **Rabu 7 Okt** | Jawaban 🔴 mengubah struktur DB (A1, A2, B1–B3, C1–C2, D1, E1, F1–F2, G1). Migration dikunci di S1 | Jawaban terisi di kolom "Jawaban" |
| P2 | Tanyakan juga batasan revert reschedule (dokumen jadwal terpisah) | Masih menggantung | Keputusan aturan revert |
| P3 | Siapkan server staging (VPS) + domain/subdomain API | Deploy dimulai dari S1, bukan di akhir | Akses SSH, MySQL 8, PHP 8.3, HTTPS |
| P4 | Buat repo/folder backend baru (bukan folder `backend/` legacy Emergent) | Folder lama diabaikan menurut `CLAUDE.md` | Skeleton Laravel 11 |
| P5 | Tentukan PIC klien untuk UAT per role (admin inquiry, admin schedule, finance, terapis, ortu, manager, master) | UAT butuh penguji nyata per role | Daftar penguji |

---

## 2. Sprint internal (developer)

### Sprint 1 — Fondasi, auth, master data (5–9 Okt)

**Tujuan:** backend berjalan di staging; login asli (staf dan ortu) dan master data sudah dari API.

| Area | Pekerjaan | Est. (hari) |
|---|---|---|
| Setup | Laravel 11, Sanctum, `.env` tanpa Redis (`CACHE/QUEUE/SESSION = database`), struktur Action per use-case, CI (lint + test), deploy otomatis ke staging | 0,5 |
| Database | Semua migration sesuai `schema.md` §09 (29 tabel), generated column WIB, CHECK constraint, 6 view dashboard, partisi + trigger append-only `audit_logs` | 1 |
| Seeder | Wajib: cabang, role, `access_modules`, `role_permissions` (dari `domain/rbac.js`), layanan, kuadran, alasan cancel/discharge, paket, akun master. Demo: konversi seed frontend | 0,5 |
| Inti | `AuditLogger::batch()` (ULID batch), `BranchScope`, `PermissionService` + policy aksi, trait optimistic lock (`version` → 409), format error yang cocok dengan `ApiError` (422 `fieldErrors`, 409), Resource camel/snake | 1 |
| Auth | Login staf (email + password, throttle, audit), login ortu (`client_access_code` + tanggal lahir anak, pesan gagal generik), logout, `me` | 0,5 |
| Master & akses | CRUD layanan, kuadran, alasan cancel/discharge, paket; user staf; role & matriks RBAC | 0,75 |
| Frontend | `tokenStore` + `setUnauthorizedHandler`; form login ortu tambah tanggal lahir; `masterDataStore`, `therapistsStore`, `authStore` (user/role) ke API via react-query | 0,75 |

**Selesai bila:** login semua role di staging, master data CRUD tersimpan di MySQL, setiap perubahan tercatat di `audit_logs`, `npm test` + test backend hijau.

### Sprint 2 — Inquiry, pipeline, mesin asesmen (12–16 Okt)

**Tujuan:** alur intake → layanan → kode kuesioner / jadwal asesmen → ortu mengisi → outcome berjalan end-to-end di staging.

| Area | Pekerjaan | Est. (hari) |
|---|---|---|
| Client | CRUD client (`client_code`, `client_access_code` UNIQUE + retry, `intake_note`), sinkron `client_services`, link dokumen (`client_documents`), search prefix (Q5), list pipeline per cabang (Q4) | 0,75 |
| Status | Transisi otomatis maju di server (padanan `advanceStatus`), `client_status_histories` dengan `trigger`, endpoint outcome `POST /clients/{id}/transition` (admit, done consult, done assessment, discontinue) | 0,5 |
| Mesin asesmen | CRUD kategori, section, soal (6 tipe, soft delete) | 0,75 |
| Kode & publik | Terbitkan kode, hapus kode yang belum diisi (audit `assessment_code.deleted`), endpoint publik ambil form + submit (revisi baru, `is_latest`, skor kuadran dihitung server), throttle publik, daftar "awaiting questionnaire" (Q18) | 1 |
| Frontend | `clientsStore`, `assessmentsStore`, `useClientOutcomeActions`, `useQuestionnaireCodeActions`, `AssessmentFill` (publik) ke API; tampilkan hasil revisi terbaru | 1,5 |
| Test | Feature test alur pipeline (lompat tahap, tidak mundur), submit ulang kuesioner | 0,5 |

**Selesai bila:** skenario "intake → jadwal asesmen → ortu isi → admit" lolos di staging, riwayat tahap dan audit tercatat.

### Sprint 3 — Penjadwalan, kredit, finance (19–23 Okt) ⚠️ sprint terberat

**Tujuan:** kalender, aksi sesi, ledger kredit, dan alur pembayaran benar dan transaksional.

| Area | Pekerjaan | Est. (hari) |
|---|---|---|
| Jadwal | CRUD sesi, seri berulang (`schedule_series`), cek bentrok (lock, 409, `force`), sesi asesmen memajukan status client, query kalender per minggu per cabang (Q1–Q3) | 1 |
| Aksi sesi | Complete (ledger `used`, idempotency key, FIFO paket), cancel (kuota 3, penalti), reschedule, tandai pending, drop pending, laporan sesi (`session_reports`) | 1,25 |
| Revert & bulk | Revert completed/cancel/reschedule (ledger `reversal`, `reverts_audit_id`), bulk complete/cancel/reschedule/revert dalam satu batch | 0,75 |
| Finance | Terbitkan invoice (nomor per tahun), upload bukti multipart ke storage privat, verifikasi approve/reject/void, renewal langsung, aktivasi paket (`invoice_id` UNIQUE), riwayat ledger keyset (Q10) | 1 |
| Frontend | `schedulesStore`, `creditsStore`, `useSessionActions` (semua aksi) ke endpoint transaksional; upload bukti via `api.upload`; status invoice `pending_verification` / `rejected` / `void` di UI | 1,5 |
| Test | Feature test kredit: complete → revert → complete lagi, penalti cancel ke-4, approve tidak dobel, konflik 409 | 0,5 |

Total ±6 hari → **kelebihan ±1 hari**. Mitigasi berurutan: (1) pindahkan bulk revert dan renewal langsung ke awal S4, (2) pindahkan riwayat ledger keyset ke S4, (3) bila masih kurang, ambil dari buffer S5.

**Selesai bila:** saldo kredit selalu cocok dengan Σ ledger pada semua skenario test; alur bayar ortu → approve Finance → kredit aktif berjalan di staging.

### Sprint 4 — Portal, dashboard, audit, job, hardening, UAT-ready (26–30 Okt)

**Tujuan:** semua modul jalan di environment UAT, data UAT siap, build dibekukan Jumat.

| Area | Pekerjaan | Est. (hari) |
|---|---|---|
| Portal | Portal terapis (jadwal sendiri, summary via `v_therapist_sessions`, laporan), portal ortu (tagihan, kredit, riwayat sesi completed + laporan) | 0,5 |
| Dashboard | Endpoint revenue, inquiry, schedule, branch performance, kredit dari view `v_daily_*` (filter cabang + rentang tanggal) | 0,75 |
| Audit | List audit (filter, keyset), timeline per client/sesi/invoice, aksi baca sensitif (`invoice.proof_viewed`, `report.printed`) | 0,5 |
| Job | `credits:reconcile`, `audit:partitions`, housekeeping, backup harian + uji restore, `schedules:overdue-digest`; job opsional dipasang hanya bila klien memintanya | 0,75 |
| Migrasi data | Skrip impor CSV client + saldo awal (hanya bila jawaban G1 = ada data lama) | 0,5 |
| Hardening | Rate limit, CORS, HTTPS, uji policy per role, `EXPLAIN ANALYZE` Q1–Q18 dengan ±50 ribu sesi dummy | 0,5 |
| UAT prep | Environment UAT terpisah dari staging, akun per role, data UAT realistis, skenario uji per role (lihat §4), panduan singkat pengguna | 1 |
| Bug bash | Uji menyeluruh semua role + mobile 375px (portal ortu & `/assessment`) | 0,5 |

**Selesai bila:** checklist UAT-ready (§3) terpenuhi dan build UAT dibekukan Jumat 30 Okt.

### Ringkasan beban

| Sprint | Estimasi | Kapasitas | Status |
|---|---|---|---|
| S1 | 5 | 5 | Pas |
| S2 | 5 | 5 | Pas |
| S3 | 6 | 5 | **Lebih 1 hari** |
| S4 | 5,5 (5 tanpa migrasi data) | 5 | Ketat |
| **Total** | **±21,5** | **20** | Buffer S5–S6 menutup selisih |

---

## 3. Definition of Done

**Per task / fitur**
- Endpoint sesuai `docs/guide/10-api-migration.md` dan `schema.md`; aksi lintas tabel dalam satu transaksi.
- Setiap aksi yang mengubah data menulis `audit_logs` di transaksi yang sama.
- Feature test backend untuk aturan bisnis (kredit, transisi status, hak akses).
- Frontend: interface store/hook tetap, `npm run lint` 0 error, `npm test` dan `npm run build` lolos.
- Docs terkait diperbarui dalam perubahan yang sama.

**UAT-ready (akhir S4)**
- Semua modul jalan di environment UAT dengan HTTPS.
- Akun uji per role + data UAT tersedia.
- Skenario uji per role tertulis.
- Backup harian aktif dan restore sudah diuji sekali.
- Tidak ada bug kritis yang diketahui.

---

## 4. Rencana UAT (timeline klien)

### Format UAT
- **Environment:** UAT terpisah dari staging developer, data bisa di-reset.
- **Penguji:** PIC klien per role (dari P5) + 1 orang tua uji (portal ortu, kuesioner).
- **Skenario:** satu lembar per role berisi langkah dan hasil yang diharapkan. Contoh:
  - Admin Inquiry: intake baru → pilih layanan → terbitkan kode → ortu isi → admit.
  - Admin Schedule: buat jadwal berulang → complete → cancel ke-4 (penalti) → revert → reschedule.
  - Finance: terbitkan invoice → ortu upload bukti → approve → kredit bertambah.
  - Terapis: isi laporan sesi; Ortu: lihat riwayat dan upload bukti dari HP.
  - Master/Manager: dashboard, audit log, user & RBAC.
- **Pelaporan bug:** satu tempat (spreadsheet/issue tracker) dengan kolom role, langkah, hasil, screenshot, tingkat (Kritis / Mayor / Minor / Saran).
- **Aturan perbaikan:** Kritis diperbaiki maksimal 1 hari kerja; Mayor di sprint yang sama; Minor dan Saran dikumpulkan, Saran fitur baru = change request.

### Timeline klien per sprint

| Sprint | Untuk klien | Demo / UAT | Yang sebenarnya dikerjakan developer |
|---|---|---|---|
| S1 (5–9 Okt) | Kickoff, finalisasi jawaban pertanyaan, desain DB final | Demo: rencana & fondasi | Sprint internal 1 |
| S2 (12–16 Okt) | Login asli + master data, modul inquiry | Demo + UAT bertahap: login & master data | Sprint internal 2 |
| S3 (19–23 Okt) | Mesin asesmen + kuesioner ortu, penjadwalan | UAT bertahap: inquiry & kuesioner | Sprint internal 3 |
| S4 (26–30 Okt) | Kredit & finance | UAT bertahap: jadwal & kredit | Sprint internal 4 (UAT-ready penuh) |
| S5 (2–6 Nov) | Portal terapis & ortu, dashboard, audit | **UAT ronde 1 menyeluruh** semua role | Perbaikan UAT, change request kecil |
| S6 (9–13 Nov) | Migrasi data, training, go-live | **UAT ronde 2 (regresi)** + sign-off | Migrasi data produksi, training, go-live, hypercare |

Fitur ditunjukkan ke klien selangkah di belakang progres internal, jadi tiap demo memakai fitur yang sudah stabil. Kalau internal molor, buffer ini yang dipakai tanpa mengubah janji ke klien.

### Kriteria sign-off UAT
- Semua skenario per role lolos.
- Tidak ada bug Kritis atau Mayor yang terbuka.
- Data hasil migrasi (bila ada) dicek klien.
- Klien menyetujui go-live tertulis.

### Go-live (S6)
1. Freeze perubahan 2 hari sebelum go-live.
2. Backup, migrasi data produksi (bila G1), cek saldo kredit via `credits:reconcile`.
3. Arahkan domain produksi, matikan mode demo (`VITE_DATA_SOURCE=api`).
4. Hypercare: developer standby untuk perbaikan cepat selama minggu pertama setelah go-live.

---

## 5. Ritme kerja (solo developer)

| Kapan | Kegiatan |
|---|---|
| Senin pagi | Planning: pecah sprint jadi task harian, cek jawaban klien yang masuk |
| Harian | Catat progres singkat + hambatan |
| Jumat siang | Deploy ke staging/UAT + demo ke klien (sesuai kolom "Untuk klien") |
| Jumat sore | Review: geser task yang belum selesai, perbarui risiko |

---

## 6. Risiko & mitigasi

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Jawaban klien 🔴 terlambat | Migration berubah setelah ada kode | Pakai default `pertanyaan_klien.md` dan kunci Rabu 7 Okt; perubahan setelahnya = change request |
| R2 | S3 kelebihan beban | S4 molor | Urutan pemindahan sudah ditetapkan (bulk revert, renewal, ledger keyset), buffer S5 |
| R3 | Bug kredit (saldo tidak cocok ledger) | Kepercayaan finansial | Test skenario kredit wajib, `credits:reconcile` harian, ledger append-only |
| R4 | Server/hosting belum siap | Deploy tertunda | P3 sebelum sprint; fallback VPS sementara milik developer |
| R5 | Penguji UAT tidak tersedia | UAT molor | PIC per role ditetapkan di P5, jadwal UAT dikirim di S3 |
| R6 | Change request di tengah sprint | Scope membengkak | Masuk daftar fase 2 kecuali kritis; dibahas saat review Jumat |
| R7 | Data lama berantakan (bila ada) | Migrasi lama | Template CSV dikirim di S2, data dibersihkan klien sebelum S6 |
| R8 | Satu developer sakit/berhalangan | Semua jalur berhenti | Buffer 2 sprint; prioritaskan modul inti (S1–S3) |

---

## 7. Di luar scope (usulan fase 2)

Mengikuti default `pertanyaan_klien.md`; bisa berubah sesuai jawaban klien.

- WhatsApp Business API otomatis (versi 1: tombol klik-kirim).
- Satu login ortu untuk banyak anak.
- Upload file dokumen ke server (versi 1: link Google Drive).
- Klasifikasi skor asesmen otomatis berbasis tabel norma.
- Form landing page membuat intake otomatis.
- Invoice biaya satuan, diskon, cicilan, refund.
- Masa berlaku paket dan kode kuesioner (job sudah disiapkan, tidak dipasang).
- Tombol batalkan outcome client.
- Reset password lewat email / OTP.

---

## 8. Dokumen acuan

| Dokumen | Isi |
|---|---|
| `schema.md` | Desain DB, transaksi kritis, audit, job |
| `technical_workflow.md` | Alur data per fitur (F1–F25) |
| `pertanyaan_klien.md` | Pertanyaan ke klien + default teknis |
| `docs/guide/10-api-migration.md` | Mapping hook/store frontend → endpoint |
| `docs/guide/11-known-issues.md` | Masalah yang masih terbuka |
