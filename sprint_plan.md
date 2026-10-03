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
| S4 | 26–30 Okt 2026 | Portal, dashboard, job, deploy, **UAT-ready** | Kredit & finance |
| S5 | 2–6 Nov 2026 | Buffer: perbaikan UAT, change request | Portal & dashboard, **UAT ronde 1** |
| S6 | 9–13 Nov 2026 | Buffer: migrasi data, training, go-live | **UAT ronde 2**, migrasi data, training, **go-live** |

Dokumen ini masih level detail rencana (diperbarui 3 Okt 2026 setelah jawaban klien dan meeting). Sebelum tiap sprint dimulai, pecah lagi menjadi task harian.

---

## 0. Konteks & asumsi

- **Yang sudah ada:** frontend prototype lengkap (React + Vite) dengan data demo di localStorage, lapisan HTTP siap API (`frontend/src/services/http`), daftar endpoint (`services/api/endpoints.js`), desain DB (`schema.md`, 34 tabel + 7 view; +1 tabel fase terakhir), dan alur per fitur (`technical_workflow.md`).
- **Yang dikerjakan di 4 sprint:** backend Laravel 11 + MySQL 8 + Sanctum (tanpa Redis), integrasi frontend dari localStorage ke API, deploy, dan persiapan UAT.
- **Kapasitas:** 1 developer, ±5 hari efektif per sprint (20 hari total). Estimasi kasar di bawah totalnya **±21,5 hari**, jadi target 4 sprint **ketat**; buffer S5–S6 yang menjaga komitmen ke klien.
- **Jawaban klien (3 Okt 2026):** sudah masuk di `pertanyaan_klien.md` dan dirangkum di `docs/guide/12-keputusan-klien.md` (kode client `AE-00001`, kuesioner sekali isi, invoice paket/assessment, kuota cancel per paket, revert 1x, hapus per role, tanpa audit log (jejak = kolom pelaku + log khusus, ADR 0004), konversi paket Finance (ADR 0003), dan seterusnya). Kolom "Usulan teknis" hanya dipakai untuk butir yang belum dijawab (F1–F4, G2–G4).
- **Aturan kerja yang berlaku:** `CLAUDE.md`, `frontend/CLAUDE.md`, `docs/guide/10-api-migration.md`. Setiap perubahan data diselaraskan `domain/` ↔ `schema.md` ↔ docs.

## 1. Pra-sprint (sebelum Senin 5 Okt)

| # | Item | Kenapa | Output |
|---|---|---|---|
| P1 | ✅ **Selesai (3 Okt):** klien sudah menjawab `pertanyaan_klien.md`. Sisa terbuka: F1–F2 (retensi, server), G2–G4 | Jawaban 🔴 mengubah struktur DB; migration dikunci di S1 | Jawaban terisi di kolom "Jawaban" |
| P2 | ✅ **Selesai (3 Okt):** revert hanya 1x (reschedule/pending → jadwal asal; 2x reschedule → jadwal tersimpan terakhir) | — | Aturan revert final |
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
| Database | Semua migration sesuai `schema.md` §09 (34 tabel; `google_calendar_integrations` menyusul di fase terakhir), generated column WIB, CHECK constraint, 6 view dashboard, `invoice_logs`, `package_conversions` | 1 |
| Seeder | Wajib: cabang, role, `access_modules`, `role_permissions` (dari `domain/rbac.js`), layanan, kuadran, alasan cancel/discharge, paket, akun master. Demo: konversi seed frontend | 0,5 |
| Inti | pengisi `created_by`/`updated_by`/`deleted_by` (trait/observer sederhana), `BranchScope`, `PermissionService` + policy aksi, trait optimistic lock (`version` → 409), format error yang cocok dengan `ApiError` (422 `fieldErrors`, 409), Resource camel/snake | 1 |
| Auth | Login staf (email + password, throttle), password sementara + wajib ganti, lupa password OTP email (queue mail), reset oleh Master; login ortu (`client_code` + tanggal lahir anak, throttle/lockout, pesan gagal generik), logout, `me` | 0,75 |
| Master & akses | CRUD layanan, kuadran, alasan cancel/discharge, paket (+ `invoice_code`); user staf (nonaktif, 1 cabang); role & matriks RBAC + `can_delete`; hari libur | 1 |
| Frontend | `tokenStore` + `setUnauthorizedHandler`; form login ortu tambah tanggal lahir; `masterDataStore`, `therapistsStore`, `authStore` (user/role) ke API via react-query | 0,75 |

