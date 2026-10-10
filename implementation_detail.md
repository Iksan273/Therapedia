# Implementation Detail Backend Therapedia (Laravel 11 + MySQL 8)

Dokumen ini turunan dari `schema.md` (FINAL, 4 Okt 2026), `technical_workflow.md`, dan `docs/guide/10-api-migration.md`. Isinya: **API apa saja yang dibutuhkan tiap modul, dan tabel apa yang dipakai tiap API**, supaya bisa langsung dipecah menjadi route, FormRequest, Action class, dan test. Untuk review: baca §1 (konvensi), lalu modul yang relevan (§3 dst.).

> Status: **draf untuk review** (4 Okt 2026). Path yang belum ada di `frontend/src/services/api/endpoints.js` ditandai ✚; setelah disetujui, `endpoints.js` disinkronkan dengan daftar di sini.

## Daftar isi
- [1. Konvensi API](#1-konvensi-api)
- [2. Peta modul](#2-peta-modul)
- [3. M1 Auth & akun](#3-m1-auth--akun)
- [4. M2 User, role/RBAC, cabang](#4-m2-user-rolerbac-cabang)
- [5. M3 Master data & hari libur](#5-m3-master-data--hari-libur)
- [6. M4 Inquiry & Client](#6-m4-inquiry--client)
- [7. M5 Asesmen & kuesioner](#7-m5-asesmen--kuesioner)
- [8. M6 Penjadwalan & sesi](#8-m6-penjadwalan--sesi)
- [9. M7 Finance & kredit](#9-m7-finance--kredit)
- [10. M8 Active client](#10-m8-active-client)
- [11. M9 Portal terapis](#11-m9-portal-terapis)
- [12. M10 Portal orang tua](#12-m10-portal-orang-tua)
- [13. M11 Dashboard & analitik](#13-m11-dashboard--analitik)
- [14. M12 Hapus data (ringkasan lintas modul)](#14-m12-hapus-data-ringkasan-lintas-modul)
- [15. M13 Job terjadwal & proses sinkron](#15-m13-job-terjadwal--proses-sinkron)
- [16. M14 Google Calendar (fase terakhir)](#16-m14-google-calendar-fase-terakhir)
- [17. Lampiran](#17-lampiran)

---

## 1. Konvensi API

### 1.1 Umum
| Hal | Aturan |
|---|---|
| Base URL | `/api/v1`, JSON, UTF-8. Body/query camelCase dari frontend diubah ke snake_case oleh `httpClient` (sudah ada); respons snake_case → camelCase |
| Auth | Sanctum bearer token. Dua guard: `staff` (model `User`) dan `client` (model `Client`, portal ortu). Ability token membedakan portal. Rute publik hanya `/public/*` dan `/auth/*` login |
| Cabang | Semua endpoint berdata cabang memakai `BranchScope`: non-master hanya melihat/mengubah `branch_id` miliknya; master boleh `?branch_id=` (kosong/`all` = semua) |
| Hak akses | `PermissionService` membaca `role_permissions` (memo per request). Ditulis sebagai **`modul:<kode>`**: punya akses modul = boleh semua aksi non-hapus; **`+hapus`** = juga butuh `roles.can_delete = 1`. Kode modul: `revenue, inquiry_pipeline, inquiry_dashboard, weekly_calendar, schedule_dashboard, active_clients, finance, user_management, branch_master, rbac, therapist_module, unreported_reports, holidays` |
| Transaksi | Setiap endpoint tulis lintas tabel = satu `DB::transaction()` + `lockForUpdate()` pada baris induk; log khusus (`credit_ledger`, `invoice_logs`, `client_status_histories`, `package_conversions`) ditulis di transaksi yang sama |
| Optimistic lock | Entity ber-`version` (`clients`, `schedules`, `invoices`, `client_packages`, `session_reports`, `assessment_categories`): request kirim `version`; tidak cocok → **409** `{code:"version_conflict"}` |
| Jejak pelaku | Trait/observer mengisi `created_by`/`updated_by` dari user terautentikasi; frontend tidak mengirim pelaku |
| Pagination | List: `?page=&per_page=` (default **10**, maks 50) → `{ data:[…], meta:{ total, page, per_page, last_page } }`. Riwayat bertambah (`credit-ledger`, `invoices/{id}/logs`, riwayat sesi) memakai keyset: `?cursor=&per_page=` → `{ data, meta:{ next_cursor } }`. Filter & pencarian di server sebelum dipaginasi |
| Pencarian client | `q` = prefix nama anak, nama ortu, atau kode client (case-insensitive) — dipakai konsisten semua list |
| Tanggal | Tanggal bisnis `yyyy-MM-dd` (WIB), jam `HH:mm`; waktu sistem ISO 8601 UTC |
| Proses | **Semua sinkron** (tanpa queue/job async), termasuk hapus cabang, hapus file, email OTP. Perintah terjadwal hanya lewat cron (§15) |

### 1.2 Bentuk respons
- Sukses objek: `{ "data": { … } }`; list: lihat pagination; aksi: `{ "data": { …hasil… } }` (mis. cancel mengembalikan `cancel_count`, `quota_exceeded`).
- **Error** (cocok dengan `ApiError` frontend):

| Status | Isi | Kapan |
|---|---|---|
| 401 | `{message}` | token hilang/kedaluwarsa → frontend logout |
| 403 | `{message, code:"forbidden"}` | tanpa akses modul / tanpa `can_delete` / `must_change_password` / beda cabang |
| 404 | `{message}` | tidak ditemukan (juga untuk data cabang lain, tidak membocorkan keberadaan) |
| 409 | `{message, code}` | `version_conflict`, `schedule_conflict` (+daftar sesi bentrok), `already_reverted`, `in_use` (master dipakai), `invoice_not_deletable`, `already_submitted` |
| 410 | `{message, code:"expired"}` | kode kuesioner kedaluwarsa |
| 422 | `{message, errors:{field:[…]}}` | validasi (`fieldErrors` di frontend) |
| 429 | `{message}` | throttle login/publik |
| 503 | `{message}` | email OTP gagal terkirim |

### 1.3 Struktur kode (disarankan)
`routes/api.php` per modul → `Http/Controllers/Api/<Modul>/*Controller` (tipis) → `Http/Requests/*Request` (validasi) → `Actions/<Modul>/*Action` (satu use-case, berisi transaksi, mengikuti `frontend/src/domain/*` sebagai acuan test) → `Http/Resources/*Resource`. Policy berbasis modul di `PermissionService`; query list di `Queries/*Query` (indeks sesuai `schema.md` §01).

---

## 2. Peta modul

| Modul | Cakupan | Tabel inti | Sprint |
|---|---|---|---|
| M1 Auth & akun | login staf/ortu, logout, ganti & lupa password | `users`, `clients`, `personal_access_tokens`, `password_reset_otps` | S1 |
| M2 User, RBAC, cabang | user staf, role, matriks modul, `can_delete`, Master Cabang | `users`, `roles`, `role_permissions`, `access_modules`, `branches` | S1 |
| M3 Master data | layanan, kuadran, alasan, paket, hari libur | `services`, `sensory_quadrants`, `cancel_reasons`, `discharge_reasons`, `master_packages`, `holidays` | S1 |
| M4 Inquiry & Client | intake, pipeline, layanan, status, dokumen | `clients`, `client_code_counters`, `client_services`, `client_documents`, `client_status_histories` | S2 |
| M5 Asesmen | mesin kuesioner, kode, isi publik, hasil | `assessment_*` | S2 |
| M6 Penjadwalan | kalender, sesi, aksi, revert, bulk, laporan, monitoring, cuti client (jatah 30 hari/tahun, §8.6) | `schedules`, `schedule_series`, `session_reports`, `client_leaves` (+ kredit) | S3 |
| M7 Finance & kredit | invoice, bukti, verifikasi, void, pengganti, renewal, konversi, ledger, saldo lebihan | `invoices`, `payment_proofs`, `invoice_logs`, `client_packages`, `credit_ledger`, `package_conversions`, `invoice_counters` | S3 |
| M8 Active client | roster, detail, birthday, analitik | `clients`, `client_packages`, `schedules`, `credit_ledger` | S3–S4 |
| M9 Portal terapis | jadwal sendiri, summary, laporan, cetak | `schedules`, `session_reports`, view | S4 |
| M10 Portal ortu | tagihan, kredit, riwayat, kuesioner | `invoices`, `client_packages`, `schedules`, `assessment_access_codes` | S4 |
| M11 Dashboard | revenue, inquiry, schedule, cabang, terapis | view `v_*` | S4 |
| M12 Hapus data | client, invoice, sesi, master, cabang | FK cascade/restrict | S2–S4 |
| M13 Job & sinkron | reconcile, backup, housekeeping, email OTP, hapus file | — | S4 |
| M14 Google Calendar | sinkron sesi → Google | `google_calendar_integrations` | setelah go-live |

Notasi tabel: **C** insert · **U** update · **D** delete · **R** baca/lock.

---

## 3. M1 Auth & akun

Layar: `/login`, `/roles` (demo), portal ortu. Fitur: F1.

| # | Endpoint | Fungsi / Action | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 1.1 | `POST /auth/login` | `StaffLoginAction` | publik, throttle per email+IP | `email`, `password` | `users` R,U (`last_login_at`); `personal_access_tokens` C; `roles`, `role_permissions`, `branches` R | token + user (role, `branch_id`, matriks modul, `can_delete`, `must_change_password`). 422/401 pesan generik, 429 |
| 1.2 | `POST /auth/client-login` | `ClientLoginAction` | publik, throttle + lockout per IP & per kode | `client_code`, `date_of_birth` | `clients` R,U (`last_login_at`); `personal_access_tokens` C | token portal ortu + ringkasan client. Pesan gagal **selalu generik** (tidak menyebut mana yang salah) |
| 1.3 | `POST /auth/logout` | hapus token aktif | login | — | `personal_access_tokens` D | 204 |
| 1.4 | `GET /auth/me` | profil sesi | login | — | `users`/`clients` R; `role_permissions` R | user/client + izin |
| 1.5 ✚ | `POST /auth/change-password` | `ChangePasswordAction` | staf (satu-satunya endpoint yang boleh dipakai saat `must_change_password = 1`) | `current_password`, `password`, `password_confirmation` | `users` U (`password`, `must_change_password = 0`, `password_changed_at`); `personal_access_tokens` D (token lain) | 204; 422 |
| 1.6 ✚ | `POST /auth/forgot-password` | `RequestPasswordOtpAction` | publik, throttle per email & IP | `email` | `users` R; `password_reset_otps` C (`otp_hash`, `expires_at` ±10 mnt) | respons **selalu generik**; email dikirim **sinkron** setelah commit, gagal → 503 dan baris OTP dibatalkan |
| 1.7 ✚ | `POST /auth/reset-password` | `ResetPasswordWithOtpAction` | publik, throttle | `email`, `otp`, `password` | `password_reset_otps` R,U (`attempts`, `used_at`); `users` U; `personal_access_tokens` D | 422 bila OTP salah/kedaluwarsa/dipakai; maks 5 percobaan lalu OTP hangus |

Catatan: guard `client` tidak punya lupa password (admin menginformasikan kode client). Reset oleh Master ada di M2 (2.5).

---

## 4. M2 User, role/RBAC, cabang

Layar: `/master/users`, `/master/rbac`, `/master/branches`. Fitur: F2 + Master Cabang. Akses: `user_management`, `rbac`, `branch_master` (default hanya Master).

### 4.1 User staf & terapis
| # | Endpoint | Fungsi | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 2.1 | `GET /users` | daftar staf (filter `branch_id`, `role`, `is_active`, `q`) + pagination | `user_management` | — | `users` R, `roles` R, `branches` R | `idx_users_branch_role` |
| 2.2 | `POST /users` | `CreateUserAction` | `user_management` | `name,email,role_id,branch_id,password(temp),title,specialty,bio,phone` | `users` C (`must_change_password = 1`) | 422: email unik; `branch_id` wajib untuk semua role kecuali master (1 cabang) |
| 2.3 | `GET /users/{id}` · `PATCH /users/{id}` | detail / ubah (nama, role, cabang, atribut klinis) | `user_management` | `version` tidak ada (last-write) | `users` R,U | tidak boleh mengosongkan `branch_id` non-master |
| 2.4 | `PATCH /users/{id}/active` | nonaktifkan / aktifkan | `user_management` | `is_active` | `users` U, `personal_access_tokens` D (saat nonaktif) | staf **tidak dihapus** lewat UI |
| 2.5 | `POST /users/{id}/reset-password` ✚ | Master mengatur password sementara | `user_management` | `password` | `users` U (`must_change_password = 1`), `personal_access_tokens` D | 204 |
| 2.6 | `GET /therapists` | daftar ringan terapis (id, nama, cabang, spesialisasi) untuk dropdown | login staf | `branch_id` | `users` R (role terapis, aktif) | tanpa pagination (≤ puluhan) |

### 4.2 Role & matriks akses
| # | Endpoint | Fungsi | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 2.7 | `GET /roles` | daftar role + jumlah akun | `rbac` | — | `roles` R, `users` R (count) | |
| 2.8 | `POST /roles` | buat role kustom | `rbac` | `code,name,badge,description,can_delete` | `roles` C | `is_system = 0` |
| 2.9 | `PATCH /roles/{id}` | ubah label/badge/`can_delete` | `rbac` | | `roles` U | role sistem: hanya `can_delete` pada role non-master |
| 2.10 | `DELETE /roles/{id}` | hapus role | `rbac` + hapus | | `roles` D; `role_permissions` D (cascade); `users` R | 409 `in_use` bila masih ada akun; role sistem ditolak |
| 2.11 | `GET /access-modules` | daftar modul (seed) | `rbac` | | `access_modules` R | |
| 2.12 | `PUT /roles/{id}/permissions` | simpan matriks (batch) atau `PATCH` satu modul | `rbac` | `{ module_code: bool }` | `role_permissions` upsert | permission di-cache memo per request |

### 4.3 Master Cabang
| # | Endpoint | Fungsi | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 2.13 | `GET /branches` | daftar cabang (aktif + nonaktif) | login staf | — | `branches` R | dipakai filter cabang semua halaman |
| 2.14 | `POST /branches` | tambah | `branch_master` | `name,code,city,address,phone` | `branches` C | 422: `code` 2–10 huruf/angka unik, `name` unik |
| 2.15 | `PUT /branches/{id}` | ubah | `branch_master` | idem | `branches` U | |
| 2.16 | `PATCH /branches/{id}/active` | aktif/nonaktif | `branch_master` | `is_active` | `branches` U | nonaktif: tak muncul di pilihan baru, riwayat tetap |
| 2.17 ✚ | `GET /branches/{id}/delete-impact` | pratinjau dampak hapus (jumlah client, sesi, invoice, akun, libur) | `branch_master` + hapus | | `clients`,`schedules`,`invoices`,`users`,`holidays` R (count) | untuk dialog konfirmasi |
| 2.18 | `DELETE /branches/{id}` | `DeleteBranchAction` (sinkron, atomik, §14) | `branch_master` + hapus | `confirm_code` = kode cabang | cascade: `schedules`, `clients`(+turunan), `invoices`, `credit_ledger`, `holidays`, `users` non-master, `branches` D | 200 + ringkasan jumlah terhapus; 422 bila `confirm_code` salah. Timeout rute dinaikkan |

---

## 5. M3 Master data & hari libur

Layar: `/admin-inquiry/master-data`, `/finance` (tab paket), `/admin-schedule/holidays`. Fitur: F3, F26. Tabel kecil, dibaca by PK dan di-cache react-query.

| # | Endpoint | Fungsi | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 3.1 | `GET /master/services` · `POST` · `PUT /{code}` · `DELETE /{code}` | layanan intake | baca: login staf; tulis: `inquiry_pipeline`/`inquiry_dashboard`; hapus: +hapus | `code,label,short_label,category,description,is_active,sort_order` | `services` C,U,D | DELETE: 409 `in_use` bila ada `client_services`/`schedules.service_code` → nonaktifkan |
| 3.2 | `GET /master/quadrants` · `POST` · `PUT /{code}` · `DELETE /{code}` | kuadran sensori | idem | `code,title,full_name,description,color,sort_order` | `sensory_quadrants` | DELETE: 409 bila dipakai `assessment_questions`/`assessment_quadrant_scores`; minimal 1 kuadran |
| 3.3 | `GET /master/cancel-reasons` ✚ · `POST` · `PUT /{code}` · `DELETE /{code}` | pilihan cepat alasan cancel dan **Therapist Off** (TANPA FK; filter `?therapist_off=0` atau `1`) | tulis: `weekly_calendar` atau `inquiry_*`; hapus: +hapus | `code,label,is_active,is_therapist_off,sort_order` | `cancel_reasons` | DELETE tanpa pengecekan (transaksi menyimpan string) |
| 3.4 | `GET /master/discharge-reasons` ✚ · `POST` · `PUT` · `DELETE` | idem untuk discharge | idem | idem | `discharge_reasons` | idem |
| 3.5 | `GET /master/packages` · `POST` · `PUT /{id}` · `PATCH /{id}/active` ✚ · `DELETE /{id}` ✚ | katalog paket kredit | `finance`; hapus +hapus | `name,invoice_code(unik,≠ASM),credits,price,description,is_active` | `master_packages` C,U,D | harga diubah tidak memengaruhi invoice/paket lama (snapshot). DELETE: 409 `in_use` bila ada `invoices`/`client_packages.master_package_id` |
| 3.6 | `GET /holidays` · `POST` · `PUT /{id}` · `DELETE /{id}` ✚ | hari libur | `holidays`; hapus +hapus | `holiday_date,name,branch_id(null=semua)` | `holidays` C,U,D | UNIQUE (tanggal, cabang) → 422. Menambah libur **tidak** mengubah sesi yang sudah ada; sesi terdampak bisa dihitung di respons (`affected_sessions`) |

---

## 6. M4 Inquiry & Client

Layar: `/admin-inquiry/pipeline`, `/admin-inquiry/pipeline/:id` (Client Detail), `/admin-inquiry` (dashboard). Fitur: F4, F5, F9. Akses utama: `inquiry_pipeline`, `inquiry_dashboard`. Pencarian client (nama/ortu/kode) memakai `idx_clients_child_name`, `idx_clients_parent_name`, UNIQUE `client_code` (Q5).

### 6.1 Daftar & pencarian
| # | Endpoint | Fungsi | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 4.1 | `GET /clients` | list client (dipakai pipeline, roster, picker jadwal, search finance) | `inquiry_*`, `active_clients`, `weekly_calendar`, `finance`, `therapist_module` (terapis: hanya client yang pernah dijadwalkan padanya) | `branch_id,status[],q,service_code,credit_status(healthy/low/zero),page,per_page,sort` | `clients` R (+ `client_services` R untuk filter layanan; `client_packages`/kolom `credit_balance` untuk filter kredit) | `idx_clients_pipeline`, `idx_clients_roster`; item memuat ringkasan (kode, nama, ortu, cabang, status, `credit_balance`, layanan) |
| 4.2 ✚ | `GET /clients/pipeline-summary` | jumlah client per status per cabang (kolom kanban) | `inquiry_pipeline` | `branch_id` | `clients` R (group by status) | kanban memuat tiap kolom bertahap via 4.1 `status=…` |
| 4.3 ✚ | `GET /clients/check-duplicate` | peringatan nama+tanggal lahir sama (bukan blokir) | `inquiry_pipeline` | `child_name,date_of_birth` | `clients` R | `{ duplicates:[…] }` |

### 6.2 Intake & biodata
| # | Endpoint | Fungsi / Action | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 4.4 | `POST /clients` | `CreateClientAction` (F4) | `inquiry_pipeline` | `branch_id,child_name,gender,date_of_birth,parent_name,parent_phone,parent_email?,address?,intake_note?` | `clients` C (`status = inquiry`); `client_code_counters` U (`LAST_INSERT_ID(last_number+1)`, grup dari huruf pertama nama); `client_status_histories` C (`trigger = created`) | kode `AE-00001` dibuat server, tidak berubah walau nama diedit. 422 validasi |
| 4.5 | `GET /clients/{id}` | detail client | sama dengan 4.1 | — | `clients` R; `client_services`, `client_documents` R; `assessment_access_codes` R; `invoices` R (ringkas); `client_packages` R | satu payload Client Detail |
| 4.6 | `PATCH /clients/{id}` | ubah biodata & `intake_note` | `inquiry_pipeline` | `version` + field berubah (kode client **tidak** dapat diubah) | `clients` U | 409 `version_conflict` |

### 6.3 Layanan, dokumen, status
| # | Endpoint | Fungsi / Action | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 4.7 | `PUT /clients/{id}/services` | `SyncClientServicesAction` (F5) | `inquiry_pipeline` | `service_codes[]` (hanya `services.is_active = 1`) | `client_services` C/D (selisih); `clients` U (`status = service_selected` bila daftar tak kosong & status masih sebelumnya); `client_status_histories` C (`trigger = service_selected`, hanya bila status berubah) | melepas semua layanan tidak memundurkan status |
| 4.8 | `POST /clients/{id}/gdrive-links` | simpan link Google Drive | `inquiry_pipeline` | `url,label?` | `client_documents` C/U (`type = gdrive_folder`) | dokumen = link saja, tanpa upload |
| 4.9 ✚ | `DELETE /clients/{id}/gdrive-links/{docId}` | hapus link | +hapus | | `client_documents` D | |
| 4.10 | `POST /clients/{id}/transition` | `TransitionClientAction` (F9/F20; §6.6 schema) | `inquiry_pipeline` atau `active_clients` | `to_status`, `reason?`, `note?` (discharge/discontinue wajib alasan), `version` | `clients` U (`status`, `status_changed_at`, `final_outcome`, `date_of_join`/`date_of_discharge`/`date_of_discontinue`, `discharge_reason`, `discharge_note`); `client_status_histories` C (`trigger` = `manual`/`outcome`/`discharge`/`revert`) | ke tahap mana pun (otomatis hanya maju). Admit **tidak** membuat paket. Sesi mendatang **tidak** dibatalkan otomatis saat discharge |
| 4.11 | `GET /clients/{id}/pipeline-logs` | timeline status | semua yang boleh lihat client | `cursor` | `client_status_histories` R (`idx_csh_client`) | keyset |
| 4.12 | `DELETE /clients/{id}` | `DeleteClientAction` (hapus permanen, §14) | `inquiry_pipeline`/`active_clients` + hapus | | cascade: seluruh turunan client | 204; file bukti bayar dihapus sinkron setelah commit |

### 6.4 Dashboard inquiry (baca)
| # | Endpoint | Fungsi | Akses | Request kunci | Tabel / view | Catatan |
|---|---|---|---|---|---|---|
| 4.13 | `GET /dashboards/inquiry` | KPI funnel, tren, alasan discharge/drop-off | `inquiry_dashboard` | `branch_id,period,start,end,service_code,q` | `v_daily_pipeline` ← `client_status_histories`; `clients` R | pie alasan discharge: agregasi `clients.discharge_reason` (kode pilihan cepat per kode, teks custom → "Lainnya") |
| 4.14 | `GET /clients?status=discontinued` | log drop-off (+ `date_of_discontinue`) | `inquiry_dashboard` | pencarian `q` | `clients` R | tab Discontinued |
| 4.15 | `GET /assessment-codes?awaiting=1` | tab "Menunggu Kuesioner" + pencarian nama | `inquiry_dashboard` | `branch_id,q` | `assessment_access_codes` R (`idx_codes_awaiting`) + `clients` R | kode kedaluwarsa tetap tampil (ditandai) — Q18 |

---

## 7. M5 Asesmen & kuesioner

Layar: `/admin-inquiry/assessments` (mesin), Client Detail (kode), `/assessment` (publik), `/admin-inquiry/parent-assessment/:id` (hasil). Fitur: F6, F7, F8.

### 7.1 Mesin kuesioner (Master/admin dengan akses inquiry)
| # | Endpoint | Fungsi | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 5.1 | `GET /assessment-categories` | template + section + soal (satu query form) | `inquiry_*` | `with=sections.questions` | `assessment_categories`, `assessment_sections`, `assessment_questions` R (`idx_questions_form`) | |
| 5.2 | `POST /assessment-categories` · `PATCH /{id}` | buat/ubah template | `inquiry_*` | `name,type_code(unik),standard_title,author,domain,scoring_key,is_active,version` | `assessment_categories` C,U | `type_code` jangan diubah setelah ada kode terbit; 409 version |
| 5.3 | `DELETE /assessment-categories/{id}` | hapus template | `inquiry_*` + hapus | | `assessment_categories` D → cascade `sections`/`questions` | 409 `in_use` bila ada kode/respons memakai kategori itu; minimal 1 kategori |
| 5.4 ✚ | `POST /assessment-categories/{id}/sections` · `PATCH`/`DELETE /assessment-sections/{id}` | kelola section | `inquiry_*` (+hapus) | `title,lead_text,sort_order` | `assessment_sections` | DELETE cascade soal (bila belum dijawab) |
| 5.5 ✚ | `POST /assessment-sections/{id}/questions` · `PATCH`/`DELETE /assessment-questions/{id}` · `PUT /assessment-sections/{id}/questions/order` | kelola soal (12 tipe) | `inquiry_*` (+hapus) | `question_type,question,options,range_*,quadrant_code,is_required,sort_order` | `assessment_questions` | DELETE: 409 `in_use` bila sudah ada `assessment_answers`; nonaktifkan/biarkan |

### 7.2 Kode kuesioner
| # | Endpoint | Fungsi / Action | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 5.6 | `GET /clients/{id}/assessment-codes` | kode milik client | lihat client | | `assessment_access_codes` R, `assessment_categories` R | |
| 5.7 | `POST /clients/{id}/assessment-codes` | `IssueAssessmentCodeAction` (F6) | `inquiry_pipeline` | `category_id`, `expires_at?` | `assessment_access_codes` C (`{type_code}-{6 acak}`, retry bila bentrok); `clients` U (maju ke `assessment_scheduled`); `client_status_histories` C (`code_issued`) | satu client boleh banyak kode |
| 5.8 ✚ | `DELETE /assessment-codes/{id}` | hapus kode yang belum diisi | `inquiry_pipeline` + hapus | | `assessment_access_codes` D | 409 bila `status = submitted`; status client tidak dimundurkan |

### 7.3 Kuesioner publik (ortu, tanpa login)
| # | Endpoint | Fungsi / Action | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 5.9 | `GET /public/assessments/{code}` | `OpenAssessmentAction` | publik, throttle per IP | — | `assessment_access_codes` R; `clients` R; `assessment_categories/sections/questions` R; `invoices` R (gating) | 404 generik; 409 `already_submitted`; 410 `expired`; **403 `invoice_unpaid`** (+ nomor invoice → diarahkan ke portal bayar) |
| 5.10 | `POST /public/assessments/{code}/responses` | `SubmitAssessmentAction` | publik, throttle | `answers[]` (semua soal wajib), `consent` (wajib), `respondent_name,respondent_relation` | `assessment_responses` C (UNIQUE `access_code_id`, `consent_at`, `ip_address`); `assessment_answers` C (snapshot `item_no`,`quadrant_code`,`score`); `assessment_quadrant_scores` C (Σ skor, **dihitung server**, tanpa klasifikasi); `assessment_access_codes` U (`submitted`); `clients` U (maju ke `assessment_done`); `client_status_histories` C (`questionnaire_submitted`) | 409 bila sudah diisi (sekali isi); satu transaksi |

### 7.4 Hasil (staf internal)
| # | Endpoint | Fungsi | Akses | Tabel | Catatan |
|---|---|---|---|---|---|
| 5.11 | `GET /clients/{id}/assessment-responses` · `GET /assessment-responses/{id}` | hasil + jawaban + skor kuadran | `inquiry_*`, `therapist_module` | `assessment_responses`, `assessment_answers`, `assessment_quadrant_scores` R | **ortu tidak melihat hasil**; cabang sesuai scope |

---

## 8. M6 Penjadwalan & sesi

Layar: `/admin-schedule/calendar` (Weekly Calendar), Client Detail (jadwal asesmen), `/admin-schedule/unreported-reports`. Fitur: F10–F16, F26, F27. Akses utama: `weekly_calendar`, `holidays`, `unreported_reports`; terapis hanya laporan sesinya.

### 8.1 Baca
| # | Endpoint | Fungsi | Akses | Request kunci | Tabel | Catatan |
|---|---|---|---|---|---|---|
| 6.1 | `GET /schedules` | kalender per minggu/hari/rentang | `weekly_calendar`, `active_clients`, `therapist_module` (own) | `branch_id,from,to,therapist_id,client_id,status[],type,q` | `schedules` R (`idx_sch_calendar`, `idx_sch_therapist`, `idx_sch_client`); `clients` R (nama, kode, ortu); `client_packages`/`clients.credit_balance` R (untuk penanda Frozen) | satu query per minggu per cabang (Q1–Q3). Frozen = turunan `credit_balance = 0` atau client tanpa paket. Pencarian `q` = nama/ortu/kode/terapis/catatan |
| 6.2 | `GET /schedules/{id}` | detail sesi + laporan + paket target + kuota cancel | idem | — | `schedules`, `session_reports`, `client_packages` R | |
| 6.3 | `GET /schedules/conflicts` | preview bentrok (live) | `weekly_calendar` | `therapist_id,date,start_time,end_time,exclude_id` | `schedules` R (`idx_sch_therapist`), `holidays` R | `{ conflicts:[…], holiday:{…}|null }` |
| 6.4 ✚ | `GET /schedule-series?client_id=` | pola jadwal rutin client (profil) | `active_clients` | | `schedule_series` R | tampil di Active Client Detail |
| 6.5 | `GET /schedules/unreported` | monitoring sesi completed tanpa report | `unreported_reports` | `branch_id,therapist_id,from,to,q,page` | view `v_unreported_sessions` ← `schedules`+`session_reports`+`clients` | Q19; filter `filled_sections = 0` |
| 6.6 ✚ | `GET /schedules/{id}/revert-preview` | pratinjau efek revert (status tujuan, slot, kredit/kuota, cek bentrok) | `weekly_calendar` | | `schedules`, `credit_ledger`, `client_packages` R | boleh dihitung FE; backend tetap validasi saat revert |

### 8.2 Buat & ubah
| # | Endpoint | Fungsi / Action | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 6.7 | `POST /schedules` | `CreateScheduleAction` (single, F10) | `weekly_calendar` | `client_id,therapist_id,type(therapy/assessment/consultation),session_date,start_time,end_time,client_package_id?,booking_note?,force?` | `schedules` C (`service_code` diturunkan dari client; `client_package_id` NULL untuk asesmen); `clients` U + `client_status_histories` C (`assessment_scheduled`, hanya asesmen & status masih awal) | tolak (422) tanggal libur; 409 `schedule_conflict` (daftar bentrok) kecuali `force=true` oleh role berwenang. Client Frozen tetap boleh dijadwalkan |
| 6.8 | `POST /schedules/bulk` | `CreateRecurringSchedulesAction` (pola berulang) | `weekly_calendar` | `client_id,weeks(default 12),starts_on,days[{day,start,end,therapist_id,client_package_id}]` | `schedule_series` C; `schedules` C (N, ber-`series_id`); `holidays` R | tanggal libur **dilewati**; satu transaksi; respons memuat jumlah dibuat & dilewati |
| 6.9 | `PATCH /schedules/{id}` | ubah catatan penjadwalan (`booking_note`) | `weekly_calendar` | `version`, `booking_note` | `schedules` U | `booking_note` terpisah dari `cancel_note`/`pending_note` |
| 6.10 | `PUT /schedules/{id}/report` | `SaveSessionReportAction` (F16) | terapis (own) atau `weekly_calendar` | `activity_section,note_section,homework_section` (+SOAP), `version` | `session_reports` upsert (UNIQUE `schedule_id`; `client_id`,`therapist_id` didenormalisasi; `filled_sections` generated) | boleh kapan saja, tak harus menunggu completed |
| 6.11 | `DELETE /schedules/{id}` | hapus sesi | `weekly_calendar` + hapus | | `schedules` D → `session_reports` cascade; `credit_ledger.schedule_id` SET NULL | 422 bila `completed`/ber-ledger belum di-revert |

### 8.3 Aksi status & kredit (transaksional)
| # | Endpoint | Fungsi / Action | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 6.12 | `POST /schedules/{id}/complete` | `CompleteSessionAction` (F11) | `weekly_calendar` | `version`, `report?` | `schedules` U (`completed`, `previous_status`, `credit_effect`, `completed_*`); terapi: `client_packages` U (−1, `depleted` bila 0; paket sesi lalu FIFO), `clients` U (`credit_balance`), `credit_ledger` C (`used`, `idempotency_key`); asesmen: `clients` U (`assessment_done`) + `client_status_histories` C (`session_completed`); `session_reports` upsert | asesmen tidak memotong kredit; complete ulang tidak dobel; tanpa paket bersisa = tidak ada potongan |
| 6.13 | `POST /schedules/{id}/cancel` | `CancelSessionAction` (F12) | `weekly_calendar` | `reason` (maks 150), `deduct_credit` (boolean **wajib, tanpa default**), `note?`, `version` | `schedules` U (`cancelled`, `cancel_reason`, `cancel_note`, `credit_effect`); `client_packages` U (`cancel_count`+1 pada **paket target**; `remaining_credit`−1 bila potong); `clients` U; `credit_ledger` C (`cancel_penalty`/`cancel_excused`, `cancel_count_after`) | `{ cancel_count, deducted, quota_exceeded }`. 422 bila `deduct_credit` tapi tak ada saldo. Berlaku untuk scheduled/rescheduled/reschedule_pending, semua jenis kalender |
| 6.14 | `POST /schedules/{id}/reschedule` | `RescheduleSessionAction` (F13) | `weekly_calendar` | `session_date,start_time,end_time,therapist_id` | `schedules` U (`rescheduled`, slot baru, `origin_*` bila kosong, `prev_*`, `rescheduled_at`, kosongkan `pending_*`) | slot harus beda & lolos bentrok (409); tanggal libur 422; tanpa efek kredit |
| 6.15 | `POST /schedules/{id}/mark-pending` | tandai "jadwal pengganti menyusul" | `weekly_calendar` | `reason,note?` | `schedules` U (`reschedule_pending`, `pending_*`) | diabaikan cek bentrok |
| 6.16 | `POST /schedules/{id}/drop-pending` | batalkan sesi yang menggantung | `weekly_calendar` | `deduct_credit` wajib, `note?` | sama dengan cancel (alasan sistem `reschedule_dibatalkan`) | |
| 6.17 | `POST /schedules/{id}/revert` | `RevertSessionAction` (F14, **hanya 1x**) | `weekly_calendar` | `reason` (wajib, maks 300), `version` | `schedules` U (status/slot dipulihkan, `reverted_at`, `credit_effect`); `credit_ledger` C (`reversal`, `reverses_ledger_id` UNIQUE); `client_packages` U (`remaining_credit`/`cancel_count`); `clients` U (kredit, status dipulihkan via `client_status_from/to`); `client_status_histories` C (`revert`) | 422 `already_reverted`; 409 slot target terisi |

### 8.4 Aksi massal
| # | Endpoint | Fungsi | Akses | Request kunci | Tabel | Catatan |
|---|---|---|---|---|---|---|
| 6.18 | `POST /schedules/bulk/{action}` — `complete`, `cancel`, `reschedule`, `revert` | `Bulk*Action` | `weekly_calendar` | `ids[]` + parameter aksi (`reason`, `deduct_credit` untuk cancel). **`reschedule` memakai `rows[{id,date,start_time,end_time,therapist_id}]` (tujuan per sesi), bukan `ids[]`** | sama dengan aksi tunggal, satu `batch_id` pada `credit_ledger` | `complete`/`cancel`/`revert`: sesi yang tak memenuhi syarat dilewati dan dilaporkan `{ done:[…], skipped:[{id,reason}] }`. **`reschedule` ATOMIK**: validasi semua baris (bentrok terapis termasuk antar-baris dalam batch, libur, tidak berubah, jam terbalik); ada satu gagal → rollback semua, 422 `{ errors:{ "rows.N":[…] } }`; satu transaksi per batch |

### 8.5 Efek jadwal dari modul lain
- Aktivasi paket / renewal (M7) memindahkan sesi mendatang ke paket aktif: `UPDATE schedules SET client_package_id` (§9 langkah relink).
- Konversi paket menghapus sesi terapi mendatang client; Void dengan "cabut kredit" memindahkan atau membekukan sesi mendatang (§9).

### 8.6 Cuti client (jatah 30 hari sesi per tahun kalender, dihitung per sesi) ✚
Layar: tab **Cuti** di `/finance`, kartu Jatah Cuti di detail client Admin Schedule, switch "Hitung sebagai cuti" di panel Off kalender. **Cuti = Off** (tanpa status baru). Akses: modul `finance` (log cuti), `weekly_calendar` (Off manual). Alur rinci: `schema.md` §6.8.
| # | Endpoint | Fungsi / Action | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 6.19 ✚ | `POST /schedules/{id}/off` | `OffSessionAction` (Off manual; sudah ada di FE) | `weekly_calendar` | `reason`, `deduct_credit` (wajib), `note?`, `counts_as_leave?` (default false), `leave_invoice_amount?`, `version` | `schedules` U (`off`, `off_*`, `counts_as_leave`); `credit_ledger` C (`off_penalty`/`off_excused`; **tanpa** `cancel_count`); opsional `invoices` C (`leave`) | `{ deducted, leave_invoiced, leave_quota }`. Jatah lewat 30 = peringatan, tidak ditolak |
| 6.19b ✚ | `POST /schedules` (+ `leave_id?`, `deduct_credit`) dan `POST /schedules/bulk` | Sesi baru di masa cuti | `weekly_calendar` | `leave_id` bila admin memilih "Jadwalkan sebagai Off (cuti)" | `schedules` C (langsung `off`, `leave_id`) + `credit_ledger` C; bulk/routine-replace melewati hari efektif cuti `active` client (`client_leaves` R) | 422 `leave_mismatch` bila log bukan milik client / tanggal di luar rentang efektif |
| 6.20 ✚ | `GET /leaves` | tab Cuti Finance | `finance` | `branch_id,client_id,status,q,page` | `client_leaves` R (`idx_leave_branch`) + `clients` R (nama/kode/ortu); jumlah sesi Off per log: `schedules` R (`idx_sch_leave`) | Q24; fase (`upcoming/ongoing/done/early/voided`) diturunkan dari tanggal |
| 6.21 ✚ | `POST /leaves` | `CreateLeaveAction` | `finance` | `client_id,start_date,end_date,reason?,note?,deduct_credit` (wajib bila ada sesi di rentang) | `client_leaves` C; `schedules` U (sesi terapi `scheduled/rescheduled` di rentang → `off`, `off_reason=OL`, `leave_id`); `credit_ledger` C; `client_packages` U / `clients` U (bila potong) | 422 `leave_overlap`. Respons: `days` (hari kalender rentang, info), `sessions_off, deducted, byYear[{year,used,adding,after,remaining,over}]` (dari sesi yang di-Off-kan; kosong bila tanpa sesi), `warnings[]`. Satu transaksi + `lockForUpdate` (client → sesi) |
| 6.22 ✚ | `POST /leaves/{id}/end` | `EndLeaveEarlyAction` (anak masuk lebih awal) | `finance` | `return_date`, `reason?`, `version` | `client_leaves` U (`return_date`, `return_note`); `schedules` U (Off ber-`leave_id` pada/sesudah tanggal → `previous_status`, `leave_id` NULL, `reverted_at` tetap NULL); `credit_ledger` C (`reversal` bila ada baris `off_*`) | `{ days_returned (hari sesi yang kembali ke jatah), released, conflicted }`; slot terisi (§6.4) dilewati: tetap Off, `leave_id` NULL. 422 bila `return_date` di luar rentang efektif |
| 6.23 ✚ | `POST /leaves/{id}/void` | `VoidLeaveAction` (akhiri sejak hari pertama) | `finance` | `reason` (wajib), `version` | seperti 6.22 + `client_leaves` U (`status=voided`, `void_*`) | Tidak bisa dibatalkan; 409 bila sudah void |
| 6.24 ✚ | `DELETE /leaves/{id}` | hapus log (permanen) | `finance` + hapus | | `client_leaves` D; `schedules.leave_id` SET NULL (sesi tetap Off biasa) | |
| 6.25 ✚ | `GET /clients/{id}/leave-quota?year=` | jatah cuti (kartu client, pratinjau dialog) | `finance`, `active_clients`, `weekly_calendar` | `year` | `client_leaves` R (`idx_leave_client`), `schedules` R (`idx_sch_client`, filter `counts_as_leave`) | `{ year, quota:30, used, remaining, over }` (`used` = `COUNT(DISTINCT session_date)` sesi Off dengan `leave_id` atau `counts_as_leave`; rentang log tidak dihitung) |

---

## 9. M7 Finance & kredit

Layar: `/finance` (tab Verifikasi Transfer, Semua Tagihan, Log Buku Besar Kredit, Saldo Lebihan, Master Paket), portal ortu (upload). Fitur: F17, F18, F19, F29, Void, Invoice pengganti. Akses: `finance` (ortu hanya upload bukti miliknya).

### 9.1 Invoice
| # | Endpoint | Fungsi / Action | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 7.1 | `GET /invoices` | list (tab Verifikasi: `status=unpaid,pending_verification,rejected`; Semua Tagihan: semua) | `finance`, `revenue` (baca) | `branch_id,status[],type,is_renewal,client_id,q(nama/ortu/kode/no. invoice),from,to,page` | `invoices` R (`idx_inv_queue`, `idx_inv_client`, UNIQUE `invoice_number`); `clients` R (join pencarian); `v_invoice_queue` untuk antrean | item memuat badge: jenis, `is_renewal`, `gross_amount`/`balance_applied`, ada log `converted`, status `void` |
| 7.2 | `POST /invoices` | `IssueInvoiceAction` | `finance` | `client_id,invoice_type(package/assessment),master_package_id?,amount?,is_renewal?,replaces_invoice_id?` | `invoices` C (nomor dari `invoice_counters`: `INV-{KODE}-{YYYYMMDD}-{NNN}`; snapshot nama/kredit/harga); `invoice_counters` U; `clients` U (`leftover_balance`) bila saldo lebihan dipakai (`balance_applied = min(saldo, gross)`); `invoice_logs` C (`issued`, `balance_applied`) | **`replaces_invoice_id` wajib dipilih** (atau `null` eksplisit) bila ada kandidat; harus invoice `void` + `keep`, client sama, belum diganti (UNIQUE) → 422. Tanpa jatuh tempo/diskon/DP/cicilan |
| 7.3 ✚ | `GET /invoices/replacement-candidates?client_id=` | kandidat invoice void (kredit dipertahankan) untuk dialog Buat Tagihan/Renewal | `finance` | | `invoices` R, `client_packages` R | untuk pilihan wajib "menggantikan / paket baru" |
| 7.4 | `GET /invoices/{id}` | detail + paket + bukti | `finance` / ortu pemilik | | `invoices`, `payment_proofs`, `client_packages` R | |
| 7.5 | `POST /invoices/{id}/proof` | `UploadPaymentProofAction` (multipart) | ortu pemilik (atau `finance`) | `file` JPG/PNG/PDF ≤ 5 MB | file → storage privat; `payment_proofs` C (`review_status = pending`); `invoices` U (`pending_verification`, `proof_upload_count`+1); `invoice_logs` C (`proof_uploaded`) | 422 bila `proof_upload_count ≥ 4` (1 upload + 3 re-upload), file tak valid |
| 7.6 ✚ | `GET /invoices/{id}/proofs/{proofId}/file` | tampilkan/unduh bukti (stream, URL bertanda tangan) | `finance` / ortu pemilik | | `payment_proofs` R | file privat; melihat bukti tidak dicatat |
| 7.7 | `POST /invoices/{id}/verify` | `VerifyPaymentAction` | `finance` | `decision(approve/reject)`, `rejection_reason?`, `version` | **approve**: `invoices` U (`paid`, `paid_at`, `verified_by/at`); `payment_proofs` U (`accepted`); jenis **package**: `client_packages` C (snapshot, `invoice_id` UNIQUE) + `credit_ledger` C (`purchased`/`renewed`) + `clients` U (`credit_balance`) + **relink sesi mendatang** ke paket aktif (`schedules` U); jenis **assessment**: hanya `paid` (membuka gating kuesioner); **invoice pengganti** (`replaces_invoice_id`): **tidak** membuat paket/ledger, `client_packages.invoice_id` paket lama dipindah ke invoice ini. **reject**: `invoices` U (`rejected`), `payment_proofs` U (`rejected`). `invoice_logs` C (`verified`/`rejected`) | 409 bila bukan `pending_verification`/versi beda |
| 7.8 | `POST /invoices/{id}/void` | `VoidInvoiceAction` | `finance` (bukan `can_delete`) | `reason` (wajib), `credit_action` = `keep`/`revoke` (**wajib bila invoice package, tanpa default**) | `invoices` U (`void`, `void_reason`, `voided_at/by`, `void_credit_action`); `invoice_logs` C (`voided`); jika `revoke`: `client_packages` U (paket hidup ujung rantai → `voided`, `remaining_credit = 0`), `credit_ledger` C (`manual_adjust` −sisa), `clients` U (`credit_balance`, `leftover_balance += balance_applied`), `schedules` U (sesi mendatang pindah ke paket aktif lain, jika tidak ada → `client_package_id = NULL` = Frozen) | hanya dari `paid` (409 selain itu); sesi selesai & laporan tidak disentuh; satu arah |
| 7.9 ✚ | `GET /invoices/{id}/void-preview` | ringkasan dialog Void (paket, sisa kredit, sesi selesai terpakai, sesi mendatang) | `finance` | | `client_packages`, `schedules` R | |
| 7.10 | `DELETE /invoices/{id}` | `DeleteInvoiceAction` | `finance` + hapus | | `invoices` D → `payment_proofs` (+ file), `invoice_logs` cascade; `clients` U (`leftover_balance` += `balance_applied`) | **hanya `unpaid`/`pending_verification`/`rejected`**; `paid`/`void` → 409 `invoice_not_deletable` (koreksi lewat Void). Hapus invoice assessment membuka gating bila tak ada invoice assessment lain yang belum lunas |
| 7.11 | `GET /invoices/{id}/logs` | log milik invoice (tombol Log) | `finance` | `cursor` | `invoice_logs` R (`idx_invlog_invoice`) | keyset, terbaru dulu |

### 9.2 Renewal
| # | Endpoint | Fungsi / Action | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 7.12 | `POST /invoices` dengan `is_renewal=true` | renewal jalur **terbitkan invoice baru** | `finance` | sama 7.2 | sama 7.2 | masuk antrean verifikasi seperti invoice biasa |
| 7.13 | `POST /clients/{id}/renewals` | `DirectRenewalAction` (jalur **langsung lunas**) | `finance` | `master_package_id,credits,amount,payment_method?,renewal_reason`(wajib, ≥3 karakter),`renewal_justification`(wajib, ≥10),`replaces_invoice_id?` | `invoices` C (`paid`, `is_renewal = 1`, alasan+justifikasi); `invoice_counters` U; `invoice_logs` C (`renewal_paid`, data alasan); tanpa pengganti: `client_packages` C + `credit_ledger` C (`renewed`) + `clients` U + relink sesi mendatang; dengan pengganti: paket lama dipindah ke invoice ini, **tanpa kredit baru**; saldo lebihan memotong nominal bila ada | 422 bila alasan/justifikasi kosong atau pengganti tidak valid |

### 9.3 Konversi paket
| # | Endpoint | Fungsi / Action | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 7.14 ✚ | `GET /invoices/{id}/convert-preview` | hitung otomatis (sisa nilai, sesi tujuan, lebihan, jadwal terhapus) | `finance` | `target_package_id,sessions?` | `client_packages`, `master_packages`, `schedules` R | batas atas manual = hasil otomatis |
| 7.15 | `POST /invoices/{id}/convert-package` | `ConvertPackageAction` | `finance` | `target_package_id`, `sessions?` (manual), `reason` (wajib bila manual) | `client_packages` U (lama `converted`, `remaining_credit = 0`, `converted_to_package_id`) + C (baru, `converted_from_package_id`, `cancel_count` disalin); `credit_ledger` C (`converted_out`/`converted_in`, `conversion_id`); `package_conversions` C; `clients` U (`credit_balance`, `leftover_balance += leftover`); `invoice_logs` C (`converted`); `schedules` D (sesi terapi mendatang, `scheduled`/`reschedule_pending`) | hanya invoice `paid` jenis package dengan paket hidup bersisa; 422 bila nilai sisa < 1 sesi tujuan atau manual > otomatis (tanpa kekurangan bayar); tanpa revert |

### 9.4 Kredit, ledger, saldo lebihan
| # | Endpoint | Fungsi | Akses | Request kunci | Tabel | Catatan |
|---|---|---|---|---|---|---|
| 7.16 | `GET /credit-ledger` | Log Buku Besar Kredit (semua client) | `finance` | `branch_id,client_id,q,action,cursor` | `credit_ledger` R (`idx_ledger_branch`) + `clients` R (nama/ortu/kode) | keyset (Q10); aksi dengan label termasuk `manual_adjust` (koreksi/pencabutan void), `converted_*` |
| 7.17 | `GET /clients/{id}/credits` | paket + ringkasan kuota per paket + ledger terbaru | lihat client | `cursor` | `client_packages`, `credit_ledger` R | kuota cancel **per paket** (`cancel_count`), paket 0 sesi tidak ditampilkan kecuali tak ada paket bersisa (aturan UI) |
| 7.18 | `GET /credits/leftover-balances` | tab Saldo Lebihan: client + sisa + sumber (invoice asal konversi) + pemakaian | `finance` | `branch_id,q,include_zero,page` | `clients` R (`idx_clients_leftover`); `package_conversions` R (`idx_conv_client`) join `invoices` asal; `invoices` R (`balance_applied > 0`) | `in_sync` = saldo tersimpan vs (Σ masuk − Σ terpakai); void `revoke` tidak dihitung terpakai |
| 7.19 | `POST /credits/adjust` | koreksi saldo manual | `finance` | `client_id,client_package_id,credit_change,reason`(wajib) | `credit_ledger` C (`manual_adjust`), `client_packages` U, `clients` U | tidak boleh membuat sisa negatif |

### 9.5 Aturan lintas endpoint
- **Idempotensi**: aktivasi paket dijaga `client_packages.invoice_id` UNIQUE; potong kredit `idempotency_key`.
- **Frozen** tidak disimpan: `clients.credit_balance = 0` (atau belum punya paket).
- **Saldo lebihan** hanya memotong invoice jenis `package`, sampai sebesar nominal.
- **Relink jadwal** saat paket aktif: `UPDATE schedules SET client_package_id = :target WHERE client_id=? AND type='therapy' AND status IN ('scheduled','rescheduled','reschedule_pending') AND session_date >= CURDATE() AND (client_package_id IS NULL OR client_package_id IN (paket client dengan remaining_credit = 0))`.
- Void/Verify/Renewal/Convert memakai `lockForUpdate` pada invoice + paket + client berurutan (hindari deadlock: urutan `invoices` → `client_packages` → `clients`).

---

## 10. M8 Active client

Layar: `/admin-schedule/clients` (Roster, Birthday Hub, Advanced Analytics), `/admin-schedule/clients/:id`. Fitur: F20. Akses: `active_clients`.

| # | Endpoint | Fungsi | Akses | Request kunci | Tabel | Catatan |
|---|---|---|---|---|---|---|
| 8.1 | `GET /clients?status=admitted,discharged,discontinued` | Client Roster + filter status/kredit/cabang + cari | `active_clients` | `status[],credit_status,branch_id,q` | `clients` R (`idx_clients_roster`); `client_packages` R (paket aktif distinct per jenis, kuota cancel per paket) | kolom "Paket Kredit Aktif": hanya paket bersisa digabung per jenis; bila semua habis → 1 paket terakhir (Frozen) |
| 8.2 | `GET /clients/{id}/profile` ✚ | detail profile: paket + kuota cancel per paket, jadwal rutin, jadwal aktif, riwayat sesi | `active_clients` | `from,to,page` | `clients`, `client_packages`, `schedule_series`, `schedules`, `credit_ledger` R | riwayat sesi dipaginasi 10; kolom "Catatan Penjadwalan" = `booking_note` |
| 8.3 | `POST /clients/{id}/transition` | discharge, discontinue, reaktivasi dari list/detail | `active_clients` | (M4 4.10) | (M4) | |
| 8.4 | `GET /clients/birthdays?month=&branch_id=` ✚ | Birthday Hub | `active_clients` | | `clients` R (`idx_clients_birthday`, generated `birth_month`) | Q7, tanpa job |
| 8.5 | `GET /dashboards/client-analytics` ✚ | Advanced Analytics: KPI + Tabel Performa Kehadiran | `active_clients` | `branch_id,therapist_id,period,start,end,q,sort,page` | `clients`, `schedules` R; `credit_ledger` R (`cancel_penalty` belum di-reversal); `client_packages` R | **Tidak hadir = hanya cancel yang memotong kredit** (`cancel_penalty` tanpa `reversal`); kehadiran % = hadir ÷ (hadir + tidak hadir); tanpa kolom sisa paket per jenis & tanpa peringatan kuota |

---

## 11. M9 Portal terapis

Layar: `/therapist`, `/therapist/summary`, `/therapist/clients/:id`, `/print/client/:id`. Fitur: F21. Akses: `therapist_module`; semua data difilter `therapist_id` user.

| # | Endpoint | Fungsi | Request kunci | Tabel | Catatan |
|---|---|---|---|---|---|
| 9.1 | `GET /schedules` (own) | My Clinical Schedule: kalender mingguan/harian + pencarian nama/ortu/kode | `from,to,q,client_id` | `schedules`, `clients` R (`idx_sch_therapist`) | server memaksa `therapist_id = user` |
| 9.2 | `GET /dashboards/therapist-summary` | Summary Laporan: Session Feed + Rangkuman Client (10 per halaman) | `period,start,end,client_id,report_status,q,tab,page` | view `v_therapist_sessions` ← `schedules`+`clients`+`session_reports` | Q17; pencarian: nama/ortu/kode + isi laporan |
| 9.3 | `GET /therapist/clients` ✚ | client yang pernah dijadwalkan ke terapis | `q,page` | `clients`, `schedules` R | |
| 9.4 | `GET /therapist/clients/{id}` ✚ | detail client: biodata, riwayat sesi (dipaginasi, cari terapis/status/tanggal/isi laporan), kuota cancel per paket (read-only), link GDrive, hasil asesmen | `q,page` | `clients`, `schedules`, `session_reports`, `client_packages`, `assessment_responses/quadrant_scores`, `client_documents` R | |
| 9.5 | `PUT /schedules/{id}/report` | isi/ubah laporan sesi (M6 6.10) | | `session_reports` upsert | terapis hanya sesinya |
| 9.6 ✚ | `GET /clients/{id}/report-print` | data cetak laporan klinis client | | sama 9.4 | ekspor/cetak tidak dicatat |

---

## 12. M10 Portal orang tua

Layar: `/client` (mobile-first), `/assessment` (publik, lihat M5). Fitur: F22. Guard `client`; semua data milik `auth.client_id`.

| # | Endpoint | Fungsi | Request kunci | Tabel | Catatan |
|---|---|---|---|---|---|
| 10.1 | `GET /portal/me` ✚ | ringkasan: biodata anak, cabang, kredit (paket aktif distinct), kuota | — | `clients`, `client_packages`, `branches` R | tanpa data terapis lain |
| 10.2 | `GET /portal/sessions` ✚ | riwayat sesi **completed** + filter tanggal (10 per halaman) | `from,to,page` | `schedules` R (`idx_sch_client`), `session_reports` R | |
| 10.3 | `GET /portal/sessions/{id}/report` ✚ | baca laporan; **nonaktif bila laporan kosong** (`filled_sections = 0` → 404/422) | | `session_reports` R | |
| 10.4 | `GET /portal/sessions/{id}/report/export` ✚ | export laporan harian (PDF/HTML cetak) | | `session_reports`, `schedules` R | |
| 10.5 | `GET /portal/invoices` ✚ | tagihan: invoice paket terbaru (tanpa `void`) + invoice assessment pending | | `invoices` R, `payment_proofs` R | invoice `void` tidak ditagihkan |
| 10.6 | `POST /invoices/{id}/proof` | upload bukti (M7 7.5) | `file` | `payment_proofs`, `invoices`, `invoice_logs` | hanya invoice milik client; kuota re-upload |
| 10.7 | `GET /portal/questionnaires` ✚ | kode kuesioner belum diisi + status gating (ada invoice assessment pending?) | | `assessment_access_codes` R, `invoices` R | ortu tidak melihat hasil |

---

## 13. M11 Dashboard & analitik

Semua angka dari **VIEW** atau agregasi terindeks, selalu dengan filter cabang + rentang tanggal WIB. Periode: Semua Waktu, Minggu Ini, 7 Hari, Bulan Ini, Bulan Lalu, Kuartal, **Kustom** (`start`,`end`).

| # | Endpoint | Layar | Akses | Sumber | Catatan |
|---|---|---|---|---|---|
| 11.1 | `GET /dashboards/revenue` | Revenue (master/manager) + tabel transaksi dengan pencarian nama/ortu/kode/no. invoice | `revenue` | view `v_daily_revenue` ← `invoices` (`status = 'paid'`, `idx_inv_paid_date`); daftar transaksi: `invoices` + `clients` | `void` tidak masuk omzet; Q11, pagination 10 untuk tabel transaksi |
| 11.2 | `GET /dashboards/inquiry` | Inquiry Dashboard | `inquiry_dashboard` | `v_daily_pipeline` | lihat 4.13 |
| 11.3 | `GET /dashboards/schedule` | Schedule Dashboard (KPI sesi, beban terapis, alasan cancel, distribusi layanan) | `schedule_dashboard` | `v_daily_sessions` (termasuk `sessions_cancel_counted`, `sessions_cancel_therapist_off` untuk Cancellation Rate & Therapist Off Rate), `v_daily_credit_usage`, agregasi `schedules.cancel_reason` | Therapist Off adalah bagian dari cancel keseluruhan |
| 11.4 | `GET /dashboards/branch-performance` | Performa Inquiry & Intake All-Branch (filter rentang waktu, KPI, chart per cabang, tren 6 bulan, matriks konversi/drop-off) | `revenue` (master) | `clients` R (intake per `created_at`), `v_daily_pipeline` | rasio konversi = admitted ÷ total intake (sekali di KPI + matriks, tanpa chart duplikat); cabang dinamis dari `branches` |
| 11.5 | `GET /dashboards/therapist-summary` | (lihat 9.2) | | | |
| 11.6 | `GET /dashboards/client-analytics` | (lihat 8.5) | | | |

---

## 14. M12 Hapus data (ringkasan lintas modul)

Semua hapus **permanen** (ADR 0005), role `can_delete` + akses modul. Matriks lengkap: `schema.md` §6.7.

| Endpoint | Yang ikut terhapus | Pemblokir | Kode error |
|---|---|---|---|
| `DELETE /clients/{id}` | jadwal (+laporan), seri, invoice (bukti, log), paket, konversi, ledger, riwayat status, kode/jawaban kuesioner, dokumen, layanan terpilih | tidak ada | — |
| `DELETE /invoices/{id}` | bukti bayar (+file), log invoice | hanya `unpaid`/`pending_verification`/`rejected` | 409 `invoice_not_deletable` |
| `DELETE /schedules/{id}` | `session_reports` | `completed`/ber-ledger harus di-revert | 422 |
| `DELETE /assessment-codes/{id}` | — | hanya `issued` | 409 |
| `DELETE /master/services\|quadrants\|packages`, `/assessment-categories`, `/assessment-questions`, `/roles` | anak milik (sections/questions/permissions) | **sudah dipakai** (FK `RESTRICT` + pengecekan service) | 409 `in_use` (+ alasan "dipakai di N data") |
| `DELETE /master/cancel-reasons\|discharge-reasons`, `/holidays` | — | tidak ada (string/konfigurasi) | — |
| `DELETE /branches/{id}` | seluruh isi cabang (client + turunan, jadwal, invoice, ledger, libur, akun non-master) | tidak ada; konfirmasi ketik kode | 422 `confirm_code` salah |

Urutan hapus cabang (satu transaksi atomik, sinkron): `schedules` (batch 1000) → `clients` (batch, cascade turunan) → sisa `invoices`/`credit_ledger` → `holidays` → `users` non-master → `branches`. Setelah commit: hapus file bukti bayar dari storage privat (sinkron; gagal hanya dilog). Tiap hapus menulis **satu baris log aplikasi** (file, bukan tabel): pelaku, entitas, jumlah baris.

---

## 15. M13 Job terjadwal & proses sinkron

Tidak ada queue/job async (`QUEUE_CONNECTION=sync`; tabel `jobs`/`failed_jobs`/`job_batches` dibuat tapi tidak dipakai). Hanya Laravel Scheduler (satu cron `schedule:run`).

| Perintah / proses | Jadwal / pemicu | Tabel | Catatan |
|---|---|---|---|
| `credits:reconcile` | 02:00 harian | `credit_ledger` R; `client_packages`, `clients` U | Σ ledger vs `remaining_credit`/`credit_balance`/`cancel_count`; perbaiki dari ledger + log + peringatan Master. Wajib |
| backup DB | 03:30 harian (cron sistem) | seluruh DB | `mysqldump --single-transaction` + binlog, simpan 14 hari + off-server |
| backup arsip | tiap 6 bulan (alt. 1 tahun) | DB + storage | uji restore tiap arsip |
| housekeeping | 04:00 harian | `personal_access_tokens`, `password_reset_otps`, `cache` | `sanctum:prune-expired`, `otp:prune`, hapus cache kedaluwarsa |
| `db:analyze` | Minggu 04:30 | tabel transaksi utama | |
| Email OTP | request lupa password | `password_reset_otps` | sinkron setelah commit, timeout 10 dtk, gagal → 503 |
| Hapus file bukti bayar | setelah commit hapus client/cabang/invoice belum lunas | storage privat | sinkron, gagal hanya dilog |

---

## 16. M14 Google Calendar (fase terakhir)

Dikerjakan paling akhir (kemungkinan setelah go-live). Sinkron satu arah sesi → Google Calendar per user, dipanggil **sinkron setelah commit**; kegagalan dilog, sesi tetap tersimpan.

| # | Endpoint | Fungsi | Tabel |
|---|---|---|---|
| 14.1 | `GET /integrations/google/redirect` · `GET /integrations/google/callback` | OAuth | `google_calendar_integrations` C,U (token terenkripsi) |
| 14.2 | `PATCH /integrations/google` | aktif/nonaktif sinkron | `google_calendar_integrations` U |
| 14.3 | hook di Create/Reschedule/Cancel/Delete sesi | kirim/ubah/hapus event | `schedules.google_event_id` U |

---

## 17. Lampiran

### 17.1 Matriks endpoint × tabel (ringkas)
| Tabel | Ditulis oleh endpoint |
|---|---|
| `users` | 1.1 1.5 1.7 2.2–2.5 2.18 |
| `roles`, `role_permissions` | 2.8–2.12 |
| `branches` | 2.14–2.18 |
| `services`, `sensory_quadrants`, `cancel_reasons`, `discharge_reasons`, `master_packages`, `holidays` | 3.1–3.6 |
| `clients` | 4.4 4.6 4.7 4.10 4.12 5.7 5.10 6.7 6.12 6.17 7.2 7.7 7.8 7.10 7.13 7.15 7.19 |
| `client_code_counters` | 4.4 |
| `client_services` | 4.7 |
| `client_documents` | 4.8 4.9 |
| `client_status_histories` | 4.4 4.7 4.10 5.7 5.10 6.7 6.12 6.17 |
| `assessment_categories/sections/questions` | 5.2–5.5 |
| `assessment_access_codes` | 5.7 5.8 5.10 |
| `assessment_responses/answers/quadrant_scores` | 5.10 |
| `schedules` | 6.7–6.9 6.11–6.18 7.7 7.8 7.13 7.15 |
| `schedule_series` | 6.8 |
| `session_reports` | 6.10 6.12 |
| `invoices` | 7.2 7.5 7.7 7.8 7.10 7.13 |
| `invoice_counters` | 7.2 7.13 |
| `payment_proofs` | 7.5 7.7 |
| `invoice_logs` | 7.2 7.5 7.7 7.8 7.13 7.15 |
| `client_packages` | 6.12 6.13 6.17 7.7 7.8 7.13 7.15 7.19 |
| `credit_ledger` | 6.12 6.13 6.17 7.7 7.8 7.13 7.15 7.19 |
| `package_conversions` | 7.15 |
| `google_calendar_integrations` | 14.1 14.2 |

### 17.2 Action class (daftar)
`StaffLoginAction`, `ClientLoginAction`, `ChangePasswordAction`, `RequestPasswordOtpAction`, `ResetPasswordWithOtpAction`, `CreateUserAction`, `DeleteBranchAction`, `CreateClientAction`, `SyncClientServicesAction`, `TransitionClientAction`, `DeleteClientAction`, `IssueAssessmentCodeAction`, `OpenAssessmentAction`, `SubmitAssessmentAction`, `CreateScheduleAction`, `CreateRecurringSchedulesAction`, `CompleteSessionAction`, `CancelSessionAction`, `RescheduleSessionAction`, `RevertSessionAction`, `Bulk{Complete,Cancel,Reschedule,Revert}Action`, `SaveSessionReportAction`, `IssueInvoiceAction`, `UploadPaymentProofAction`, `VerifyPaymentAction`, `VoidInvoiceAction`, `DeleteInvoiceAction`, `DirectRenewalAction`, `ConvertPackageAction`, `AdjustCreditAction`. Aturan kredit/status mengikuti `frontend/src/domain/credit.js`, `schedule.js`, `client.js` (acuan test; fungsi frontend dipertahankan sebagai spesifikasi).

### 17.3 Katalog kode error domain
`version_conflict`, `schedule_conflict`, `holiday`, `already_reverted`, `already_submitted`, `expired`, `invoice_unpaid`, `invoice_not_deletable`, `invoice_not_voidable`, `in_use`, `quota_credit_insufficient`, `proof_limit_reached`, `replacement_invalid`, `convert_not_allowed`, `confirm_code_mismatch`.

### 17.4 Checklist test per modul (ringkas)
| Modul | Wajib diuji |
|---|---|
| M1 | login generik, throttle/lockout, `must_change_password` memblokir endpoint lain, OTP (5 percobaan, kedaluwarsa, SMTP gagal → 503) |
| M2 | cabang wajib non-master, `can_delete`, hapus role dipakai → 409, hapus cabang cascade (tidak ada baris yatim), master tak tersentuh |
| M3 | master dipakai → 409, pilihan string terhapus bebas, UNIQUE libur |
| M4 | kode client berurutan per grup, transisi otomatis hanya maju & manual bebas, hapus client cascade |
| M5 | sekali isi, expiry, gating invoice assessment, skor kuadran server, consent wajib |
| M6 | bentrok + `force`, libur dilewati, cancel `deduct_credit` wajib, revert 1x, bulk complete/cancel/revert sebagian dilewati, bulk reschedule atomik (satu gagal = tidak ada yang tersimpan) |
| M7 | saldo = Σ ledger, approve tidak dobel, void keep/revoke, pengganti tanpa kredit dobel, hapus invoice lunas ditolak, konversi tanpa kekurangan, relink jadwal |
| M8–M11 | scope cabang/terapis/ortu, view dengan filter cabang+tanggal, `EXPLAIN` Q1–Q23 pada ±50 ribu sesi |
| M12 | uji integritas FK: tidak ada baris yatim setelah hapus client/cabang; master terpakai ditolak |

### 17.5 Urutan implementasi yang disarankan
M0 fondasi → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9/M10 → M11 → M12 (diuji sepanjang jalan) → M13. Pemetaan ke sprint ada di `sprint_plan.md`.
