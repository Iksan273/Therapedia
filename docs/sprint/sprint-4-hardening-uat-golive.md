# Sprint 4 — Hardening, hapus cabang, UAT ronde 2, go-live

**Tanggal:** Senin 23 Nov – Jumat 4 Des 2026 (10 hari kerja = TIMELINE_DEV D7 + D8) · **Progres akhir sprint:** 100% (40/40 hari) · **Go-live Senin 7 Des 2026**, hypercare 7–11 Des
**UAT klien:** Sabtu 28 Nov (#6): **UAT ronde 2 (regresi) + sign-off**. Cadangan Sabtu 5 Des (re-test bug Kritis).
**Modul:** M12 (hapus cabang + uji integritas FK) · hardening · migrasi data · pembersihan FE (matikan mode demo) · training · cutover · M14 Google Calendar (setelah go-live)
**Rujukan:** `schema.md` §6.7, §11; `implementation_detail.md` §4.3, §14–§16; `docs/guide/13-docker-deploy.md`, `14-runbook-deploy-vps.md`; `TIMELINE_UAT_KLIEN.md`; `TIMELINE_DEV.md` D7–D8.
**Prasyarat:** semua fitur selesai di Sprint 3; UAT #5 (21 Nov) sudah berjalan dan temuan terkumpul.

> Sprint ini **tanpa fitur baru**. Isinya: satu fitur berisiko (hapus cabang), pengerasan, migrasi, memperbaiki temuan UAT, dan cutover. Scope baru = change request (fase 2) kecuali Kritis.

---

## 1. Tujuan & Selesai bila

**Tujuan:** sistem lolos sign-off UAT (28 Nov), data produksi termigrasi, staf terlatih, dan go-live berjalan tanpa bug Kritis/Mayor terbuka.

**Selesai bila:**
- [ ] Hapus cabang atomik berjalan, **uji integritas FK**: tidak ada baris yatim setelah hapus client dan cabang; master terpakai ditolak 409.
- [ ] Hardening selesai: rate limit, CORS, HTTPS, uji policy per role, `EXPLAIN ANALYZE` Q1–Q25 pada ±50 ribu sesi (tiap query dalam target `schema.md` §01).
- [ ] Skrip migrasi data lama berjalan di data contoh; hasil dicek klien (Rab 2 Des).
- [ ] Tidak ada bug Kritis/Mayor terbuka; **sign-off UAT tertulis Sabtu 28 Nov**.
- [ ] Freeze 3–4 Des; backup penuh + **uji restore berhasil**; `credits:reconcile` bersih setelah migrasi.
- [ ] `VITE_DATA_SOURCE=api` di produksi; mode demo/`RoleSelect` tidak terjangkau; domain produksi + SSL/CORS benar.
- [ ] Dokumen diperbarui: `docs/guide/*`, `endpoints.js`, `implementation_detail.md` (sinkron `schema.md`), `11-known-issues.md`.

## 2. Urutan kerja

| Hari | Tgl | Pekerjaan | Est. |
|---|---|---|---|
| 1 | Sen 23 | **Hapus cabang atomik** + **uji integritas FK** | 0,5 |
| 1 | Sen 23 | Triase temuan UAT #5 (Sabtu 21 Nov): Kritis/Mayor/Minor/Saran | 0,25 |
| 2 | Sel 24 | **Hardening**: rate limit, CORS, HTTPS, uji policy per role, `EXPLAIN ANALYZE` | 0,5 |
| 3 | Rab 25 | **Skrip migrasi** (template CSV klien) + **panduan pengguna** singkat per role | 0,5 + 0,5 |
| 4 | Kam 26 | **Bug bash** semua role + mobile 375px (portal ortu, `/assessment`) | 0,5 |
| 1–5 | Sen–Jum | **Perbaikan temuan UAT #5** (Kritis ≤ 1 hari kerja, Mayor minggu ini) | 2,5 |
| 5 | Jum 27 | Build regresi dibekukan 14.00 untuk UAT #6 | — |
| 6 | Sen 30 | Tagih Termin 3. Perbaikan temuan UAT #6 | 1,0 |
| 6–8 | Sen–Rab | **Training** staf per role (sesi + panduan), rekam singkat | 1,5 |
| 8 | Rab 2 | Cek hasil migrasi bersama klien | 0,5 |
| 9 | Kam 3 | **FREEZE** (tanpa perubahan kode). Backup penuh + **uji restore**, migrasi produksi, `credits:reconcile`, uji asap | 1,0 |
| 10 | Jum 4 | **Cutover**: domain, `VITE_DATA_SOURCE=api`, matikan mode demo, cek SSL/CORS | 0,5 |
| — | Sab 5 | Cadangan: re-test bug Kritis bersama klien | 0,5 |
| — | **Sen 7** | **GO-LIVE**; hypercare 7–11 Des (SLA Kritis ≤ 4 jam kerja) | |

### Dependensi
| Yang dibutuhkan | Cara |
|---|---|
| Hapus cabang menyentuh semua tabel turunan | Baru aman setelah semua modul stabil (Sprint 3); sengaja diletakkan terakhir agar uji FK mencakup seluruh tabel |
| Migrasi butuh data klien | Template CSV dikirim di Sprint 1–2; data bersih dari klien paling lambat 23 Nov. Bila terlambat → migrasi ditunda ke setelah go-live (go-live dengan data kosong + input manual) — keputusan Selasa 24 Nov |
| Training butuh sistem stabil | Hanya setelah sign-off 28 Nov; perubahan sesudahnya hanya bug Kritis |
| Cutover | Backup + restore terbukti dulu (Kam 3 Des), baru produksi |

---

## 3. M12 Hapus cabang atomik + uji integritas FK

### API
| # | Endpoint | Action | Akses | Request | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 2.17 | `GET /branches/{id}/delete-impact` | pratinjau (sudah Sprint 1) | `branch_master`+hapus | — | count `clients,schedules,invoices,users,holidays` | untuk dialog |
| 2.18 | `DELETE /branches/{id}` | `DeleteBranchAction` | **hanya `master`** | `confirm_code` = kode cabang | cascade seluruh isi cabang | 200 + ringkasan jumlah client/sesi/invoice/akun terhapus; **422 `confirm_code_mismatch`**; timeout rute dinaikkan |

### Core logic (sinkron, atomik, ADR 0005)
1. Wajib role `master` + `confirm_code` cocok.
2. Satu `DB::transaction()` — semua atau tidak sama sekali — dengan urutan: `schedules` per batch (`chunkById(1000)`) → `clients` per batch (cascade ke seluruh turunan: layanan, dokumen, kode/respons/draft kuesioner, seri, `client_leaves`+`client_leave_sessions`, invoice+bukti+log, paket, konversi, ledger) → sisa `invoices`/`credit_ledger` cabang → `holidays` cabang → `users` yang `branch_id`-nya cabang itu (FK `RESTRICT`; dihapus eksplisit setelah semua sesinya hilang karena `schedules.therapist_id` `RESTRICT`) → `branches`.
3. Akun `branch_id NULL` (mis. master) **tidak tersentuh**.
4. Sebelum `DELETE`, kumpulkan path file bukti bayar; **setelah commit** hapus file dari storage privat sinkron (gagal hanya dilog).
5. Tulis **satu baris log aplikasi** (file, bukan tabel): pelaku, cabang, jumlah baris.
6. Konfigurasi: `set_time_limit(0)` pada rute ini + `proxy_read_timeout` Nginx dinaikkan (±300 dtk) hanya untuk `DELETE /branches/{id}`; jalankan di luar jam operasional. Kedalaman cascade terpanjang (< 15 tingkat) di bawah batas InnoDB.

### Uji integritas FK (wajib lolos sebelum sign-off)
| Skenario | Yang dicek |
|---|---|
| Hapus client lengkap (punya jadwal, laporan, invoice, bukti, paket, ledger, konversi, kode+draft kuesioner, cuti) | `COUNT(*)` di setiap tabel turunan = 0 untuk client itu; file bukti terhapus |
| Hapus cabang berisi data lengkap + akun terapis | Tidak ada baris yatim di 37 tabel (query `LEFT JOIN … WHERE parent IS NULL` otomatis per FK); akun master utuh; cabang lain tak berubah |
| Hapus gagal di tengah (simulasi exception) | Rollback total: jumlah baris semua tabel tidak berubah |
| Master terpakai (`services`, `quadrants`, `master_packages`, `assessment_*`, `roles`) | 409 `in_use` dengan alasan; FK `RESTRICT` menolak bila service dilewati |
| Role non-master mencoba hapus client/cabang | 403 |
| Hapus invoice `paid`/`void` | 409 `invoice_not_deletable` |

### Integrasi FE

> **Aturan fetch (wajib, tiap modul):** halaman hanya memanggil endpoint untuk data yang benar-benar dibacanya; daftar baru diambil saat ada komponen yang membacanya (`useDemand`), bukan saat login. Rincian: `docs/guide/08` bagian "Fetch hanya yang diperlukan".
`features/master/hooks/useBranchDeleteActions.js` → `DELETE branches.detail(id)` (loading panjang, ketik kode cabang, tampilkan ringkasan); `BranchManagement.js` memakai `GET …/delete-impact`. Hapus client: `useClientDeleteActions` (Sprint 2) hanya tampil bila `role === master` (`DeleteButton`/`masterOnly`).

---

## 4. Hardening

| Item | Pekerjaan | Kriteria selesai |
|---|---|---|
| Rate limit | `throttle` login staf/ortu, OTP, `/public/*` (per IP + per kode), upload bukti | respons 429 berbahasa Indonesia; FE menampilkannya spesifik |
| CORS | Origin produksi saja (frontend satu stack Docker via Nginx proxy `/api`, ADR 0006) | tidak ada `*`; preflight lolos dari domain produksi |
| HTTPS | Sertifikat + redirect HTTP→HTTPS, HSTS | SSL Labs / cek manual |
| Header & sesi | cookie `Secure` bila dipakai, `X-Frame-Options`, `X-Content-Type-Options`; `APP_DEBUG=false`; storage bukti bayar **privat** (bukan `public`), URL bertanda tangan | tidak ada file bukti dapat diakses tanpa auth |
| Uji policy per role | matriks 7 role + role kustom × modul: tiap endpoint dipanggil dengan tiap role; 403 bila tanpa modul; 404 untuk data cabang lain; hapus client/cabang hanya master | tabel hasil disimpan di `docs/` (lampiran UAT) |
| Mass assignment & validasi | Form Request di semua tulis; tidak ada `$guarded = []`; `version` wajib di entity ber-lock | review otomatis + manual |
| `EXPLAIN ANALYZE` | Q1–Q25 pada ±50 ribu sesi dummy (seeder performa) | tiap query memakai indeks yang dirancang; target latensi `schema.md` §01 (mis. Q24 < 20 ms, Q25 < 50 ms) |
| Dependency | `composer audit`, `npm audit` | tanpa celah Kritis |

---

## 5. Migrasi data lama

- **Sumber:** data klien (G1) lewat **template CSV** yang dikirim sejak Sprint 1–2: client + biodata, layanan, status, paket aktif + sisa kredit, jadwal rutin (opsional).
- **Skrip artisan** `migrate:legacy` (idempotent, mode `--dry-run`):
  1. Validasi CSV (kolom wajib, format tanggal `yyyy-MM-dd`, duplikat nama+tgl lahir → laporan, bukan error).
  2. Buat client lewat `CreateClientAction` (kode `AE-xxxxx` baru dari counter; **kode lama disimpan** di `intake_note`/kolom referensi bila ada) — jangan menulis kode manual agar counter tetap konsisten.
  3. Paket aktif: buat `client_packages` + ledger `purchased`/`manual_adjust` (alasan "migrasi") sehingga **saldo = Σ ledger** sejak awal; `leave_total` dari `leave_quota` paket; `clients.leave_granted` default 30 dengan `leave_reset_at` = tanggal migrasi.
  4. Status client diset via `TransitionClientAction` (tanpa efek samping discharge).
  5. Laporan akhir: dibuat / dilewati / error per baris (CSV hasil untuk klien).
- **Verifikasi:** `credits:reconcile` 0 selisih; klien mencocokkan sampel (Rab 2 Des).
- **Risiko:** data berantakan (R7) → klien membersihkan sebelum 23 Nov; bila tidak siap, **go-live dengan data kosong** dan migrasi menyusul tanpa memblokir go-live.

---

## 6. Perbaikan temuan UAT

| Tingkat | Aturan |
|---|---|
| Kritis | ≤ 1 hari kerja (Sabtu bila memblokir UAT) |
| Mayor | di minggu yang sama |
| Minor | dikumpulkan, dikerjakan bila sisa waktu, jika tidak → daftar pasca go-live |
| Saran fitur baru | change request (fase 2) |
Satu daftar bug (kolom: role, langkah, hasil, screenshot, tingkat). Tiap perbaikan: test regresi bila menyangkut kredit/status. Bug di luar scope dicatat di `docs/guide/11-known-issues.md`. Deploy hanya Senin–Kamis dengan backup; Jumat 14.00 freeze untuk UAT.

## 7. Training & panduan

| Sesi | Peserta | Materi utama |
|---|---|---|
| Admin Inquiry | admin_inquiry | intake, layanan, kode kuesioner (gratis vs berbayar), draft, outcome, hapus (hanya master) |
| Admin Schedule | admin_schedule | kalender, jadwal berulang, Cancel/Off (potong credit leave vs kredit sesi), revert 1x, bulk, libur, monitoring laporan |
| Finance | finance | invoice, bukti, Tandai Lunas, renewal 2 jalur, Void vs Refund, pengganti, konversi, saldo lebihan, cuti & Reset Cuti Tahunan |
| Terapis | therapist | jadwal, laporan sesi, summary, cetak |
| Manager/Master | manager, master | dashboard (periode kustom), user & RBAC, Master Cabang (hapus = permanen) |
| Orang tua | (opsional/sample) | portal, kuesioner, unggah bukti dari HP |
Output: panduan singkat per role (PDF/Markdown di `docs/`), rekaman layar, daftar kontak hypercare.

---

## 8. Cutover & go-live

| Langkah | Detail | PIC |
|---|---|---|
| T-7 (Sen 30 Nov) | Tagih Termin 3; konfirmasi daftar akun produksi (staf + role + cabang) dan password sementara | dev/klien |
| T-4 (Kam 3 Des) | **Freeze kode.** Backup penuh → **uji restore** di database terpisah (baca beberapa tabel + hitung ulang saldo) → migrasi produksi → `credits:reconcile` → uji asap per role (login, jadwal, invoice, portal) | dev |
| T-3 (Jum 4 Des) | Arahkan domain produksi; `VITE_DATA_SOURCE=api`, **matikan mode demo** (`/roles` tidak dapat dipakai untuk masuk); cek SSL/CORS; cron `schedule:run` + backup harian aktif; verifikasi email OTP produksi | dev |
| T-2 (Sab 5 Des) | Re-test bug Kritis bersama klien (cadangan) | dev + klien |
| **T (Sen 7 Des)** | **Go-live.** Pantau log error, antrean login, saldo reconcile 02:00 | dev |
| Hypercare 7–11 Des | Standby; SLA Kritis ≤ 4 jam kerja; triase harian; ringkasan harian ke klien | dev |
| 12 Des | Review pasca go-live; daftar fase 2 | dev + klien |

Rollback: bila uji asap produksi gagal sebelum go-live → tetap di UAT, ulangi dari backup; setelah go-live → restore dari backup terakhir hanya dengan persetujuan klien (data setelah backup hilang).

## 9. Setelah go-live — M14 Google Calendar (mulai 14 Des, ±2–3 hari)

Sinkron satu arah sesi → Google Calendar per user, dipanggil **sinkron setelah commit** (kegagalan dilog, sesi tetap tersimpan).
| # | Endpoint | Fungsi | Tabel |
|---|---|---|---|
| 14.1 | `GET /integrations/google/redirect`, `GET /integrations/google/callback` | OAuth | `google_calendar_integrations` (token terenkripsi) |
| 14.2 | `PATCH /integrations/google` | aktif/nonaktif | `google_calendar_integrations` |
| 14.3 | hook pada Create/Reschedule/Cancel/Delete sesi | kirim/ubah/hapus event | `schedules.google_event_id` |
Tidak masuk 40 hari rencana; tabel ke-38 dibuat pada fase ini.

## 10. Sinkronisasi dokumen (wajib di akhir sprint)

| Dokumen | Tindakan |
|---|---|
| `frontend/src/services/api/endpoints.js` | selaraskan dengan semua endpoint ✚ Sprint 1–3; hapus `schedules.off`, `clients.pipelineLogs`, `clients.discharge` |
| `implementation_detail.md` | perbarui §8.6 (cuti: tanpa `deduct_credit`, tanpa `DELETE`, tanpa Off manual) dan §9 (Void hanya `keep` + Refund + credit leave + invoice cuti); hapus kode `invoice_not_voidable` bila tidak dipakai, tambah `void_credit_used`, `leave_*`, `client_on_leave` ke katalog §17.3 |
| `docs/guide/10-api-migration.md` | tandai baris *(baru)* yang sudah terimplementasi |
| `docs/guide/11-known-issues.md` | catat temuan Minor/Saran yang tidak dikerjakan |
| `docs/guide/12-keputusan-klien.md` | status implementasi backend |
| `TIMELINE_DEV.md` §7 | progres akhir, tanggal aktual |

## 11. Risiko khusus sprint ini

| Risiko | Mitigasi |
|---|---|
| Hapus cabang besar sinkron lama (R10) | Batch + satu transaksi, timeout dinaikkan, hanya master, jam sepi, uji dengan ±50 ribu sesi sebelum UAT #6 |
| Salah klik hapus permanen (R9) | Ketik kode cabang, pratinjau dampak, backup harian + arsip, uji restore sebelum go-live |
| Temuan UAT #5/#6 banyak | Jatah 2,5 hari + 1 hari; Kritis menggeser training; Minor tunda ke pasca go-live |
| Migrasi data tidak siap | Go-live dengan data kosong; migrasi menyusul (tidak memblokir sign-off) |
| Freeze bocor (perubahan kode setelah 3 Des) | Hanya hotfix Kritis, dengan persetujuan tertulis dan backup |
| Developer berhalangan | Sabtu/Minggu buffer ±1 hari/minggu; runbook `14-runbook-deploy-vps.md` mutakhir |
