# Rencana Sprint Therapedia (Backend + Integrasi + UAT)

**4 sprint, masing-masing 2 minggu (10 hari kerja), total 40 hari rencana.** Pemetaan ke `TIMELINE_DEV.md` (jadwal yang berlaku ke klien: sign-off UAT Sab 28 Nov, **go-live Sen 7 Des 2026**). Diperbarui **13 Okt 2026**.

| Sprint | Tanggal | = Minggu di TIMELINE_DEV | Fokus | Progres | UAT Sabtu | Dokumen rinci |
|---|---|---|---|---|---|---|
| **S1** | 12–23 Okt | D1 + D2 | Fondasi, auth, RBAC, master, cabang, libur, **inquiry, client, status, mesin asesmen, kuesioner publik** | 25% | #1 24 Okt, #2 31 Okt | [sprint-1-fondasi-inquiry-asesmen.md](docs/sprint/sprint-1-fondasi-inquiry-asesmen.md) |
| **S2** | 26 Okt–6 Nov | D3 + D4 | **Penjadwalan, aksi sesi, revert/bulk, cuti**, Finance inti (invoice → bukti → lunas → paket → relink), ledger | **50%** (Checkpoint Termin 2) | #3 7 Nov | [sprint-2-penjadwalan-cuti-finance-inti.md](docs/sprint/sprint-2-penjadwalan-cuti-finance-inti.md) |
| **S3** | 9–20 Nov | D5 + D6 | **Void/pengganti, konversi, Refund, credit leave, cuti Finance**, portal terapis/ortu, Active Client, dashboard, job, env UAT | 75% | #4 14 Nov, #5 21 Nov (**ronde 1**) | [sprint-3-finance-lanjutan-portal-dashboard.md](docs/sprint/sprint-3-finance-lanjutan-portal-dashboard.md) |
| **S4** | 23 Nov–4 Des | D7 + D8 | **Hapus cabang + uji FK**, hardening, migrasi, perbaikan UAT, training, freeze, cutover | 100% | #6 28 Nov (**ronde 2 + sign-off**), cadangan 5 Des | [sprint-4-hardening-uat-golive.md](docs/sprint/sprint-4-hardening-uat-golive.md) |
| — | **Sen 7 Des** | | **Go-live**, hypercare 7–11 Des | | | |
| (setelah) | 14 Des | | M14 Google Calendar (±2–3 hari) | | | sprint-4 §9 |

> **Perubahan dari versi sebelumnya (4 sprint × 1 minggu, go-live 20 Nov).** Beban sebenarnya ±32 hari + ±8 hari stabilisasi (setelah revisi R9–R30), bukan 20 hari; 4 sprint × 1 minggu tidak realistis. Jumlahnya tetap **4 sprint**, tetapi tiap sprint 2 minggu agar cocok dengan `TIMELINE_DEV.md`. Bila ingin kembali ke 1 minggu/sprint, scope harus dipangkas atau developer ditambah.

Setiap file sprint memuat: tujuan & kriteria selesai, urutan harian, **tabel API per modul** (endpoint, action, akses, request, tabel, error), **core logic**, **integrasi frontend** (store/hook/halaman/komponen), test wajib, dan risiko.

---

## 1. Konteks & asumsi

- **Sudah ada:** frontend lengkap (React + Vite, data demo localStorage, lapisan HTTP siap API); `schema.md` FINAL (37 tabel + 6 view); kerangka backend Laravel 12 (37 migration, 37 model, service per aggregate, 113 route 501, middleware `module:`); Docker + CI/CD ke VPS UAT.
- **Dikerjakan di 4 sprint:** logika backend per use-case (Laravel 12 + MySQL 8 + Sanctum, **tanpa Redis dan tanpa queue/job async**, semua sinkron), integrasi frontend localStorage → API, deploy, UAT, migrasi, go-live.
- **Kapasitas:** 1 developer, 5 hari efektif/minggu = 40 hari rencana. Sabtu sore dan Minggu = buffer ±1 hari/minggu (di luar hitungan).
- **Sumber kebenaran:** `schema.md` > `docs/guide/10-api-migration.md` > `TIMELINE_DEV.md` > `implementation_detail.md` (lihat §5: sebagian usang).
- **Aturan kerja:** `CLAUDE.md`; setiap perubahan data diselaraskan `domain/` ↔ `schema.md` ↔ docs.

