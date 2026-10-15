# Sprint 3 — Finance lanjutan, portal, dashboard, job

**Tanggal:** Senin 9 Nov – Jumat 20 Nov 2026 (10 hari kerja = TIMELINE_DEV D5 + D6) · **Progres akhir sprint:** 75% (30/40 hari)
**UAT klien:** Sabtu 14 Nov (#4): Finance & kredit. Sabtu 21 Nov (#5): **UAT ronde 1 menyeluruh** (semua role + portal + dashboard).
**Modul:** M7 Finance lanjutan (void, pengganti, konversi, refund, credit leave, cuti Finance, saldo lebihan) · M8 Active client · M9 Portal terapis · M10 Portal ortu · M11 Dashboard · M13 Job
**Rujukan:** `schema.md` §06.5–§06.8, §07, §11; `implementation_detail.md` §9–§13, §15; `docs/guide/06`, `07`, `10`; ADR 0003; `TIMELINE_DEV.md` D5–D6.
**Prasyarat:** Sprint 2 selesai (jadwal, ledger, cuti dasar, invoice + Tandai Lunas, `RelinkUpcomingSchedules`).

> **`implementation_detail.md` §9 (Void "revoke", `credit_action`) sudah usang.** Aturan final di `schema.md` §06.5: **Void hanya untuk invoice yang kreditnya belum dipakai dan selalu mempertahankan kredit**; kredit yang sudah berjalan dikembalikan lewat **Refund**. Tidak ada pilihan keep/revoke.

---

## 1. Tujuan & Selesai bila

**Tujuan:** semua alur Finance pada `docs/guide/06` dapat dijalankan via API; portal terapis/ortu, Active Client, dan semua dashboard memakai API; job harian aktif; env UAT final siap UAT ronde 1.

**Selesai bila:**
- [ ] Void (alasan wajib, kredit belum dipakai) + invoice pengganti tanpa kredit dobel; Refund; Konversi paket; Saldo Lebihan; credit leave per paket; Reset Cuti Tahunan; invoice cuti; semua lolos test.
- [ ] `credits:reconcile` menemukan 0 selisih pada data uji; saldo = Σ ledger di semua skenario.
- [ ] Portal terapis/ortu, Active Client, 6 dashboard (revenue, inquiry, schedule, branch, utilisasi, client-analytics) tampil dengan filter cabang + periode (termasuk kustom).
- [ ] Semua role dapat menjalankan seluruh skenario di `TIMELINE_UAT_KLIEN.md` §5 di env UAT.
- [ ] Env UAT bersih: data uji developer dihapus, seed `QA-…` dan `UAT-…` lengkap, akun per role, Postman → Swagger.
- [ ] Build dibekukan Jumat 14 Nov (UAT #4) dan Jumat 20 Nov (UAT #5), 14.00.

## 2. Urutan kerja

| Hari | Tgl | Pekerjaan | Est. |
|---|---|---|---|
| 1–2 | Sen–Sel 9–10 | **Void + invoice pengganti**, `void-preview`, `replacement-candidates`, tab **Saldo Lebihan** (Q23). Invoice `leave` (jenis ketiga) | 1,0 |
| 3–4 | Rab–Kam | **Konversi paket** + `convert-preview` + `package_conversions` + `GET invoices/{id}/logs` | 1,0 |
| 4 | Kam 12 | **Refund** (+ dampak omzet) · **Credit leave per paket** (satuan / `reset_leave`) | 0,5 + 0,5 |
| 5 | Jum 13 | **Cuti Finance:** Reset Cuti Tahunan, invoice cuti ↔ log cuti. FE finance lanjut (Void/pengganti/Refund/Konversi/Saldo Lebihan/Cuti). Build dibekukan UAT #4 | 1,0 + 0,5 |
| 6 | Sen 16 | **Test kredit wajib** + `credits:reconcile` | 0,75 |
| 7–8 | Sel–Rab | **Portal:** terapis, ortu, Active Client (roster, profil, birthday, analitik) | 1,25 |
| 8–9 | Rab–Kam | **Dashboard:** revenue, inquiry, schedule, branch, utilisasi terapis/cabang, client-analytics, rekap harian terapis | 1,5 |
| 9 | Kam 19 | **Job:** `credits:reconcile` 02:00, housekeeping 04:00, backup harian + arsip, `db:analyze` | 0,5 |
| 10 | Jum 20 | **Bersihkan env UAT**; perbaikan bug UAT #3–#4 (sisa); build dibekukan UAT #5 | 0,5 + 0,5 |

### Dependensi lintas sprint
| Yang dibutuhkan | Cara |
|---|---|
| Void/refund/konversi memindah atau menghapus jadwal mendatang | Memakai `RelinkUpcomingSchedules` dari Sprint 2; **urutan kerja: void (hari 1–2) sebelum refund (hari 4)** karena pengganti memakai paket void |
| Konversi menghapus jadwal terapi mendatang | Query hapus sama dengan pola Discharge Sprint 2 (`status IN scheduled, reschedule_pending`, `type=therapy`) |
| Dashboard butuh data semua modul | Dikerjakan **setelah** Finance lanjutan dan portal (hari 8–9) agar view `v_daily_*` terisi data nyata dari UAT #4 |
| Refund memengaruhi omzet | Ubah `v_daily_revenue` (sudah ada kolom `gross_revenue`, `refund_total`, `revenue` di `schema.md`) → verifikasi migration view sebelum membuat endpoint revenue |

---

## 3. M7 Finance lanjutan

### 3.1 API
| # | Endpoint | Action | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 7.8 | `POST /invoices/{id}/void` | `VoidInvoiceAction` | `finance` | `reason` (wajib) | `invoices` U (`void`,`void_reason`,`voided_at/by`,`void_credit_action=keep`); `invoice_logs` (`voided`) | 409 selain `paid`; **422 `void_credit_used`** bila kredit sudah dipakai / paket dikonversi / sudah direfund |
| 7.9 ✚ | `GET /invoices/{id}/void-preview` | pratinjau dialog Void | `finance` | — | `client_packages`,`schedules` R | paket, sisa kredit, sesi selesai terpakai, sesi mendatang, `can_void` + alasan |
| 7.3 ✚ | `GET /invoices/replacement-candidates?client_id=` | kandidat invoice void untuk dialog Buat Tagihan/Renewal | `finance` | `client_id` | `invoices`,`client_packages` R | hanya `void` + `keep`, belum diganti |
| 7.2b | `POST /invoices` / `POST /clients/{id}/renewals` dengan `replaces_invoice_id` | pengganti | `finance` | `replaces_invoice_id` **wajib dipilih** (atau `null` eksplisit) bila ada kandidat | `invoices` C; `client_packages.invoice_id` dipindah | 422 `replacement_invalid` (bukan void/keep, client beda, sudah diganti — UNIQUE) |
| ✚ | `POST /invoices` jenis `leave` | invoice cuti (kode `CUT`) | `finance` | `client_id,invoice_type=leave,amount(>0),leave_id?` | `invoices` C(`leave_id`) | `credits=0`, tanpa paket; `leave_id` hanya log belum void |
| 7.14 ✚ | `GET /invoices/{id}/convert-preview` | hitung otomatis | `finance` | `target_package_id,sessions?` | `client_packages`,`master_packages`,`schedules` R | sisa nilai, `max` sesi tujuan, lebihan, jumlah jadwal terhapus |
| 7.15 | `POST /invoices/{id}/convert-package` | `ConvertPackageAction` | `finance` | `target_package_id`, `sessions?` (manual), `reason` (**wajib**) | `client_packages` U+C; `credit_ledger` (`converted_out/in`); `package_conversions` C; `clients`; `invoice_logs` (`converted`); `schedules` D | 422 `convert_not_allowed` (invoice bukan `paid`/package, paket tak hidup, `max<1`, manual > otomatis) |
| ✚ | `POST /invoices/{id}/refund` | `RefundInvoiceAction` | `finance` | `amount` (0 < amount ≤ `invoices.amount`), `reason` | `invoices` U (`refund_amount/at/by/reason/credits`); `client_packages` U; `credit_ledger` (`refund`); `clients`; `schedules` U; `invoice_logs` (`refunded`) | 409/422 bila invoice bukan `paid` package, sudah direfund, atau tak ada sisa kredit |
| 7.11 | `GET /invoices/{id}/logs` | tombol Log | `finance` | `cursor` | `invoice_logs` (`idx_invlog_invoice`) | keyset, terbaru dulu |
| 7.18 | `GET /credits/leftover-balances` | tab Saldo Lebihan | `finance` | `branch_id,q,include_zero,page` | `clients` (`idx_clients_leftover`),`package_conversions` (`idx_conv_client`),`invoices` | `in_sync` = saldo tersimpan vs (Σ masuk − Σ terpakai) |
| 6.26 ✚ | `POST /leaves/annual-reset` | `AnnualLeaveResetAction` | `finance` | `confirm=true` | `clients` U (`leave_granted=30`,`leave_reset_at`); `leave_resets` C | respons `{clients_count, forfeited_days}`; **pratinjau** lewat `GET /leaves/annual-reset-preview` |
| ✚ | `POST /invoices` / `/renewals` dengan `reset_leave=true` | reset credit leave saat renewal paket satuan | `finance` | `reset_leave` | `invoices.reset_leave`; `client_packages.leave_total` | lihat core logic 3.2 |

> `POST /invoices/{id}/verify` dan `/clients/{id}/renewals` (Sprint 2) diperluas: mendukung `replaces_invoice_id` dan `reset_leave`.

### 3.2 Core logic

**A. Void** (`VoidInvoiceAction`, satu transaksi; lock `invoices → client_packages → clients`)
1. Status harus `paid` (belum lunas **dihapus**, bukan di-void). Untuk jenis package tolak 422 `void_credit_used` bila paket akar `remaining_credit < total_credit`, ada sesi `completed` yang memakai rantai paketnya, paket sudah `converted`, atau sudah direfund.
2. `status=void`, `void_reason`, `voided_at/by`, `void_credit_action=keep`; `invoice_logs` `voided`.
3. Paket, sisa kredit, dan jadwal **tidak berubah** (paket tetap menunjuk invoice void sampai ada pengganti). Invoice `void` tidak ikut `v_daily_revenue` (hanya `paid`), tidak masuk antrean, dan invoice assessment `void` tidak lagi menahan gating.

**B. Invoice pengganti**: bila client punya invoice `void`+`keep` yang paketnya belum diambil alih, Finance **wajib memilih** (tanpa default) invoice baru "menggantikan" atau "paket baru". Saat pengganti `paid` (Tandai Lunas / renewal langsung): **tidak** membuat `client_packages` baru dan tidak menambah kredit; `client_packages.invoice_id` paket lama dipindah ke invoice pengganti, `package_price` diperbarui ke nominal gross; `invoice_logs` `verified` mencatat penggantian. `replaces_invoice_id` UNIQUE mencegah satu invoice void diganti dua kali.

**C. Konversi paket** (`ConvertPackageAction`)
1. Lock invoice + paket hidup (ikuti rantai `converted_to_package_id`); invoice `paid`, `invoice_type=package`, paket `active` dengan `remaining_credit > 0`.
2. `remaining_value = remaining × (harga bayar paket ÷ total_credit)`; `max = floor(remaining_value ÷ harga per sesi tujuan)`. `sessions` kosong → otomatis = `max`; diisi → manual (`reason` wajib), `1 ≤ sessions ≤ max`; **tidak boleh ada kekurangan bayar**. `leftover = remaining_value − sessions × harga per sesi tujuan`. `max < 1` → 422.
3. Paket lama → `converted` (`remaining_credit=0`, `converted_to_package_id`); paket baru (`converted_from_package_id`, `package_price = sessions × harga/sesi tujuan`, **`cancel_count` disalin**); ledger `converted_out` (−sisa) + `converted_in` (+sessions) berbagi `conversion_id`; `clients.credit_balance` diperbarui; `clients.leftover_balance += leftover`.
4. **Hapus permanen jadwal terapi mendatang** client (`scheduled`/`reschedule_pending`, `type=therapy`); completed/cancelled/rescheduled & asesmen tidak disentuh; `deleted_schedule_count` dicatat. Tulis `package_conversions` dan `invoice_logs` (`converted`). Tanpa revert.
5. **Saldo lebihan** hanya memotong invoice jenis `package` berikutnya (sampai sebesar nominal); `invoice_logs` `balance_applied`. Hapus invoice belum lunas mengembalikan `balance_applied`.

**D. Refund sisa kredit** (`RefundInvoiceAction`)
1. Hanya invoice `package` `paid` dengan `refund_amount IS NULL` dan paket hidup masih bersisa kredit.
2. Nominal usulan = sisa kredit × harga/sesi (`package_price ÷ total_credit`), **boleh diubah Finance** (0 < amount ≤ `invoices.amount`).
3. Satu transaksi: isi `refund_amount/refunded_at/refunded_by/refund_reason/refund_credits`; paket ujung rantai → `status=voided`, `is_refunded=1`, `remaining_credit=0`; ledger `refund` (−sisa); update `clients.credit_balance`; sesi **mendatang** pada paket itu dipindah ke paket aktif tertua lain, bila tak ada → `client_package_id=NULL` (Frozen, **tidak dihapus**); `invoice_logs` `refunded`. Invoice tetap `paid`.
4. **Dampak omzet:** `gross_revenue` tetap memuat nominal; `refund_total` = Σ `refund_amount`; **`revenue` (Verified) = Σ(amount − refund_amount)**; view `v_daily_revenue` menampilkan ketiganya.

**E. Credit leave per paket**
- Master paket `leave_quota` → di-snapshot ke `client_packages.leave_total` saat paket aktif (Sprint 2). Sprint ini menambah aturan paket **satuan** (`is_satuan`): melanjutkan sisa paket sebelumnya, kecuali Finance mencentang `reset_leave` pada renewal → diisi ulang ke `leave_quota`, sisa lama hangus. Spesifikasi acuan: `prepareLeaveCredit` di `frontend/src/domain/credit.js` (+ test). `clients.leave_credit_balance` = Σ sisa credit leave paket `active/depleted`.
- **Dua jatah berbeda:** credit leave per paket (dipakai Cancel/Off) ≠ jatah cuti 30 hari/tahun (hanya cuti Finance).

**F. Reset Cuti Tahunan** (satu transaksi, tanpa job): hitung `forfeited_days = Σ GREATEST(0, leave_granted − terpakai)` **sebelum** update → `UPDATE clients SET leave_granted=30, leave_reset_at=:hari_ini` → insert `leave_resets (reset_date, by, clients_count, forfeited_days)`. Pemakaian sebelum tanggal reset tidak dihitung; hari cuti sesudahnya tetap memotong saldo baru. Log cuti tidak dihapus; tidak bisa dibatalkan.

**G. Invoice cuti** (`invoice_type=leave`): nominal manual > 0, `credits=0`, tanpa paket; lunas tanpa menambah kredit/paket; opsional tersambung `leave_id` (log belum void); void/akhiri log tidak mengubah invoice; hapus log → `SET NULL`.

### 3.3 Integrasi FE

> **Aturan fetch (wajib, tiap modul):** halaman hanya memanggil endpoint untuk data yang benar-benar dibacanya; daftar baru diambil saat ada komponen yang membacanya (`useDemand`), bukan saat login. Rincian: `docs/guide/08` bagian "Fetch hanya yang diperlukan".
| Hook / store | Halaman / komponen | Endpoint | Catatan |
|---|---|---|---|
| `useInvoiceVoidActions` | `VoidInvoiceDialog.js`, `ReplacementChoice.js` | `invoices.void`, `invoices.voidPreview`, `invoices.replacementCandidates` | Tombol Void hanya bila `can_void`; hapus pilihan keep/revoke di UI bila masih ada |
| `useInvoiceRefundActions.refundInvoiceAction` | `RefundInvoiceDialog.js` | `invoices.refund` | Nominal usulan otomatis, bisa diubah |
| `usePackageConversionActions.convertInvoicePackage` | `ConvertPackageDialog.js` | `invoices.convertPreview`, `invoices.convertPackage` | Preview dari server; alasan wajib bila manual |
| `creditsStore` | `LeftoverTab.js`, `InvoiceLogDialog.js`, `BalanceHint.js` | `credits.leftoverBalances`, `invoices.logs` | Saldo lebihan tampil di `CreateInvoiceDialog` |
| `useLeaveActions.resetAllBalances` | `features/finance/components/leave/*` | `leaves.annualReset`, pratinjau | Dialog konfirmasi menampilkan `forfeited_days` |
| `RenewalDialog.js`, `CreateInvoiceDialog.js` | | `invoices.list`, `clients.renewals` | Kolom `replaces_invoice_id`, `reset_leave`, jenis `leave` |

---

## 4. M8 Active client

| # | Endpoint | Akses | Request kunci | Tabel | Catatan |
|---|---|---|---|---|---|
| 8.1 | `GET /clients?status=admitted,discharged,discontinued` | `active_clients` | `status[],credit_status,branch_id,q` | `clients` (`idx_clients_roster`),`client_packages` | kolom Paket Kredit Aktif: hanya paket bersisa digabung per jenis; bila semua habis → 1 paket terakhir (Frozen) |
| 8.2 ✚ | `GET /clients/{id}/profile` | `active_clients` | `from,to,page` | `clients`,`client_packages`,`schedule_series`,`schedules`,`credit_ledger` | paket + credit leave & `cancel_count` per paket, jadwal rutin, jadwal aktif, riwayat sesi (10/hal), `booking_note` |
| 8.3 | `POST /clients/{id}/transition` | `active_clients` | (S1) | | discharge/discontinue/reaktivasi dari roster |
| 8.4 ✚ | `GET /clients/birthdays?month=&branch_id=` | `active_clients` | | `clients` (`idx_clients_birthday`, generated `birth_month`) | Q7, tanpa job |
| 8.5 ✚ | `GET /dashboards/client-analytics` | `active_clients` | `branch_id,therapist_id,period,start,end,q,sort,page` | `clients`,`schedules`,`credit_ledger`,`client_packages` | **Tidak hadir = hanya cancel yang memotong kredit** (`cancel_penalty` belum di-reversal); kehadiran % = hadir ÷ (hadir + tidak hadir) |

**Core logic:** semua list memakai `BranchScope` + `q` prefix. Sesi asesmen (re-assessment) untuk client `admitted` **tidak mengubah status** (otomatis hanya maju). Birthday: `birth_month` generated column; ulang tahun lewat query, bukan job.
**FE:** `features/schedule/pages/ActiveClients.js`, `ActiveClientDetail.js` + `components/analytics`, `components/clientDetail`; `clientsStore`.

## 5. M9 Portal terapis

Akses `therapist_module`; semua data difilter `therapist_id = user` oleh server.

| # | Endpoint | Request kunci | Tabel | Catatan |
|---|---|---|---|---|
| 9.1 | `GET /schedules` (own) | `from,to,q,client_id` | `schedules`,`clients` | server memaksa `therapist_id=user` |
| 9.2 | `GET /dashboards/therapist-summary` | `period,start,end,client_id,report_status,q,tab,page` | view `v_therapist_sessions` | Session Feed + Rangkuman Client + rekap harian; Q17; cari nama/ortu/kode + isi laporan |
| 9.3 ✚ | `GET /therapist/clients` | `q,page` | `clients`,`schedules` | client yang pernah dijadwalkan padanya |
| 9.4 ✚ | `GET /therapist/clients/{id}` | `q,page` | `clients`,`schedules`,`session_reports`,`client_packages`,`assessment_responses`,`client_documents` | biodata, riwayat sesi (cari terapis/status/tanggal/isi laporan), credit leave & `cancel_count` per paket (read-only), GDrive, hasil asesmen |
| 9.5 | `PUT /schedules/{id}/report` | | `session_reports` | terapis hanya sesinya (Sprint 2) |
| 9.6 ✚ | `GET /clients/{id}/report-print` | | sama 9.4 | cetak tidak dicatat |

**FE:** `features/therapist/pages/MySchedule.js`, `TherapistSummary.js`, `TherapistClientDetail.js`, `PrintClientReport.js`, `components/summary`, `SessionReportModal.js`, `ViewAsTherapistBar.js` / `useActingTherapist.js` (mode "lihat sebagai terapis" untuk master/manager tetap lewat parameter, bukan mengubah token).

## 6. M10 Portal orang tua

Guard `client`; semua data milik `auth.client_id`. Mobile-first (uji 375px). **Ortu tidak mengunggah bukti dari portal** (hanya dari `/assessment`).

| # | Endpoint | Request kunci | Tabel | Catatan |
|---|---|---|---|---|
| 10.1 ✚ | `GET /portal/me` | — | `clients`,`client_packages`,`branches` | ringkasan biodata anak, cabang, kredit (paket aktif distinct), credit leave. *(Skeleton `portal/profile` + `portal/credits` digabung/diganti)* |
| 10.2 ✚ | `GET /portal/sessions` | `from,to,page` | `schedules` (`idx_sch_client`),`session_reports` | hanya `completed`, 10/halaman |
| 10.3 ✚ | `GET /portal/sessions/{id}/report` | — | `session_reports` | **404/422 bila `filled_sections=0`** (tombol nonaktif) |
| 10.4 ✚ | `GET /portal/sessions/{id}/report/export` | — | `session_reports`,`schedules` | PDF/HTML cetak laporan harian |
| 10.5 ✚ | `GET /portal/invoices` | — | `invoices`,`payment_proofs` | invoice paket terbaru **tanpa `void`** + invoice assessment pending |
| 10.7 ✚ | `GET /portal/questionnaires` | — | `assessment_access_codes`,`invoices` | kode belum diisi + status gating (ada invoice assessment pending?) |

**FE:** `features/parent/pages/ClientDashboard.js`; login ortu (Sprint 1) tetap; link kuesioner mengarah ke `/assessment` dengan kode. Ortu **tidak** melihat hasil asesmen.

## 7. M11 Dashboard & analitik

Semua angka dari **VIEW** atau agregasi terindeks, selalu dengan filter cabang + rentang tanggal WIB. Periode: Semua Waktu, Minggu Ini, 7 Hari, Bulan Ini, Bulan Lalu, Kuartal, **Kustom** (`start`,`end`).

| # | Endpoint | Layar | Akses | Sumber | Catatan |
|---|---|---|---|---|---|
| 11.1 | `GET /dashboards/revenue` | Revenue (master/manager) + tabel transaksi | `revenue` | `v_daily_revenue` ← `invoices` `status='paid'` (`idx_inv_paid_date`) | tampilkan **Gross**, **Refund**, **Verified** (`revenue` = amount − refund); `void` tidak ikut; tabel transaksi 10/hal, cari nama/ortu/kode/no. invoice (Q11) |
| 11.2 | `GET /dashboards/inquiry` | Inquiry | `inquiry_dashboard` | `clients` | funnel, tren, **Total Discharge + alasan** (agregasi `discharge_reason`; teks custom → "Lainnya"), drop-off |
| 11.3 | `GET /dashboards/schedule` | Schedule | `schedule_dashboard` | `v_daily_sessions` (`sessions_cancel_counted`, `sessions_cancel_therapist_off`), `v_daily_credit_usage`, `schedules.cancel_reason` | **Cancellation Rate** dan **Therapist Off Rate** = kolom ÷ `sessions_total`; Therapist Off adalah bagian dari rate keseluruhan |
| 11.4 | `GET /dashboards/branch-performance` | Performa Inquiry & Intake All-Branch | `revenue` (master) | `clients` | rasio konversi = admitted ÷ total intake (sekali di KPI + matriks); cabang dinamis dari `branches` |
| ✚ | `GET /therapists/utilization?branch&from&to` | Utilisasi Terapis | `schedule_dashboard` | `users`,`schedules`,`holidays` | Q25: kapasitas = `max_sessions_per_month` × (hari kerja periode ÷ hari kerja bulan; hari kerja = Senin–Sabtu non-libur); terisi = jam sesi bukan `cancelled`/`reschedule_pending` (1 jam = 1 sesi); live per terapis lalu agregasi per cabang. Pencari terapis pengganti = `schedules/team` (Sprint 2) |
| 11.5/6 | `therapist-summary`, `client-analytics` | (lihat §5 dan §4) | | | |

**FE:** `features/master/pages/DashboardRevenue.js`, `BranchPerformance.js`; `features/inquiry/pages/DashboardInquiry.js` + `components/dashboard`; `features/schedule/pages/DashboardSchedule.js`, `TherapistUtilization.js`. Dashboard memakai satu hook query per kartu dengan key (cabang, periode, start, end); `Kustom` mengirim `start`/`end`. Komponen chart (recharts) tetap, hanya sumber data yang diganti.

## 8. M13 Job & proses sinkron (tanpa queue)

| Perintah | Jadwal | Isi |
|---|---|---|
| `credits:reconcile` | 02:00 harian | Σ ledger vs `remaining_credit`, `credit_balance`, `cancel_count`, `leave_used`, `leave_credit_balance`; perbaiki dari ledger + tulis peringatan ke log untuk Master. **Wajib** |
| backup DB | 03:30 harian (cron sistem) | `mysqldump --single-transaction` + binlog, simpan 14 hari + off-server |
| backup arsip | tiap 6 bulan/1 tahun | DB + storage; uji restore tiap arsip |
| housekeeping | 04:00 harian | `sanctum:prune-expired`, `otp:prune`, hapus cache kedaluwarsa |
| `db:analyze` | Minggu 04:30 | tabel transaksi utama |
Tanpa job kedaluwarsa kode/paket, pengingat invoice, atau digest sesi (keputusan klien). Email OTP, hapus file, dan hapus cabang tetap **sinkron**.

## 9. Test wajib Sprint 3

| Area | Skenario |
|---|---|
| Void | ditolak 422 bila kredit terpakai/terkonversi/direfund; berhasil pada paket utuh; invoice `void` tidak masuk omzet; assessment `void` tidak menahan gating; hapus invoice `paid`/`void` → 409 |
| Pengganti | tanpa kredit dobel; `invoice_id` paket dipindah; UNIQUE (tidak bisa diganti dua kali); kandidat hanya void+keep |
| Konversi | tanpa kekurangan bayar; manual > otomatis ditolak; lebihan → `leftover_balance`; `cancel_count` disalin; jadwal terapi mendatang terhapus; invoice berikutnya terpotong saldo lebihan; ledger `converted_out/in` seimbang |
| Refund | satu kali per invoice; paket `voided`+`is_refunded`; sesi mendatang pindah paket lain / Frozen; `revenue` = amount − refund, `gross` tetap |
| Credit leave | `prepareLeaveCredit` (satuan melanjutkan, `reset_leave` mengisi ulang); `leave_credit_balance` = Σ sisa |
| Cuti | Reset Cuti Tahunan (`forfeited_days`, pemakaian sebelum reset diabaikan); invoice cuti lunas tanpa kredit |
| Reconcile | saldo manual dirusak → `credits:reconcile` memperbaiki dari ledger |
| Scope | portal terapis hanya data sendiri; portal ortu hanya `client_id` sendiri; dashboard menghormati `BranchScope` & periode kustom; `EXPLAIN` view pada ±50 ribu sesi |

## 10. Risiko khusus sprint ini

| Risiko | Mitigasi |
|---|---|
| Aturan void/refund/pengganti saling tumpang tindih | Satu `InvoiceRuleService` memegang predikat `canVoid`, `canRefund`, `canConvert`, `canReplace`; test tabel kebenaran |
| Jumat 13 Nov bertumpuk (cuti + FE finance + freeze) | Pindahkan FE `Saldo Lebihan` & `Cuti` ke Senin 16 Nov bila perlu; yang wajib di UAT #4: Void/pengganti/Konversi/Refund |
| Dashboard lambat | Pakai view + indeks; cek `EXPLAIN` di hari 8–9, hardening penuh di Sprint 4 |
| Data UAT tercampur data uji developer | Seed dua set (`QA-…`, `UAT-…`); developer menguji hanya di data `(QA)` |
| Reset Cuti Tahunan/hapus massal merusak data klien | Koordinasikan jadwalnya; backup sebelum UAT |