**Selesai bila:** login semua role di staging, master data CRUD tersimpan di MySQL, kolom pelaku (`created_by`/`updated_by`) terisi, `npm test` + test backend hijau.

### Sprint 2 — Inquiry, pipeline, mesin asesmen (12–16 Okt)

**Tujuan:** alur intake → layanan → kode kuesioner / jadwal asesmen → ortu mengisi → outcome berjalan end-to-end di staging.

| Area | Pekerjaan | Est. (hari) |
|---|---|---|
| Client | CRUD client (`client_code` dari `client_code_counters`, UNIQUE, `intake_note`), sinkron `client_services`, link dokumen GDrive (`client_documents`), search prefix nama/ortu/kode (Q5), list pipeline per cabang (Q4), hapus (soft, `can_delete`) | 0,75 |
| Status | Transisi otomatis maju di server (padanan `advanceStatus`), perubahan manual ke tahap mana pun, `client_status_histories` dengan `trigger`, `POST /clients/{id}/transition` (admit, outcome, discontinue + `date_of_discontinue`, discharge, reaktivasi) | 0,5 |
| Mesin asesmen | CRUD kategori, section, soal (6 tipe, soft delete) | 0,75 |
| Kode & publik | Terbitkan kode (`type_code` + acak, masa berlaku opsional), hapus kode yang belum diisi, endpoint publik ambil form + submit (**sekali isi**, cek expiry & invoice assessment, consent, skor kuadran dihitung server), throttle publik, daftar "awaiting questionnaire" + search (Q18) | 1 |
| Frontend | `clientsStore`, `assessmentsStore`, `useClientOutcomeActions`, `useQuestionnaireCodeActions`, `AssessmentFill` (publik) ke API; tampilkan hasil revisi terbaru | 1,5 |
| Test | Feature test alur pipeline (lompat tahap, tidak mundur), submit ulang kuesioner | 0,5 |

**Selesai bila:** skenario "intake → jadwal asesmen → ortu isi → admit" lolos di staging, riwayat tahap (`client_status_histories`) tercatat.

### Sprint 3 — Penjadwalan, kredit, finance (19–23 Okt) ⚠️ sprint terberat

**Tujuan:** kalender, aksi sesi, ledger kredit, dan alur pembayaran benar dan transaksional.

| Area | Pekerjaan | Est. (hari) |
|---|---|---|
| Jadwal | CRUD sesi, seri berulang (`schedule_series`, lewati `holidays`), cek bentrok (lock, 409, `force`), sesi asesmen memajukan status client, query kalender per minggu per cabang (Q1–Q3) | 1 |
| Aksi sesi | Complete (ledger `used`, idempotency key, FIFO paket), cancel (kuota 3 **per paket**, admin memilih potong kredit atau tidak), reschedule, tandai pending, drop pending, laporan sesi (`session_reports`) | 1,25 |
| Revert & bulk | Revert **1x** completed/cancel/reschedule/pending (ledger `reversal`, `reverted_at`, `prev_*`, `client_status_from/to`), bulk complete/cancel/reschedule/revert dalam satu batch | 0,75 |
| Finance | Terbitkan invoice paket/assessment (nomor `INV-{KODE}-{YYYYMMDD}-{NNN}`, `invoice_counters`), upload bukti multipart (≤5 MB, JPG/PNG/PDF, re-upload ≤3x) ke storage privat, verifikasi approve/reject/void, renewal langsung (snapshot harga), aktivasi paket (`invoice_id` UNIQUE), riwayat ledger keyset (Q10) | 1 |
| Konversi paket & log invoice | `POST invoices/{id}/convert-package` (otomatis/manual, sisa nilai ÷ harga per sesi tujuan, tanpa kekurangan; lebihan → `clients.leftover_balance` yang memotong invoice berikutnya; kuota cancel ikut pindah; hapus jadwal terapi mendatang; ledger `converted_out/in`), `package_conversions`, `invoice_logs` + `GET invoices/{id}/logs` | 1 |
| Frontend | `schedulesStore`, `creditsStore`, `useSessionActions` (semua aksi) ke endpoint transaksional; upload bukti via `api.upload`; status invoice `pending_verification` / `rejected` / `void` di UI | 1,5 |
| Test | Feature test kredit: complete → revert → complete lagi, penalti cancel ke-4, approve tidak dobel, konflik 409 | 0,5 |