## 2. Pra-sprint

| # | Item | Status |
|---|---|---|
| P1 | Jawaban klien `pertanyaan_klien.md` (🔴 mengubah struktur DB) | ✅ 3 Okt; sisa F1–F2 (retensi/server), G1–G4 dibahas setelah development |
| P2 | Aturan revert hanya 1x | ✅ 3 Okt |
| P3 | VPS UAT (satu-satunya lingkungan, tanpa staging) + domain/subdomain API + SMTP untuk OTP | Siapkan sebelum S1 hari 1 (`docs/guide/13`, `14`) |
| P4 | Skeleton Laravel 12 jalan di Docker, `/up` 200 | ✅ (setup 13 Okt) |
| P5 | PIC klien per role untuk UAT (admin inquiry, admin schedule, finance, terapis, ortu, manager, master) | Konfirmasi sebelum 24 Okt |
| P6 | Review kontrak API: `implementation_detail.md` + file sprint; setujui path ✚ untuk `endpoints.js` | S1 hari 1 |

---

## 3. Urutan keterkaitan antar modul

```
M0 fondasi ─► M1 Auth ─► M2 User/RBAC/Cabang ─► M3 Master & libur
                                                    │
                          M4 Inquiry & Client ◄─────┘
                                │
                          M5 Asesmen & kuesioner (S1)
─────────────────────────────────────────────────────────────────────────
                          M6 Penjadwalan (butuh client, terapis, libur)
                                │
              ┌─────────────────┼───────────────────┐
         Cuti client      Aksi sesi + ledger ◄─ M7 Finance inti (paket aktif, relink)
        (butuh sesi)            │                     │
                                └──────────┬──────────┘                  (S2)
─────────────────────────────────────────────────────────────────────────
         M7 lanjutan: Void ► Pengganti ► Konversi ► Refund ► Credit leave ► Cuti Finance
                                │
        M8 Active client ─ M9 Portal terapis ─ M10 Portal ortu ─ M11 Dashboard ─ M13 Job   (S3)
─────────────────────────────────────────────────────────────────────────
         M12 hapus cabang + uji FK ► hardening ► migrasi ► training ► cutover               (S4)
```

Dependensi lintas sprint yang sengaja ditangani (tidak ada yang mundur):
| Sprint | Butuh dari sprint lain | Penanganan |
|---|---|---|
| S1 kuesioner publik | invoice assessment (Finance, S2) | Gating hanya query ke tabel `invoices` (sudah ada); `invoice_required=1` baru menerbitkan invoice di S2 hari 7–8 |
| S1 discharge | jadwal + ledger (S2) | Titik sambung `DischargeSideEffects`; diisi S2 hari 3–4 |
| S1 libur | jadwal (S2) | Efek cancel sesi `cancel_reason='H'` dipasang S2 hari 2 |
| S2 aksi sesi | paket aktif (Finance) | Uji dengan seeder paket; Finance inti hari 7–8 |
| S3 void/refund/konversi | relink jadwal (S2) | Service `RelinkUpcomingSchedules` dibuat di S2 dan dipakai ulang |
| S3 dashboard | data semua modul | Dikerjakan setelah Finance lanjutan + portal (hari 8–9) |
| S4 hapus cabang | seluruh tabel turunan | Diletakkan terakhir agar uji FK mencakup semua tabel |

## 4. Cakupan fitur (penambahan dari revisi 13 Okt)

