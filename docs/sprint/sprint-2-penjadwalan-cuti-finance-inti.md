# Sprint 2 — Penjadwalan, aksi sesi, cuti, Finance inti

**Tanggal:** Senin 26 Okt – Jumat 6 Nov 2026 (10 hari kerja = TIMELINE_DEV D3 + D4) · **Progres akhir sprint:** 50% (20/40 hari) = **Checkpoint Termin 2**
**UAT klien:** Sabtu 31 Okt (#2): inquiry, client, kuesioner ortu. Sabtu 7 Nov (#3): penjadwalan lengkap + preview Finance.
**Modul:** M6 Penjadwalan & cuti · M7 Finance inti (invoice → bukti → lunas → paket) · M12 (hapus sesi/invoice belum lunas)
**Rujukan:** `schema.md` §06.1–§06.8, `implementation_detail.md` §8–§9, `docs/guide/05`, `06`, `10`, `TIMELINE_DEV.md` D3–D4.
**Prasyarat:** Sprint 1 selesai (client, status, master, auth, kuesioner).

> Hari di bawah dihitung relatif sprint (hari 1 = Sen 26 Okt). Bila `implementation_detail.md` berbeda dari `schema.md`/`docs/guide/10`, **`schema.md` yang berlaku**. Perbedaan penting sprint ini: **Cancel dan Off adalah SATU aksi** (`POST /schedules/{id}/cancel`, tanpa `/off`), cuti **tidak** ada `deduct_credit` dan tidak ada hapus log, tidak ada "Tolak" pada verifikasi.

---

## 1. Tujuan & Selesai bila

**Tujuan:** kalender mingguan + semua aksi sesi berjalan transaksional; ledger kredit benar; cuti Finance berjalan; alur *Finance menerbitkan invoice → bukti → Tandai Lunas → paket aktif → jadwal mendatang tersambung* berjalan.

**Selesai bila:**
- [ ] Kalender per minggu per cabang < 50 ms di data uji; complete/cancel/reschedule/pending/drop/revert/bulk lolos di env UAT.
- [ ] Saldo `remaining_credit` = Σ `credit_ledger` pada semua skenario test (complete → revert → complete, cancel potong/tidak, credit leave habis).
- [ ] Cuti: catat, akhiri lebih awal, void; sesi di rentang cuti tidak bisa dibuat (422 `client_on_leave`).
- [ ] Invoice paket & assessment: terbit, upload bukti (Finance & publik), Tandai Lunas, renewal 2 jalur, hapus invoice belum lunas.
- [ ] Kuesioner `invoice_required=1` menerbitkan invoice assessment otomatis dan gating `proof_required` teruji penuh.
- [ ] Discharge menghapus jadwal aktif + ledger `discharge`; libur membatalkan sesi bertanggal itu.
- [ ] `npm run lint/test/build` hijau; build dibekukan Jumat 6 Nov 14.00; checkpoint 50% dicatat di `TIMELINE_DEV.md` §7.

## 2. Urutan kerja

| Hari | Tgl | Pekerjaan | Est. |
|---|---|---|---|
| 1 | Sen 26 | FE sisa S1: `assessmentsStore`, `branchesStore`, `AssessmentFill`, `useQuestionnaireCodeActions`, `useClientDeleteActions`, list inquiry `page/per_page`. Test pipeline & submit ulang kuesioner | 0,75 + 0,5 |
| 2 | Sel 27 | **Jadwal:** CRUD sesi, seri berulang, bentrok, re-assessment memajukan status, kalender (Q1–Q3). **Libur membatalkan sesi** | 1,0 |
| 3–4 | Rab–Kam | **Aksi sesi:** complete, **Cancel/Off** (credit leave dulu), reschedule, pending, drop pending, laporan. **Discharge side effect** | 1,25 |
| 5 | Jum 30 | **Revert 1x + bulk** (bulk reschedule atomik). Mulai **cuti** (`client_leaves`, `planLeave`) | 0,75 + 0,75 |
| 6 | Sen 2 | **Cuti selesai** (akhiri/void, `client_on_leave`). FE jadwal: `schedulesStore`, `useSessionActions`, unreported, libur, kalender terapis. Test jadwal | 0,75 + 0,75 + 0,25 |
| 7–8 | Sel–Rab | **Finance inti:** invoice, bukti, Tandai Lunas, aktivasi paket + relink, renewal 2 jalur, hapus belum lunas. Aktifkan `invoice_required` kuesioner | 1,25 |
| 9 | Kam 5 | Ledger keyset (Q10), Log Kredit, koreksi saldo. Bug UAT #1–#2 | 0,5 + 0,5 |
| 10 | Jum 6 | FE finance dasar: `creditsStore`, `usePackageActivationActions`, upload `api.upload`. Build dibekukan UAT #3 | 1,0 |

### Dependensi lintas sprint
| Yang dibutuhkan | Cara |
|---|---|
| Aksi sesi butuh paket aktif + `leave_total` | Finance inti (hari 7–8) membuat paket; **sebelum itu uji aksi sesi memakai seeder paket**. `leave_total` di-snapshot dari `master_packages.leave_quota` saat Tandai Lunas (aturan lanjut paket satuan/`reset_leave` di Sprint 3) |
| Cuti butuh jadwal + ledger | dikerjakan setelah aksi sesi (hari 5–6) |
| Sesi asesmen memajukan status | memakai `ClientStatusService` S1 |
| Konversi, void, refund menyentuh jadwal mendatang | Sprint 3 memakai query relink yang dibuat di sprint ini (`RelinkUpcomingSchedules`), jadi tulis sebagai service terpisah yang bisa dipanggil ulang |

---

## 3. M6 Penjadwalan & sesi

### 3.1 API — baca
| # | Endpoint | Akses | Request kunci | Tabel | Catatan |
|---|---|---|---|---|---|
| 6.1 | `GET /schedules` | `weekly_calendar`,`active_clients`,`therapist_module` (own) | `branch_id,from,to,therapist_id,client_id,status[],type,q` | `schedules` (`idx_sch_calendar`,`idx_sch_therapist`,`idx_sch_client`), `clients`, `clients.credit_balance` | satu query per minggu per cabang (Q1–Q3). **Frozen = turunan** `credit_balance=0`/tanpa paket. `q` = nama/ortu/kode/terapis/catatan. Terapis: server memaksa `therapist_id=user` |
| 6.2 | `GET /schedules/{id}` | idem | — | `schedules`,`session_reports`,`client_packages` | detail + laporan + paket target + credit leave paket |
| 6.3 | `GET /schedules/conflicts` | `weekly_calendar` | `therapist_id,date,start_time,end_time,exclude_id` | `schedules`,`holidays` | `{conflicts:[…], holiday:{…}\|null}` (preview live) |
| 6.4 ✚ | `GET /schedule-series?client_id=` | `active_clients` | — | `schedule_series` | pola rutin di profil client |
| 6.5 | `GET /schedules/unreported` | `unreported_reports` | `branch_id,therapist_id,from,to,q,page` | view `v_unreported_sessions` | Q19; sesi completed dengan `filled_sections=0` |
| 6.6 ✚ | `GET /schedules/{id}/revert-preview` | `weekly_calendar` | — | `schedules`,`credit_ledger`,`client_packages` | status tujuan, slot, efek kredit, cek bentrok (boleh dihitung FE) |
| ✚ | `GET /schedules/team?date=` | `weekly_calendar`/`schedule_dashboard` | `date,branch_id` | `schedules`,`holidays`,`users` | Kalender Tim hari/minggu (semua sesi terapi cabang di satu tanggal) |

### 3.2 API — buat & ubah
| # | Endpoint | Action | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 6.7 | `POST /schedules` | `CreateScheduleAction` | `weekly_calendar` | `client_id,therapist_id,type(therapy/assessment/consultation),session_date,start_time,end_time,client_package_id?,booking_note?,force?` | `schedules` C; `clients` U | 422 tanggal libur; **422 `client_on_leave`** (terapi di hari efektif cuti `active`); 409 `schedule_conflict` kecuali `force=true` oleh role berwenang. Client Frozen tetap boleh dijadwalkan |
| 6.8 | `POST /schedules/bulk` | `CreateRecurringSchedulesAction` | `weekly_calendar` | `client_id,weeks(12),starts_on,days[{day,start,end,therapist_id,client_package_id}]` | `schedule_series` C; `schedules` C (N); `holidays`,`client_leaves` R | libur & hari efektif cuti **dilewati**; satu transaksi; respons jumlah dibuat & dilewati |
| ✚ | `POST /clients/{id}/routine-replace`, `DELETE /clients/{id}/routine` | `ReplaceRoutineAction` | `weekly_calendar` | pola baru + `effective_from` | `schedule_series`, `schedules` | lihat core logic 3.5 |
| 6.9 | `PATCH /schedules/{id}` | — | `weekly_calendar` | `version`, `booking_note` **atau** `history_note` | `schedules` U | `history_note` (+`history_note_by`) bisa ditimpa siapa pun berakses; terpisah dari `cancel_note`/`pending_note` |
| 6.10 | `PUT /schedules/{id}/report` | `SaveSessionReportAction` | terapis (own) / `weekly_calendar` | `activity_section,note_section,homework_section`, `version` | `session_reports` upsert | UNIQUE `schedule_id`; `filled_sections` generated; boleh kapan saja |
| 6.11 | `DELETE /schedules/{id}` | — | `weekly_calendar`+hapus | — | `schedules` D → laporan cascade; `credit_ledger.schedule_id` SET NULL | 422 bila `completed`/ber-ledger belum di-revert |

### 3.3 API — aksi status & kredit (transaksional)
| # | Endpoint | Action | Request kunci | Efek tabel | Respons & error |
|---|---|---|---|---|---|
| 6.12 | `POST /schedules/{id}/complete` | `CompleteSessionAction` | `version`, `report?` | `schedules`; terapi: `client_packages`(−1), `clients.credit_balance`, `credit_ledger`(`used`); asesmen: `clients.status`→`assessment_done` | asesmen tidak memotong kredit; complete ulang tidak dobel; tanpa paket bersisa = tanpa potongan |
| 6.13 | `POST /schedules/{id}/cancel` | `CancelSessionAction` (**Cancel = Off**) | `reason` (≤150), **`deduct_credit` wajib tanpa default**, `note?`, `version` | `schedules`; `client_packages`(`cancel_count`, `leave_used`, `remaining_credit`); `clients`(`credit_balance`,`leave_credit_balance`); `credit_ledger` | `{cancel_count, deducted, used_leave, leave_left}`; 422 bila potong tapi tak ada saldo |
| 6.14 | `POST /schedules/{id}/reschedule` | `RescheduleSessionAction` | `session_date,start_time,end_time,therapist_id` | `schedules`(`prev_*`,`origin_*`,`rescheduled_at`) | slot harus beda & lolos bentrok (409); libur 422; **netral kredit** |
| 6.15 | `POST /schedules/{id}/mark-pending` | — | `reason,note?` | `schedules`(`reschedule_pending`,`pending_*`) | diabaikan cek bentrok; netral kredit |
| 6.16 | `POST /schedules/{id}/drop-pending` | — | `deduct_credit` wajib, `note?` | seperti cancel, alasan sistem `reschedule_dibatalkan` | |
| 6.17 | `POST /schedules/{id}/revert` | `RevertSessionAction` | `reason` (wajib ≤300), `version` | `schedules`; `credit_ledger`(`reversal`,`reverses_ledger_id` UNIQUE); `client_packages`; `clients` | 422 `already_reverted`; 409 slot target terisi |

### 3.4 API — aksi massal
`POST /schedules/bulk/{action}` — `complete | cancel | reschedule | revert` (6.18). `complete/cancel/revert` menerima `ids[]` (+`reason`,`deduct_credit` untuk cancel) dan melaporkan `{done:[…], skipped:[{id,reason}]}`; satu `batch_id` di `credit_ledger`. **`reschedule` menerima `rows[{id,date,start_time,end_time,therapist_id}]` dan ATOMIK**: validasi semua baris (bentrok terapis termasuk antar-baris, libur, tidak berubah, jam terbalik); satu gagal → rollback semua, 422 `{errors:{"rows.N":[…]}}`.

### 3.5 Core logic

**A. Cek bentrok & buat sesi** (`ScheduleConflictService`, `CreateScheduleAction`)
1. Tolak 422 bila `session_date` ada di `holidays` (cabang itu atau semua cabang); tolak 422 `client_on_leave` bila terapi jatuh di hari efektif cuti `active` client.
2. `SELECT … FROM schedules WHERE therapist_id=? AND session_date=? AND status NOT IN ('cancelled','reschedule_pending') FOR UPDATE` (indeks `idx_sch_therapist`); overlap jam → 409 `schedule_conflict` + daftar sesi (kecuali `force=true`). Tidak ada konsep jam kerja.
3. Insert; `service_code` diturunkan dari client; `client_package_id` NULL untuk asesmen.
4. Sesi `assessment` baru & `clients.status` masih `inquiry`/`service_selected` → `assessment_scheduled` (boleh lompat dari `inquiry`; hanya maju). Reschedule tidak memicu transisi.
5. Seri berulang: insert `schedule_series` + N `schedules` dalam satu transaksi; tanggal libur dan hari efektif cuti dilewati.

**B. Complete** (`CompleteSessionAction`): lock sesi + cek `version` & status ∈ {scheduled, rescheduled} → bila terapi: lock paket aktif client (`ORDER BY activated_at`, FIFO; prioritas `client_package_id` sesi) → `remaining_credit -= 1` (CHECK ≥ 0, `depleted` bila 0) → ledger `used` (+`idempotency_key` memuat `version` sesi) → update `clients.credit_balance` → sesi `completed` + `previous_status` + `credit_effect=used` + `completed_*` → upsert `session_reports`. Asesmen: tanpa kredit; status client → `assessment_done` bila sebelumnya lebih awal.

**C. Cancel = Off (credit leave dulu)** — keputusan kredit oleh admin
1. Lock sesi + client + paket target (`client_package_id`; null → paket aktif tertua / FIFO). Berlaku untuk `scheduled | rescheduled | reschedule_pending`, semua jenis kalender. Alasan = string (kode pilihan cepat atau teks custom), tidak divalidasi ke tabel.
2. `client_packages.cancel_count += 1` (statistik, **tidak ada lagi kuota 3x**). Pembatas = **credit leave** `leave_total − leave_used`.
3. `deduct_credit = true`:
   - paket masih punya credit leave → `leave_used += 1`, ledger **`cancel_leave`** (`credit_change=0`, `leave_change=−1`, `credit_effect=excused`) → **kredit sesi utuh**;
   - credit leave habis → `remaining_credit −= 1` (`depleted` bila 0), ledger **`cancel_penalty`**, `credit_effect=penalty`;
   - credit leave habis dan saldo sesi 0 → ledger `cancel_excused`.
   `deduct_credit = false` → ledger `cancel_excused` (0).
4. Update `clients.credit_balance` dan `clients.leave_credit_balance`; sesi → `cancelled` + alasan + `previous_status`; ledger menyimpan `cancel_count_after`.
5. **Reschedule & pending netral kredit** (tanpa ledger, tanpa `cancel_count`). Drop pending = cancel dengan alasan sistem.

**D. Revert (hanya 1x)**
| Dari | Ke | Efek |
|---|---|---|
| `completed` | `previous_status` | ledger `reversal` (+1) untuk ledger `used`; kembalikan status client bila transisi otomatis terjadi di batch yang sama (hanya jika status masih `assessment_done`) |
| `cancelled` | `previous_status` | `penalty` → reversal (+1); `cancel_leave` → reversal (`leave_used −1`, `cancel_count −1`); `excused` → reversal 0, `cancel_count −1` |
| `rescheduled` | slot `prev_*` | 1x reschedule → jadwal asal (`scheduled`); 2x → jadwal tersimpan terakhir (tetap `rescheduled`, `origin_*` dipertahankan). Cek bentrok (409 bila terisi). Tanpa efek kredit |
| `reschedule_pending` | `previous_status` | `pending_*` dikosongkan |
- Tolak 422 `already_reverted` bila `reverted_at` terisi; transisi berikutnya (complete/cancel/reschedule/pending) mengosongkannya. **Ledger append-only**: baris lama tidak diubah, `reversal.reverses_ledger_id` UNIQUE. Complete lagi setelah revert membuat baris `used` **baru** (`idempotency_key` memakai `version` baru). Alasan wajib. Revert pembatalan cuti mengosongkan `leave_id` sesi.

**E. Ganti jadwal rutin** (`ReplaceRoutineAction`, satu transaksi): hapus **hanya** `schedules` berstatus `scheduled` pada pola yang berubah dengan `session_date >= berlaku_mulai`; seri lama yang seluruh sesinya hilang di-`DELETE`, bila masih punya sesi lain `ends_on` dipotong ke H−1 dan hari yang diganti dibuang dari `pattern`; buat seri baru (`starts_on` = tanggal berlaku). Cek overlap terapis `FOR UPDATE` atas sesi baru → bentrok 422 tanpa perubahan. Kredit tidak berubah.

**F. Libur membatalkan sesi** (`useHolidayActions` → `POST/PATCH /holidays`, satu transaksi): insert/update `holidays` + `UPDATE schedules SET status='cancelled', cancel_reason='H', cancel_note='Hari libur: …' WHERE session_date=? AND (branch_id=? OR libur semua cabang) AND status IN ('scheduled','reschedule_pending')`. **Tidak menulis `credit_ledger`**; respons memuat `cancelled_count`.

**G. Discharge side effect** (plug ke `TransitionClientAction` S1): hapus permanen `schedules` aktif client (termasuk seri) + ledger `discharge` (−sisa per paket aktif, paket → `depleted`) + `credit_balance` diperbarui; satu transaksi.

---

## 4. Cuti client (jatah 30 hari/tahun) — bagian dari M6

Cuti **hanya dicatat Finance** (modul `finance`), memotong **saldo cuti 30 hari/tahun**, **bukan** kredit sesi dan **bukan** credit leave paket. Cuti = pembatalan sesi: log `client_leaves` hanya mengubah sesi terapi di rentang menjadi `cancelled` dengan `cancel_reason='OL'` dan `leave_id`. Tidak menambah `cancel_count`. **Tidak ada hapus log** (hanya Akhiri Lebih Awal / Void).

### API
| # | Endpoint | Action | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|
| 6.20 | `GET /leaves` | tab Cuti Finance | `branch_id,client_id,status,q,page` | `client_leaves` (`idx_leave_branch`),`clients`,`schedules` (`idx_sch_leave`) | Q24; fase (`upcoming/ongoing/done/early/voided`) diturunkan dari tanggal |
| 6.21 | `POST /leaves` | `CreateLeaveAction` | `client_id,start_date,end_date,reason?,note?` (**tanpa `deduct_credit`**) | `client_leaves` C; `client_leave_sessions` C; `schedules` U; `credit_ledger` C(`off_excused`) | 422 `leave_overlap`, 422 `leave_no_sessions`, 422 `leave_satuan_monthly`; respons `days, sessions_off, deducted, saldo{quota,used,adding,after,remaining,over}, warnings[]` |
| ✚ | `GET /leaves/{id}` | detail log | — | `client_leaves`,`client_leave_sessions`,`schedules` | riwayat diturunkan dari kolom: dicatat / diakhiri lebih awal / void + sesi terdampak (masih dibatalkan atau kembali) |
| 6.22 | `POST /leaves/{id}/end` | `EndLeaveEarlyAction` | `return_date`, `return_note?`, `version` | `client_leaves`,`schedules`,`credit_ledger` | `{days_returned, released, conflicted}`; 422 bila `return_date` di luar rentang efektif |
| 6.23 | `POST /leaves/{id}/void` | `VoidLeaveAction` | `reason` (wajib), `version` | seperti 6.22 + `status=voided` | tidak bisa dibatalkan; 409 bila sudah void |
| 6.25 | `GET /clients/{id}/leave-quota?year=` | kartu jatah | — | `client_leaves`,`schedules`,`clients.leave_granted` | `{quota:30, used, remaining, over}` live (Q24) |
| S3 | `POST /leaves/annual-reset` | Reset Cuti Tahunan | | | dikerjakan **Sprint 3** |
Endpoint lama yang **tidak dibuat**: `POST /schedules/{id}/off` (Off manual) dan `DELETE /leaves/{id}` (dihapus dari desain). Hapus `schedules.off` dari `endpoints.js`.

### Core logic
1. **Catat (`CreateLeaveAction`)**, satu transaksi: lock `clients` → lock sesi terapi client di rentang → tolak `leave_overlap` bila beririsan dengan log `active` (hari efektif; cuti yang diakhiri/void tidak memblokir) → **wajib ada sesi terapi `scheduled/rescheduled` di rentang** (`leave_no_sessions`) → paket satuan (`master_packages.is_satuan` pada paket aktif): maks **1 cuti per bulan kalender** (`leave_satuan_monthly`).
2. Sesi terdampak: `status=cancelled`, `previous_status`, `cancel_reason='OL'`, `leave_id`, `reverted_at=NULL`, `credit_effect=excused`, ledger `off_excused` (`credit_change=0`, hanya penanda). Sesi asesmen/konsultasi tidak disentuh. Id sesi dicatat di `client_leave_sessions`.
3. **Hari dihitung = sesi pertama–terakhir** di rentang (`counted_start..counted_end`, hari kalender), bukan rentang input. Saldo = `clients.leave_granted − hari terpakai sejak GREATEST(leave_reset_at, leave_resets terakhir)`; **melewati saldo tidak menolak**, hanya `warnings`. Cuti lintas tahun dihitung per tahun (`byYear`).
4. **Akhiri lebih awal / void:** lock log + sesi `cancelled` ber-`leave_id` dengan `session_date >= return_date` (void: semua). Tiap sesi dicek bentrok: lolos → `status=previous_status`, `cancel_reason/note` dikosongkan, `leave_id=NULL`, **`reverted_at` tetap NULL** (koreksi cuti, bukan revert — tidak memakan jatah "revert 1x"), ledger `reversal` bernilai 0. Bentrok → sesi dilewati: `leave_id=NULL`, tetap `cancelled`, dilaporkan `conflicted`. Log: `return_date/return_note` (akhiri) atau `status=voided`+`void_reason/at/by`.
5. **Blok jadwal:** `POST /schedules` terapi di hari efektif cuti `active` → 422 `client_on_leave`; seri/routine-replace **melewati** hari tersebut.

---

## 5. M7 Finance inti

Akses: modul `finance`. Ortu **tidak** upload dari portal; satu-satunya jalur ortu = halaman publik `/assessment` (dikunci kode kuesioner).

### API
| # | Endpoint | Action | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|
| 7.1 | `GET /invoices` | list (tab Menunggu: `status=unpaid`; Semua Tagihan) | `branch_id,status[],type,is_renewal,client_id,q(nama/ortu/kode/no. invoice),from,to,page` | `invoices` (`idx_inv_queue`,`idx_inv_client`), `clients`, view `v_invoice_queue` | badge jenis, `is_renewal`, `gross_amount`/`balance_applied`, ada log `converted`, status `void` |
| 7.2 | `POST /invoices` | `IssueInvoiceAction` | `client_id,invoice_type(package/assessment),master_package_id?,amount?,is_renewal?,replaces_invoice_id?` | `invoices` C; `invoice_counters` U; `clients.leftover_balance` U (bila saldo lebihan terpakai); `invoice_logs` C(`issued`,`balance_applied`) | nomor `INV-{KODE}-{YYYYMMDD}-{NNN}` atomik; tanpa jatuh tempo/diskon/DP/cicilan. Jenis `leave` & pengganti → Sprint 3 |
| 7.4 | `GET /invoices/{id}` | detail | — | `invoices`,`payment_proofs`,`client_packages` | |
| 7.5 | `POST /invoices/{id}/proof` | `UploadPaymentProofAction` (multipart) | `file` JPG/PNG/PDF ≤ 5 MB (+`code` bila publik) | file → storage privat; `payment_proofs` C; `invoices.proof_upload_count`+1; `invoice_logs`(`proof_uploaded`) | **status invoice tidak berubah**. Publik: hanya invoice `assessment` belum `paid`/`void`, 422 `proof_limit_reached` bila count ≥ 4. Finance: `unpaid`/`paid` mana pun tanpa batas; `void` ditolak 422 |
| 7.6 ✚ | `GET /invoices/{id}/proofs/{proofId}/file` | stream/URL bertanda tangan | — | `payment_proofs` | file privat; melihat bukti tidak dicatat |
| 7.7 | `POST /invoices/{id}/verify` | `VerifyPaymentAction` (**Tandai Lunas**, tanpa Tolak) | `version` | `invoices` U; paket: `client_packages` C, `credit_ledger` C(`purchased`/`renewed`), `clients` U, `schedules` U (relink) | 409 bila bukan `unpaid` / versi beda |
| 7.10 | `DELETE /invoices/{id}` | `DeleteInvoiceAction` | — | `invoices` D → `payment_proofs`(+file), `invoice_logs`; `clients.leftover_balance` += `balance_applied` | **hanya `unpaid`**; `paid`/`void` → 409 `invoice_not_deletable` |
| 7.12 | `POST /invoices` dengan `is_renewal=true` | renewal jalur invoice baru | sama 7.2 | sama | masuk antrean verifikasi |
| 7.13 | `POST /clients/{id}/renewals` | `DirectRenewalAction` (langsung lunas) | `master_package_id,credits,amount,payment_method?,renewal_reason`(≥3),`renewal_justification`(≥10) | `invoices` C(`paid`,`is_renewal`), `invoice_logs`(`renewal_paid`), `client_packages` C, `credit_ledger`(`renewed`), `clients`, relink | 422 bila alasan/justifikasi kosong |
| 7.16 | `GET /credit-ledger` | Log Buku Besar | `branch_id,client_id,q,action,cursor` | `credit_ledger` (`idx_ledger_branch`),`clients` | keyset (Q10) |
| 7.17 | `GET /clients/{id}/credits` | paket + ringkasan credit leave & `cancel_count` per paket + ledger | `cursor` | `client_packages`,`credit_ledger` | paket 0 sesi tidak ditampilkan kecuali tak ada yang bersisa |
| 7.19 | `POST /credits/adjust` | `AdjustCreditAction` (koreksi saldo) | `client_id,client_package_id,credit_change,reason`(wajib) | `credit_ledger`(`manual_adjust`),`client_packages`,`clients` | tidak boleh negatif |
| ✚ | `POST /clients/{id}/assessment-codes` (`invoice_required=1`) | bagian `IssueAssessmentCodeAction` | | `invoices` C (jenis `assessment`, kode `ASM`, nominal = harga layanan `is_assessment`), `invoice_logs` | satu transaksi dengan insert kode |

### Core logic
1. **Terbit (`IssueInvoiceAction`):** nomor dari `invoice_counters` (atomik, di transaksi yang sama); paket → salin snapshot nama/kredit/harga dari `master_packages` (kode = `invoice_code`); assessment → kode `ASM`, tanpa paket/kredit. **Saldo lebihan** (`clients.leftover_balance`) memotong invoice **paket** saja: `balance_applied = min(saldo, gross)`, `amount = gross − balance_applied`, saldo dikurangi; dicatat di `invoice_logs`.
2. **Tandai Lunas (`VerifyPaymentAction`):** lock invoice (status harus `unpaid`) + `version` → `paid`, `paid_at`, `verified_by/at`, log `verified`. Jenis **package**: insert `client_packages` (snapshot; `invoice_id` UNIQUE mencegah aktivasi ganda; `leave_total` = snapshot `master_packages.leave_quota`), ledger `purchased` (client belum punya paket) atau `renewed` (+N), update `clients.credit_balance` & `leave_credit_balance`. Jenis **assessment**: hanya `paid` (gating butuh bukti terunggah, bukan lunas).
3. **Relink jadwal mendatang** (service `RelinkUpcomingSchedules`, dipakai ulang Sprint 3):
   `UPDATE schedules SET client_package_id=:target WHERE client_id=? AND type='therapy' AND status IN ('scheduled','rescheduled','reschedule_pending') AND session_date >= CURDATE() AND (client_package_id IS NULL OR client_package_id IN (paket client dengan remaining_credit=0))`; `:target` = paket aktif tertua yang sudah ada, atau paket baru. Frozen turunan dari `credit_balance`, jadi sesi otomatis tidak Frozen lagi.
4. **Renewal langsung lunas:** satu transaksi — invoice `paid` + `is_renewal=1` + alasan & justifikasi, `client_packages`, ledger `renewed`, `clients`, relink; `invoice_logs` (`renewal_paid` memuat alasan).
5. **Upload bukti:** validasi MIME + ukuran; simpan di disk privat (bukan `public`); `proof_upload_count += 1`; **tidak mengubah status**. Mengaktifkan gating kuesioner (`proof_upload_count > 0`).
6. **Hapus invoice belum lunas:** kembalikan `balance_applied` ke `clients.leftover_balance`; hapus file bukti sinkron setelah commit; hapus invoice assessment membuka gating bila tak ada invoice assessment lain belum lunas.
7. **Idempotensi & lock:** aktivasi paket dijaga `client_packages.invoice_id` UNIQUE; potong kredit `idempotency_key`; urutan lock `invoices → client_packages → clients`.

---

## 6. Integrasi Frontend sprint ini

> **Aturan fetch (wajib, tiap modul):** halaman hanya memanggil endpoint untuk data yang benar-benar dibacanya; daftar baru diambil saat ada komponen yang membacanya (`useDemand`), bukan saat login. Rincian: `docs/guide/08` bagian "Fetch hanya yang diperlukan".

| Sasaran | Store / hook | Halaman / komponen | Perubahan |
|---|---|---|---|
| Jadwal | `schedulesStore`, `useSessionActions` (`completeSession`, `cancelSession`, `rescheduleSession`, `markPending`, `dropPending`, `revertSession`, bulk*), `useHolidayActions` | `features/schedule/pages/CalendarPage.js` + `components/calendar/*`, `ActiveClientDetail.js` (+ `components/clientDetail`), `UnreportedSessions.js`, `Holidays.js`, `features/therapist/pages/MySchedule.js`, `TeamCalendar.js` | Query kalender per minggu (key: cabang+from+to); tiap aksi = **satu mutation** + invalidasi `schedules`, `credits`, `clients`; dialog Cancel wajib memilih Potong/Tidak (`DeductCreditChoice`) dan menampilkan sisa credit leave; 409 `schedule_conflict` → dialog `force`; `RevertSessionPanel` → satu request `schedules.revert` |
| Cuti | `leavesStore`, `useLeaveActions` (`createLeave`, `endLeaveEarly`, `voidLeave`, `leaveQuotaSummary`) | `features/finance/components/leave/*` (tab Cuti), kartu Jatah Cuti di detail client | Pratinjau `planLeave` tetap di FE (domain), server tetap menghitung ulang; peringatan saldo tidak memblokir |
| Finance | `creditsStore` (invoice, paket, ledger), `usePackageActivationActions` (`approvePackagePayment`, `renewDirect`) | `FinancePortal.js`: `VerificationTab`, `BillingTab`, `HistoryTab`, `ClientLedgerTab`, `ClientLedgerDialog`, `CreateInvoiceDialog`, `RenewalDialog`, `RenewalNeededTab`, `BalanceHint` | Upload bukti via `api.upload` (multipart, bukan dataURL); status invoice hanya `unpaid/paid/void` (hapus jatuh tempo & "Tolak"); riwayat ledger → keyset (`cursor`) |
| Kuesioner publik | `AssessmentProofCard` | `/assessment` | Aktifkan upload bukti ke `POST invoices.proof` dengan kode |
| Inquiry sisa S1 | `clientsStore`, `useClientDeleteActions` | `InquiryPipeline.js` | Pagination server |

**Endpoint ditambah / dirapikan di `services/api/endpoints.js`:** `schedules.unreported`, `schedules.team`, `schedules.revertPreview`, `clients.routineReplace`, `clients.routine`, `holidays`, `leaves.annualReset` (S3), `invoices.proofFile`, `credits.adjust`, `clients.renewals` (ada). **Hapus** `schedules.off`.

## 7. Test wajib Sprint 2

| Area | Skenario |
|---|---|
| Jadwal | bentrok + `force`; libur ditolak/dilewati; hari cuti dilewati; re-assessment memajukan status hanya maju; bulk complete/cancel/revert sebagian dilewati; **bulk reschedule atomik** (satu gagal = tidak ada yang tersimpan, termasuk bentrok antar-baris) |
| Kredit | complete → revert → complete (ledger `used` baru, `reversal` UNIQUE); `deduct_credit` wajib (422 bila kosong); cancel potong: credit leave dulu (`cancel_leave`) → habis → `cancel_penalty`; revert tiap jenis cancel; revert kedua → 422; saldo = Σ ledger |
| Cuti | tanpa sesi → `leave_no_sessions`; overlap; paket satuan 1x/bulan; hari = sesi pertama–terakhir; akhiri lebih awal dengan slot terisi → `conflicted`; void; `client_on_leave`; cuti tidak memotong kredit/credit leave |
| Finance | verify tidak dobel (UNIQUE); renewal langsung wajib alasan+justifikasi; saldo lebihan memotong invoice paket; hapus invoice `paid` ditolak; relink jadwal; upload batas 4x publik; gating `proof_required` |
| Discharge | jadwal aktif terhapus, ledger `discharge`, paket `depleted` |

## 8. Risiko khusus sprint ini

| Risiko | Mitigasi |
|---|---|
| Sprint terberat; jadwal + cuti + Finance inti dalam 10 hari | Urutan potong bila molor: (1) riwayat ledger keyset & `credits/adjust` ke Sprint 3 awal, (2) `routine-replace` ke Sprint 3, (3) kalender tim (`schedules/team`) ke Sprint 3. Jangan menunda aksi sesi/revert/cuti — dependensi Finance lanjutan |
| Bug kredit (saldo ≠ ledger) | Test skenario kredit wajib; ledger append-only; job `credits:reconcile` di Sprint 3 |
| Deadlock Finance | Urutan lock tetap `invoices → client_packages → clients` |
| Dua sumber kebenaran (`implementation_detail.md` usang) | Kerjakan dari `schema.md`; catat selisih di `sprint_plan.md` §5 dan sinkronkan dokumen di akhir sprint |