Total ±7 hari → **kelebihan ±2 hari**. Mitigasi berurutan: (1) pindahkan konversi paket, bulk revert, dan renewal langsung ke awal S4 (S4 longgar ±0,5 hari setelah audit log dihapus), (2) pindahkan riwayat ledger keyset ke S4, (3) bila masih kurang, ambil dari buffer S5.

**Selesai bila:** saldo kredit selalu cocok dengan Σ ledger pada semua skenario test; alur bayar ortu → approve Finance → kredit aktif berjalan di staging.

### Sprint 4 — Portal, dashboard, job, hardening, UAT-ready (26–30 Okt)

**Tujuan:** semua modul jalan di environment UAT, data UAT siap, build dibekukan Jumat.

| Area | Pekerjaan | Est. (hari) |
|---|---|---|
| Portal | Portal terapis (jadwal sendiri, summary via `v_therapist_sessions`, laporan), portal ortu (tagihan, kredit, riwayat sesi completed + laporan, kuesioner belum diisi + gating invoice assessment, export laporan harian), monitoring sesi tanpa report (`v_unreported_sessions`) | 1 |
| Dashboard | Endpoint revenue, inquiry, schedule, branch performance, kredit dari view `v_daily_*` (filter cabang + rentang tanggal) | 0,75 |
| Job | `credits:reconcile`, housekeeping (+ `otp:prune`), backup harian + uji restore. Tanpa job kedaluwarsa kode/paket, pengingat invoice, atau digest sesi (keputusan klien) | 0,5 |
| Migrasi data | Skrip konversi data lama klien ke bentuk DB kita (klien menyerahkan data menyusul; jawaban G1) | 0,5 |
| Hardening | Rate limit, CORS, HTTPS, uji policy per role, `EXPLAIN ANALYZE` Q1–Q18 dengan ±50 ribu sesi dummy | 0,5 |
| UAT prep | Environment UAT terpisah dari staging, akun per role, data UAT realistis, skenario uji per role (lihat §4), panduan singkat pengguna | 1 |
| Bug bash | Uji menyeluruh semua role + mobile 375px (portal ortu & `/assessment`) | 0,5 |

**Selesai bila:** checklist UAT-ready (§3) terpenuhi dan build UAT dibekukan Jumat 30 Okt.

### Tambahan scope dari meeting 3 Okt (belum termasuk ringkasan beban di bawah)
| Item | Est. (hari) | Catatan |
|---|---|---|
| Hari libur (CRUD + skip seri + kalender), monitoring sesi tanpa report, hapus per role (`can_delete`), analitik periode custom | ±2 | sebagian sudah tercakup di baris Master/Portal di atas; sisanya frontend |
| Frontend: aturan bisnis baru (kode client/kuesioner, invoice, cancel dengan pilihan kredit, revert 1x, status bebas) | ±3 | lihat `docs/guide/12-keputusan-klien.md` (B1–B9) |
| Landing page 2 bahasa (EN/ID) | ±0,5 | frontend saja |
| **Integrasi Google Calendar** | ±2–3 | **paling akhir**, hanya setelah semua fitur lain selesai (kemungkinan setelah go-live atau di sisa buffer) |
Total tambahan di luar Google Calendar ±5,5 hari → target 4 sprint internal **tidak lagi cukup**; buffer S5–S6 terpakai dan tanggal ke klien perlu dibahas ulang atau scope fase 2 digeser.

### Ringkasan beban

| Sprint | Estimasi | Kapasitas | Status |
|---|---|---|---|
| S1 | 5 | 5 | Pas |
| S2 | 5 | 5 | Pas |
| S3 | 7 | 5 | **Lebih 2 hari** |
| S4 | 5 (4,5 tanpa migrasi data) | 5 | Ketat |
| **Total** | **±22** | **20** | Buffer S5–S6 menutup selisih (sebelum tambahan di bawah) |

---

## 3. Definition of Done