Item berikut **sebelumnya belum ada** di sprint plan dan sekarang tercakup:

| Fitur | Sprint | Bagian |
|---|---|---|
| **Cuti client** (jatah 30 hari/tahun: catat, akhiri lebih awal, void, detail log, `leave-quota`, blok jadwal `client_on_leave`) | S2 | sprint-2 §4 |
| **Reset Cuti Tahunan** (`leave_resets`), **invoice cuti** (`invoice_type=leave`, kode `CUT`) | S3 | sprint-3 §3 |
| **Credit leave per paket** (`leaveQuota` → `leave_total/leave_used`, ledger `cancel_leave`, paket satuan, `reset_leave`) menggantikan kuota cancel 3x | S2 (pakai di Cancel) + S3 (satuan/reset) | sprint-2 §3.5-C, sprint-3 §3.2-E |
| **Cancel = Off** satu aksi (`POST /schedules/{id}/cancel`, `deduct_credit` wajib) | S2 | sprint-2 §3.3 |
| **Refund** sisa kredit + dampak omzet (Gross vs Verified) | S3 | sprint-3 §3.2-D, §7 |
| **Void hanya bila kredit belum dipakai** (`void_credit_used`), tanpa pilihan revoke | S3 | sprint-3 §3.2-A |
| **Draft kuesioner** (autosave, lanjutkan, hapus saat submit), `invoice_required` (kode gratis) | S1 + S2 | sprint-1 §8 |
| **Libur berentang** dan **libur membatalkan sesi** | S1 + S2 | sprint-1 §6, sprint-2 §3.5-F |
| **Ganti jadwal rutin** (`routine-replace`), `history_note` sesi, Kalender Tim | S2 | sprint-2 §3.2 |
| **Utilisasi Terapis** (`max_sessions_per_month`, Q25) | S1 (kolom) + S3 (dashboard) | sprint-1 §5, sprint-3 §7 |
| Cancellation Rate / Therapist Off Rate, Total Discharge, Gross vs Verified | S3 | sprint-3 §7 |
| Discharge menghanguskan sisa kredit (ledger `discharge`) | S1 + S2 | sprint-1 §7, sprint-2 §3.5-G |
| Rekap harian terapis, re-assessment, export laporan harian ortu | S3 | sprint-3 §5–§6 |
| Hapus cabang + uji integritas FK, migrasi data, training, cutover | S4 | sprint-4 |

## 5. Selisih dokumen yang harus disinkronkan

Ditemukan saat menyusun sprint (sumber kebenaran: `schema.md`). Dibereskan di sprint-4 §10 (atau lebih awal bila memblokir):

| Dokumen | Isi usang | Yang benar |
|---|---|---|
| `implementation_detail.md` §9.1 (7.8, 7.9) | Void dengan `credit_action = keep/revoke` | Void hanya `keep` dan hanya bila kredit belum dipakai; kredit terpakai → **Refund** (`POST /invoices/{id}/refund`, belum ada di dokumen itu) |
| `implementation_detail.md` §8.6 (6.19–6.25) | Off manual `/schedules/{id}/off` + `counts_as_leave`, `deduct_credit` pada cuti, `DELETE /leaves/{id}` | Cancel = Off satu endpoint; cuti memotong saldo 30 hari tanpa `deduct_credit`; tidak ada hapus log; tambah `POST /leaves/annual-reset` dan `GET /leaves/{id}` |
| `implementation_detail.md` §9 | Kuota cancel 3x per paket | Credit leave per paket (`leave_total/leave_used`); `invoice_type=leave`; `reset_leave`; ledger `cancel_leave`, `refund`, `discharge` |
| `implementation_detail.md` §9.1 7.7 | "Tandai Lunas; tanpa Tolak" sudah benar, tetapi `sprint_plan` lama menulis "approve/reject" | Tanpa Tolak |
| `implementation_detail.md` §17.3 | Katalog error kurang | Tambah `void_credit_used`, `leave_overlap`, `leave_no_sessions`, `leave_satuan_monthly`, `client_on_leave`, `must_change_password` |
| `frontend/src/services/api/endpoints.js` | Ada `schedules.off`, `clients.pipelineLogs`, `clients.discharge`; belum ada refund, annual-reset, routine, unreported, portal, utilization | Selaraskan (sprint-4 §10) |
| `CLAUDE.md` vs lama `sprint_plan.md` §7 | "refund (klien: tidak ada)" | **Refund masuk scope.** Yang tidak ada: diskon, DP, cicilan |
| `implementation_detail.md` §2 (peta modul) | "Sprint" M6–M7 berbeda | Ikuti tabel di atas |