**Per task / fitur**
- Endpoint sesuai `docs/guide/10-api-migration.md` dan `schema.md`; aksi lintas tabel dalam satu transaksi.
- Setiap aksi yang mengubah data mengisi kolom pelaku (`updated_by`/`deleted_by`); log khusus (`credit_ledger`, `invoice_logs`) ditulis di transaksi yang sama.
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
  - Master/Manager: dashboard, user & RBAC.
- **Pelaporan bug:** satu tempat (spreadsheet/issue tracker) dengan kolom role, langkah, hasil, screenshot, tingkat (Kritis / Mayor / Minor / Saran).
- **Aturan perbaikan:** Kritis diperbaiki maksimal 1 hari kerja; Mayor di sprint yang sama; Minor dan Saran dikumpulkan, Saran fitur baru = change request.

### Timeline klien per sprint

| Sprint | Untuk klien | Demo / UAT | Yang sebenarnya dikerjakan developer |
|---|---|---|---|
| S1 (5–9 Okt) | Kickoff, finalisasi jawaban pertanyaan, desain DB final | Demo: rencana & fondasi | Sprint internal 1 |
| S2 (12–16 Okt) | Login asli + master data, modul inquiry | Demo + UAT bertahap: login & master data | Sprint internal 2 |
| S3 (19–23 Okt) | Mesin asesmen + kuesioner ortu, penjadwalan | UAT bertahap: inquiry & kuesioner | Sprint internal 3 |
| S4 (26–30 Okt) | Kredit & finance | UAT bertahap: jadwal & kredit | Sprint internal 4 (UAT-ready penuh) |
| S5 (2–6 Nov) | Portal terapis & ortu, dashboard | **UAT ronde 1 menyeluruh** semua role | Perbaikan UAT, change request kecil |
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
| R2 | S3 kelebihan beban | S4 molor | Urutan pemindahan sudah ditetapkan (konversi paket, bulk revert, renewal, ledger keyset), buffer S5 |
| R3 | Bug kredit (saldo tidak cocok ledger) | Kepercayaan finansial | Test skenario kredit wajib, `credits:reconcile` harian, ledger append-only |
| R4 | Server/hosting belum siap | Deploy tertunda | P3 sebelum sprint; fallback VPS sementara milik developer |
| R5 | Penguji UAT tidak tersedia | UAT molor | PIC per role ditetapkan di P5, jadwal UAT dikirim di S3 |
| R6 | Change request di tengah sprint | Scope membengkak | Masuk daftar fase 2 kecuali kritis; dibahas saat review Jumat |
| R7 | Data lama berantakan (bila ada) | Migrasi lama | Template CSV dikirim di S2, data dibersihkan klien sebelum S6 |
| R8 | Satu developer sakit/berhalangan | Semua jalur berhenti | Buffer 2 sprint; prioritaskan modul inti (S1–S3) |

---

## 7. Di luar scope (usulan fase 2)

Mengikuti jawaban klien (3 Okt 2026). Yang **masuk scope** sekarang (sebelumnya fase 2): masa berlaku kode kuesioner (opsional), ubah status manual ke tahap mana pun, reset password via email OTP, hapus per role. Masa berlaku **paket** tidak ada (klien).

- WhatsApp Business API otomatis (versi 1: tombol klik-kirim).
- Satu login ortu untuk banyak anak.
- Upload file dokumen ke server (versi 1: link Google Drive).
- Klasifikasi skor asesmen otomatis berbasis tabel norma.
- Form landing page membuat intake otomatis.
- Invoice biaya satuan selain Paket Sesi dan Assessment.
- Diskon, DP, cicilan, refund (klien: tidak ada).

---

## 8. Dokumen acuan

| Dokumen | Isi |
|---|---|
| `schema.md` | Desain DB, transaksi kritis, jejak perubahan, job |
| `technical_workflow.md` | Alur data per fitur (F1–F25) |
| `pertanyaan_klien.md` | Pertanyaan ke klien + jawaban + penyesuaian meeting |
| `docs/guide/12-keputusan-klien.md` | Register keputusan klien + pelacak implementasi frontend |
| `docs/guide/10-api-migration.md` | Mapping hook/store frontend → endpoint |
| `docs/guide/11-known-issues.md` | Masalah yang masih terbuka |