## 6. Definition of Done

**Per task / fitur**
- Endpoint sesuai `schema.md` dan `docs/guide/10`; aksi lintas tabel dalam **satu transaksi** dengan `lockForUpdate` (urutan `invoices → client_packages → clients`).
- Tulis memanggil kolom pelaku (`created_by/updated_by`); log khusus (`credit_ledger`, `invoice_logs`, `package_conversions`) di transaksi yang sama. **Tidak ada audit log.**
- List `page/per_page` (default 10) atau keyset; pencarian prefix; `BranchScope` diterapkan.
- Hapus permanen cascade sesuai `schema.md` §6.7 + uji "tidak ada baris yatim"; master terpakai → 409 `in_use`.
- Feature test backend untuk aturan bisnis (kredit, status, hak akses).
- Frontend: interface store/hook tetap, `npm run lint` 0 error, `npm test` dan `npm run build` lolos; cek manual role terkait + ≤768px.
- Docs terkait diperbarui dalam perubahan yang sama.

**Per akhir sprint:** build dibekukan Jumat 14.00 (setelah backup); catatan rilis + daftar skenario Sabtu dikirim ke klien paling lambat Jumat 16.00; smoke test env UAT.

## 7. Rencana UAT (ringkas; detail di `TIMELINE_UAT_KLIEN.md`)

- **Satu lingkungan UAT** dipakai bersama developer, tester, klien (tanpa staging). Deploy Senin–Kamis; Jumat 14.00 sampai UAT selesai = freeze (kecuali hotfix Kritis). Backup sebelum setiap deploy besar. Data uji dua set: `QA-…` (tester) dan `UAT-…` (klien).
- **Penguji:** PIC klien per role (P5) + 1 orang tua uji.
- **Skenario per role:**
  - Admin Inquiry: intake → layanan → terbit kode (gratis/berbayar) → ortu isi (autosave) → admit.
  - Admin Schedule: jadwal berulang → complete → cancel potong (credit leave dulu, lalu kredit) → revert 1x → reschedule → bulk; libur.
  - Finance: invoice → bukti → Tandai Lunas → paket; Void (kredit belum dipakai), invoice pengganti, **Refund**, konversi paket, saldo lebihan, **cuti** (catat/akhiri/void), Reset Cuti Tahunan.
  - Terapis: laporan sesi, summary, cetak. Ortu: riwayat, laporan, kuesioner, bukti dari HP.
  - Master/Manager: dashboard (periode kustom, Gross vs Verified), user & RBAC, Master Cabang (hapus cabang percobaan).
- **Bug:** Kritis ≤ 1 hari kerja, Mayor di minggu yang sama, Minor dikumpulkan, Saran fitur baru = change request.
- **Sign-off:** semua skenario per role lolos, tanpa Kritis/Mayor terbuka, data migrasi dicek klien, persetujuan go-live tertulis (target Sabtu 28 Nov).

## 8. Ritme kerja (solo developer)

| Kapan | Kegiatan |
|---|---|
| Senin pagi | Planning: pecah task harian, triase bug UAT Sabtu lalu |
| Selasa–Kamis | Build + perbaikan |
| Jumat 14.00 | Build dibekukan → deploy UAT → catatan rilis ke klien |
| Jumat sore | Smoke test, review sprint, geser task, perbarui risiko |
| Sabtu | UAT (±10.00–13.00); sore: triase bug |

## 9. Risiko & mitigasi

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Jawaban klien 🔴 terlambat | Migration berubah setelah ada kode | Pakai default `pertanyaan_klien.md`, kunci Rabu 14 Okt; sesudahnya = change request |
| R2 | **S2 terlalu padat** (jadwal + cuti + Finance inti) | Checkpoint 50% meleset | Urutan potong di sprint-2 §8: ledger keyset/`credits/adjust`, `routine-replace`, kalender tim → S3 awal |
| R3 | Bug kredit (saldo ≠ ledger) | Kepercayaan finansial | Test skenario kredit wajib, `credits:reconcile` harian, ledger append-only |
| R4 | VPS/SMTP belum siap | Deploy & OTP tertunda | P3 sebelum S1; fallback VPS developer; reset password oleh Master |
| R5 | Penguji UAT tidak tersedia | UAT molor | PIC per role (P5); jadwal UAT dikirim di S1 |
| R6 | Change request di tengah sprint | Scope membengkak | Masuk fase 2 kecuali kritis; dibahas Jumat |
| R7 | Data lama berantakan | Migrasi lama | Template CSV sejak S1–S2; klien membersihkan sebelum 23 Nov; fallback go-live data kosong |
| R8 | Developer berhalangan | Semua jalur berhenti | Buffer Sabtu/Minggu; prioritaskan M1–M7 |
| R9 | Hapus permanen salah klik | Data hilang | Konfirmasi tegas (ketik kode cabang), invoice lunas tidak bisa dihapus (Void/Refund), backup harian + arsip, uji restore |
| R10 | Hapus cabang besar sinkron lama | Timeout / lock | Satu transaksi atomik per batch, timeout rute dinaikkan, hanya Master, jam sepi |
| R11 | Dokumen usang (`implementation_detail.md`) menyesatkan | Endpoint salah dibangun | Kerjakan dari `schema.md`; daftar selisih §5; sinkron di akhir S4 |
| R12 | Satu lingkungan dipakai bersama | Deploy mengganggu UAT | Aturan freeze Jumat 14.00; smoke 14.00–15.30; rollback ke build sebelumnya |

## 10. Di luar scope (fase 2)

Mengikuti jawaban klien (3 Okt 2026).
- WhatsApp Business API otomatis (versi 1: tombol klik-kirim).
- Satu login ortu untuk banyak anak.
- Upload file dokumen ke server (versi 1: link Google Drive).
- Klasifikasi skor asesmen otomatis berbasis tabel norma.
- Form landing page membuat intake otomatis.
- Invoice biaya satuan selain Paket Sesi, Assessment, dan Cuti.
- **Diskon, DP, cicilan** (klien: tidak ada). *Refund sisa kredit sudah masuk scope.*
- Google Calendar (M14): setelah go-live.

## 11. Dokumen acuan

| Dokumen | Isi |
|---|---|
| `docs/sprint/*.md` | **Rencana rinci per sprint: API, core logic, integrasi FE** |
| `TIMELINE_DEV.md` | Jadwal harian internal, termin, ritme UAT |
| `TIMELINE_UAT_KLIEN.md`, `QA_PANDUAN_*` | Versi klien / panduan tester |
| `schema.md` | Desain DB FINAL, alur transaksi (§06), aturan hapus, invarian |
| `implementation_detail.md` | Peta endpoint × tabel (sebagian usang, lihat §5) |
| `technical_workflow.md` | Alur data per fitur (F1–F25) |
| `docs/guide/10-api-migration.md` | Mapping hook/store frontend → endpoint (terbaru) |
| `docs/guide/11-known-issues.md`, `12-keputusan-klien.md` | Masalah terbuka; keputusan klien + status |
