# Sprint 1 — Fondasi, auth, master, inquiry, asesmen

**Tanggal:** Senin 12 Okt – Jumat 23 Okt 2026 (10 hari kerja = TIMELINE_DEV D1 + D2) · **Progres akhir sprint:** 25% (10/40 hari)
**UAT klien:** Sabtu 24 Okt (#1): login asli, RBAC, master data, cabang. Sabtu 31 Okt (#2): inquiry, client, kuesioner ortu.
**Modul:** M0 fondasi · M1 Auth · M2 User/RBAC/Cabang · M3 Master & libur · M4 Inquiry & Client · M5 Asesmen · M12 (hapus client)
**Rujukan:** `schema.md` (sumber kebenaran), `implementation_detail.md` §1, §3–§7, `docs/guide/04`, `docs/guide/10`, `TIMELINE_DEV.md` D1–D2.

> Nomor endpoint (1.1, 4.4, 5.9b, …) mengikuti `implementation_detail.md`. Bila isi `implementation_detail.md` berbeda dari `schema.md`/`docs/guide/10`, **yang berlaku `schema.md`** (lihat daftar selisih di `sprint_plan.md` §5).

---

## 1. Tujuan & Selesai bila

**Tujuan:** API berjalan di env UAT; semua role bisa login lewat UI asli; alur *intake → pilih layanan → terbit kode kuesioner → ortu isi → status client* berjalan end-to-end.

**Selesai bila (DoD sprint):**
- [ ] Login 7 role + role kustom + login ortu berjalan di env UAT (HTTPS), `must_change_password` dan OTP lupa password teruji.
- [ ] Master data, Master Cabang, hari libur tersimpan di MySQL; hapus master terpakai → 409 `in_use`.
- [ ] Skenario "intake → layanan → kode → ortu isi (autosave draft) → submit → skor kuadran" lolos.
- [ ] `created_by/updated_by` terisi di semua tulis; `status_changed_at` client terisi.
- [ ] Hapus client (master) menghapus semua turunan (tanpa baris yatim) + file bukti bayar.
- [ ] Test backend M1–M5 hijau; frontend `npm run lint` 0 error, `npm test`, `npm run build` lolos.
- [ ] Postman collection M1–M5 + catatan rilis ke klien (Jumat 14.00, build dibekukan).

## 2. Status awal (13 Okt) & urutan kerja

Sudah ada (kerangka): 37 migration + 6 view, 37 model (`TracksActors`, `BranchScoped`), service per aggregate (melempar 501), `PermissionService`/`ClientCodeService`/`InvoiceNumberService` (jalan), middleware `module:<kode>`, 113 route di `routes/api.php`.
**Belum:** seeder, Action per use-case, FormRequest, API Resource, policy, test, semua FE API.

| Hari | Tgl | Pekerjaan | Est. |
|---|---|---|---|
| 1 | Sen 12 | Setup deploy: CI (lint+test), auto-deploy env UAT + HTTPS, `.env` (`CACHE/SESSION=database`, `QUEUE=sync`). Verifikasi migration di MySQL 8 Docker (`migrate:fresh` + rollback) | 1,0 |
| 2 | Sel 13 | **Seeder wajib**: cabang, role, `access_modules`, `role_permissions` (dari `frontend/src/domain/rbac.js`), layanan, kuadran, alasan Cancel/Off (+KODE, flag `is_therapist_off`), alasan discharge, paket (`leave_quota`, `invoice_code`, `is_satuan`, `is_assessment`), akun master. Seeder demo (konversi seed FE) | 1,0 |
| 3–4 | Rab–Kam | **Inti**: trait pelaku, `BranchScope`, `PermissionService` + policy, optimistic lock, format error + kode domain, Resource, pagination page/keyset, pencarian prefix | 1,25 |
| 4–5 | Kam–Jum | **M1 Auth** lengkap | 0,75 |
| 5 | Jum 16 | **M2/M3** user, role+matriks, CRUD layanan/kuadran/alasan/paket. Deploy UAT, Postman M1–M3 | 1,0 |
| 6 | Sen 19 | Master Cabang + pratinjau dampak hapus; hari libur berentang; pengaman `in_use` | 0,5 |
| 6–7 | Sen–Sel | **FE**: `tokenStore`, login ortu + tgl lahir, `authStore`/`masterDataStore`/`therapistsStore` → API | 0,75 |
| 7–8 | Sel–Rab | **M4** client: CRUD, kode `AE-00001`, layanan, GDrive, duplikat, hapus cascade | 1,0 |
| 8 | Rab 21 | **Status** client: transisi otomatis maju, manual bebas, discontinue, reaktivasi | 0,5 |
| 9 | Kam 22 | **M5 mesin asesmen**: kategori/section/soal (12 tipe) | 0,75 |
| 10 | Jum 23 | **Kode + kuesioner publik + draft + submit**; awaiting list; mulai FE client (`clientsStore`, `useClientOutcomeActions`) | 1,0 + 0,5 |
| — | Jum 14.00 | Build dibekukan UAT #1, catatan rilis | — |

> FE inquiry/asesmen sisa (`assessmentsStore`, `AssessmentFill`, `useQuestionnaireCodeActions`, `useClientDeleteActions`, list `page/per_page`) dikerjakan **Sprint 2 hari 1** (sesuai D3 Senin), supaya UAT #2 (31 Okt) sudah memakai UI baru.

### Dependensi lintas sprint (sudah diperhitungkan)
| Yang dibutuhkan S1 | Berasal dari | Cara S1 mengatasinya |
|---|---|---|
| Kuesioner publik mengecek invoice assessment (gating bukti) | Finance (S2) | Tabel `invoices` sudah ada dari migration: cek berupa query; tanpa invoice = lolos. Kode `invoice_required=1` baru menerbitkan invoice setelah `IssueInvoiceAction` (S2 hari 7–8); sampai itu, uji dengan `invoice_required=0` |
| Discharge menghapus jadwal aktif + ledger `discharge` | Penjadwalan/kredit (S2) | S1 membuat `TransitionClientAction` dengan titik sambung `DischargeSideEffects` (no-op bila belum ada jadwal/paket); diisi S2 hari 3–4 |
| Libur membatalkan sesi bertanggal itu | Penjadwalan (S2) | S1: CRUD libur + hitung `affected_sessions`; efek cancel sesi ditambah S2 hari 2 |
| Hapus client/cabang menghapus file bukti | Finance (S2) | Hapus client S1 bergantung FK cascade; daftar path file kosong sampai ada `payment_proofs` |

---

## 3. M0 Fondasi (core logic, bukan endpoint)

| Komponen | Aturan |
|---|---|
| Auth guard | Sanctum bearer. Ability token `staff` (User) dan `client` (Client). Rute publik hanya `/auth/*` login/OTP dan `/public/*` |
| `BranchScope` | Non-master hanya `branch_id` miliknya; master boleh `?branch_id=` (kosong/`all` = semua). Data cabang lain → 404 (tidak membocorkan). `branch_id NULL` pada master data/libur/user = semua cabang |
| `PermissionService` | Baca `role_permissions` (memo per request). Aturan: punya akses modul = semua aksi non-hapus; **hapus client & cabang hanya role `master`** (tanpa kolom `can_delete`). Middleware `module:<kode>` sudah ada |
| Pelaku | Trait `TracksActors` mengisi `created_by/updated_by` dari user terautentikasi. FE tidak mengirim pelaku. **Tidak ada audit log** (ADR 0004) |
| Optimistic lock | Request kirim `version`; tidak cocok → 409 `{code:"version_conflict"}`. Berlaku: `clients`, `schedules`, `invoices`, `client_packages`, `session_reports`, `assessment_categories` |
| Format error | 401 / 403 `forbidden` / 404 / 409 (`version_conflict`, `in_use`, `already_submitted`, `draft_exists`) / 410 `expired` / 422 `{message, errors}` / 429 / 503. Cocok dengan `ApiError` FE (`message`, `fieldErrors`, `isConflict`) |
| Pagination | `?page=&per_page=` (default 10, maks 50) → `{data, meta:{total,page,per_page,last_page}}`; riwayat bertambah memakai keyset `cursor`. Filter/search di server **sebelum** paginasi |
| Pencarian client | `q` = prefix nama anak / nama ortu / kode client (case-insensitive); dipakai konsisten semua list (Q5) |
| Transaksi | Tulis lintas tabel = `DB::transaction()` + `lockForUpdate()` baris induk; urutan lock: `invoices` → `client_packages` → `clients` (cegah deadlock) |
| Resource | Backend balas snake_case; `httpClient` FE mengubah ke camelCase |

---

## 4. M1 Auth & akun (Hari 4–5)

### API
| # | Endpoint | Action | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 1.1 | `POST /auth/login` | `StaffLoginAction` | publik, throttle email+IP | `email`, `password` | `users` R/U(`last_login_at`); `personal_access_tokens` C; `roles`,`role_permissions`,`branches` R | token + user (role, `branch_id`, `permissions` = **daftar kode modul** yang diizinkan, `must_change_password`). 422 pesan **generik** untuk email tidak ada / password salah; 422 `account_inactive` untuk akun nonaktif (hanya bila password benar), 429 |
| 1.2 | `POST /auth/client-login` | `ClientLoginAction` | publik, throttle + lockout per IP & per kode | `client_code`, `date_of_birth` | `clients` R/U(`last_login_at`); token C | token portal ortu + ringkasan client. Gagal selalu generik |
| 1.3 | `POST /auth/logout` | hapus token aktif | login | — | `personal_access_tokens` D | 204 |
| 1.4 | `GET /auth/me` | profil sesi | login | — | `users`/`clients`, `role_permissions` R | user/client + izin |
| 1.5 ✚ | `POST /auth/change-password` | `ChangePasswordAction` | staf (satu-satunya selain me/logout bila `must_change_password=1`) | `current_password`, `password`, `password_confirmation` | `users` U(`password`,`must_change_password=0`,`password_changed_at`); token lain D | 204; 422 |
| 1.6 ✚ | `POST /auth/forgot-password` | `RequestPasswordOtpAction` | publik, throttle email & IP | `email` | `users` R; `password_reset_otps` C | respons **selalu generik**; email dikirim **sinkron setelah commit** |
| 1.7 ✚ | `POST /auth/reset-password` | `ResetPasswordWithOtpAction` | publik, throttle | `email`, `otp`, `password` | `password_reset_otps` R/U; `users` U; token D | 422 OTP salah/kedaluwarsa/terpakai |

### Core logic
1. **Login staf:** cari user aktif → `Hash::check` → bila `is_active=0` tolak dengan 422 `account_inactive` ("Akun Anda tidak aktif…"). Urutan: password dicek dulu, baru status aktif, supaya pesan ini tidak membocorkan email terdaftar kepada penebak. Buat token ability `staff`; respons memuat `permissions` berupa **daftar kode modul** (bukan kamus berkunci kode modul, konvensi key JSON) agar FE `hasPermission()` bekerja tanpa request tambahan. `must_change_password=1` → middleware memblokir semua endpoint selain 1.3/1.4/1.5 (403 `must_change_password`).
2. **Login ortu:** cocokkan `client_code` + `date_of_birth` anak. Lockout per kode (mis. 5 gagal → 15 menit) dan per IP. Pesan gagal **tidak** menyebut bagian yang salah. Token ability `client`; client tanpa token staf tidak bisa menyentuh rute staf.
3. **OTP:** simpan **hash** OTP (`otp_hash`), `expires_at` ±10 menit, `attempts` maks 5 lalu OTP hangus, `used_at` setelah dipakai. Kirim email **sinkron setelah commit** (timeout 10 dtk); SMTP gagal → hapus baris OTP + 503. Reset berhasil → hapus semua token user.
4. Reset password oleh Master (2.5 di bawah) → password sementara + `must_change_password=1` + token user dihapus.

### Integrasi FE
> **Status: selesai 13 Okt 2026** (backend M1 + frontend). Lihat `docs/guide/10-api-migration.md` bagian "Status integrasi frontend per modul". Berbeda dari rencana: halaman beranda (`Welcome`) dihapus dan "/" mengarah ke `/login`; `/roles` hanya mode demo.

| Item | File / lokasi |
|---|---|
| Token & 401 | `services/http/tokenStore.js` + `setUnauthorizedHandler` → logout + redirect `/login` |
| Store | `stores/authStore.js` → panggil `ENDPOINTS.auth.*`; `useAuth().hasPermission` membaca matriks dari respons login |
| Halaman | `features/auth/pages/Login.js` (staf), `RoleSelect.js` (mode demo tetap, dimatikan saat `VITE_DATA_SOURCE=api`), form login ortu (+ tanggal lahir), `features/auth/components/PasswordDialogs.js` (ganti password wajib, lupa password OTP) |
| Endpoint ditambah | `auth.changePassword`, `auth.forgotPassword`, `auth.resetPassword`, `users.resetPassword(id)` ke `services/api/endpoints.js` |

---

## 5. M2 User, role/RBAC, cabang (Hari 5–6)

> **Status backend: selesai 13 Okt 2026** (53 test di `tests/Feature/Organization`). Kontrak final ada di `implementation_detail.md` §4. Aturan keamanan: akun/role master hanya oleh master; master aktif terakhir tidak bisa diturunkan/dinonaktifkan; role sendiri tidak bisa diubah; `rbac` tidak bisa dicabut dari role sendiri; matriks izin bentuk array (`{ permissions: [{ module_code, allowed }] }`). Hapus cabang tetap Sprint 4.

### API
| # | Endpoint | Fungsi | Akses | Request kunci | Tabel | Catatan |
|---|---|---|---|---|---|---|
| 2.1 | `GET /users` | daftar staf (filter `branch_id,role,is_active,q`) | `user_management` | — | `users`,`roles`,`branches` R | `idx_users_branch_role` |
| 2.2 | `POST /users` | `CreateUserAction` | `user_management` | `name,email,role_id,branch_id?,password?,title,specialty,phone` | `users` C (`must_change_password=1`) | email unik; `branch_id` NULL = semua cabang (master selalu NULL; pengatur 1 cabang terkunci); `password` kosong → sementara dikembalikan sekali (`temporary_password`) |
| 2.3 | `GET/PATCH /users/{id}` | detail / ubah | `user_management` | field berubah | `users` | tidak boleh mengosongkan `branch_id` non-master |
| 2.4 | `PATCH /users/{id}/active` | (non)aktif | `user_management` | `is_active` | `users` U; token D | staf **tidak dihapus** lewat UI |
| 2.5 | `POST /users/{id}/reset-password` | reset oleh Master/pengatur | `user_management` | `password?` | `users` U; token D | 200 + `temporary_password` sekali bila otomatis; akun sendiri 422 |
| 2.6 | `GET /therapists` | dropdown ringan terapis | login staf | `branch_id` | `users` R | tanpa paginasi |
| 2.6b ✚ | `PATCH /therapists/{id}/capacity` | maks sesi/bulan terapis (`max_sessions_per_month`, CHECK 1..744) | `schedule_dashboard`/`user_management` | `max_sessions_per_month` | `users` U | tidak memblokir penjadwalan; dipakai utilisasi (S3) |
| 2.7–2.12 | `GET/POST/PATCH/DELETE /roles`, `GET /access-modules`, `PUT /roles/{id}/permissions` | role & matriks | `rbac` | `code,name,badge,description`; `[{module_code, allowed}]` | `roles`,`role_permissions` | role sistem: label/badge saja; hapus role dipakai → 409 `in_use` |
| 2.13 | `GET /branches` | daftar cabang (aktif+nonaktif) | login staf | — | `branches` | dipakai filter cabang semua halaman |
| 2.14–2.16 | `POST/PUT/PATCH(active) /branches` | tambah/ubah/aktifkan | `branch_master` | `name,code,city,address,phone` | `branches` | `code` 2–10 huruf/angka unik; nonaktif tidak muncul di pilihan baru, riwayat tetap |
| 2.17 ✚ | `GET /branches/{id}/delete-impact` | pratinjau dampak hapus | `branch_master`+hapus | — | count di `clients,schedules,invoices,users,holidays` | untuk dialog konfirmasi |
| 2.18 | `DELETE /branches/{id}` | **dikerjakan Sprint 4** | | | | |

### Core logic
- **Matriks RBAC:** `PUT /roles/{id}/permissions` = upsert batch; role `master` selalu punya semua modul. Kode modul: `revenue, branch_performance, inquiry_pipeline, inquiry_dashboard, assessment_master, inquiry_master_data, weekly_calendar, schedule_dashboard, active_clients, finance, user_management, branch_master, rbac, therapist_module, unreported_reports, holidays, therapist_utilization` (17 modul; `assessment_master`, `inquiry_master_data`, dan `branch_performance` dipisah dari `inquiry_pipeline`/`revenue` agar hak aksesnya bisa diatur sendiri).
- **Cabang:** `code` dipakai sebagai kode invoice/dsb (tidak diubah setelah dipakai); `is_active=0` hanya menyembunyikan dari pilihan baru.
- **Pengaman master dipakai:** semua DELETE master memanggil `InUseGuard` (cek FK pemakai) → 409 `in_use` dengan pesan "dipakai di N data"; FK `RESTRICT` jaring pengaman.

### Integrasi FE
| Item | File |
|---|---|
| Store | `therapistsStore`, `branchesStore`, `authStore` (user & role) → react-query |
| Halaman | `features/master/pages/UserManagement.js`, `RoleModuleAccess.js`, `BranchManagement.js` |
| Navigasi | `app/layout/navConfig.js` memfilter menu dari matriks respons login; filter cabang global (`activeBranch`) memakai `GET /branches` |

---

## 6. M3 Master data & hari libur (Hari 5–6)

### API
| # | Endpoint | Akses | Request kunci | Tabel | Catatan |
|---|---|---|---|---|---|
| 3.1 | `GET/POST/PUT/DELETE /master/services[/{code}]` | baca: login; tulis: `inquiry_pipeline`/`inquiry_dashboard` | `code,label,category,description,is_active,sort_order` | `services` | DELETE: 409 `in_use` bila ada `client_services`/`schedules.service_code` |
| 3.2 | `… /master/quadrants` | idem | `code,title,full_name,description,color,sort_order` | `sensory_quadrants` | DELETE 409 bila dipakai soal/skor; minimal 1 kuadran |
| 3.3 ✚ | `… /master/cancel-reasons` (filter `?therapist_off=0\|1`) | tulis: `weekly_calendar`/`inquiry_*` | `code,label,is_active,is_therapist_off,sort_order` | `cancel_reasons` | **Cancel dan Off = satu daftar**, beda flag `is_therapist_off`; pilihan cepat bukan FK (transaksi menyimpan string) |
| 3.4 ✚ | `… /master/discharge-reasons` | idem | idem | `discharge_reasons` | tanpa cek pemakai |
| 3.5 | `GET/POST/PUT /master/packages`, `PATCH /{id}/active` ✚, `DELETE /{id}` ✚ | `finance` | `name,invoice_code(unik,≠ASM),credits,price,leave_quota,is_satuan,is_assessment,description,is_active` | `master_packages` | harga berubah tidak memengaruhi invoice/paket lama (snapshot); DELETE 409 bila dipakai |
| 3.6 | `GET/POST/PUT/DELETE /holidays` | `holidays` | `holiday_date` (atau rentang `start_date..end_date` → **1 baris per tanggal**), `name`, `branch_id` (null=semua) | `holidays` | UNIQUE (tanggal, cabang) → 422. Efek ke sesi (cancel `cancel_reason='H'`) dipasang **Sprint 2 hari 2** |

### Core logic
- **Libur berentang:** input `start..end` dipecah menjadi N baris `holidays` dalam satu transaksi; duplikat tanggal+cabang → 422 pesan spesifik.
- Respons POST/PATCH libur memuat `affected_sessions` (hitung sesi `scheduled/reschedule_pending` di tanggal itu) walau efek cancel baru aktif di S2.
- Master data di-cache react-query (jarang berubah, dibaca by PK).

### Integrasi FE
`stores/masterDataStore.js` (+ `useMasterData()`), `holidaysStore.js` (halaman `features/schedule/pages/Holidays.js`), `features/inquiry/pages/InquiryMasterData.js`, tab Master Paket di `features/finance/components/PackagesTab.js`. Endpoint baru di `endpoints.js`: `master.cancelReasons`, `master.dischargeReasons`, `holidays`.

---

## 7. M4 Inquiry & Client (Hari 7–8)

### API
| # | Endpoint | Action | Akses | Request kunci | Tabel | Catatan |
|---|---|---|---|---|---|---|
| 4.1 | `GET /clients` | list (pipeline, roster, picker jadwal, search finance) | `inquiry_*`,`active_clients`,`weekly_calendar`,`finance`,`therapist_module` (terapis: hanya client yang pernah dijadwalkan padanya) | `branch_id,status[],q,service_code,credit_status(healthy/low/zero),page,per_page,sort` | `clients`,`client_services` R | `idx_clients_pipeline`, `idx_clients_roster`; item memuat kode, nama, ortu, cabang, status, `credit_balance`, layanan |
| 4.2 ✚ | `GET /clients/pipeline-summary` | jumlah per status per cabang | `inquiry_pipeline` | `branch_id` | `clients` group by | kanban memuat kolom bertahap via 4.1 |
| 4.3 ✚ | `GET /clients/check-duplicate` | peringatan nama+tgl lahir sama (bukan blokir) | `inquiry_pipeline` | `child_name,date_of_birth` | `clients` R | `{duplicates:[…]}` |
| 4.4 | `POST /clients` | `CreateClientAction` | `inquiry_pipeline` | `branch_id,child_name,gender,date_of_birth,parent_name,parent_phone,parent_email?,address?,intake_note?` | `clients` C(`status=inquiry`); `client_code_counters` U | kode `AE-00001` dibuat server |
| 4.5 | `GET /clients/{id}` | detail (satu payload Client Detail) | seperti 4.1 | — | `clients`,`client_services`,`client_documents`,`assessment_access_codes`,`invoices`,`client_packages` R | |
| 4.6 | `PATCH /clients/{id}` | ubah biodata | `inquiry_pipeline` | `version` + field | `clients` U | kode client **tidak dapat diubah**; 409 `version_conflict` |
| 4.7 | `PUT /clients/{id}/services` | `SyncClientServicesAction` | `inquiry_pipeline` | `service_codes[]` (hanya `is_active=1`) | `client_services` C/D (selisih); `clients` U | daftar tak kosong & status masih sebelumnya → `service_selected`; melepas semua layanan tidak memundurkan |
| 4.8 / 4.9 | `POST /clients/{id}/gdrive-links`, `DELETE …/{docId}` | link Google Drive | `inquiry_pipeline` (+hapus) | `url,label?` | `client_documents` | dokumen = link saja |
| 4.10 | `POST /clients/{id}/transition` | `TransitionClientAction` | `inquiry_pipeline`/`active_clients` | `to_status`, `reason?`, `note?`, `version` | `clients` U | lihat core logic |
| 4.12 | `DELETE /clients/{id}` | `DeleteClientAction` | **hanya `master`** | — | cascade seluruh turunan | 204 |
| 4.14–4.15 | `GET /clients?status=discontinued`, `GET /assessment-codes?awaiting=1` | log drop-off, tab Menunggu Kuesioner | `inquiry_dashboard` | `branch_id,q` | `clients`, `assessment_access_codes` (`idx_codes_awaiting`) | kode kedaluwarsa tetap tampil (ditandai) — Q18 |

### Core logic
1. **Kode client (`CreateClientAction`):** grup = huruf pertama nama anak; `client_code_counters` di-update dengan `LAST_INSERT_ID(last_number+1)` (atomik, tanpa race) → `AE-00001`. Kode **tidak berubah** walau nama diedit dan **tidak dipakai ulang** setelah client dihapus.
2. **Transisi status (`ClientStatusService`):**
   - Urutan pipeline: `inquiry → service_selected → assessment_scheduled → assessment_done → admitted | done_consult | done_assessment | discontinued`; `admitted → discharged`.
   - **Otomatis hanya maju** (padanan `advanceStatus` di `frontend/src/domain/client.js`). Pemicu: sync layanan, terbit kode, jadwal asesmen dibuat (S2), sesi asesmen completed (S2). **Submit kuesioner tidak mengubah status.**
   - **Manual** (`buildStatusChangePatch`): boleh ke tahap mana pun, termasuk mundur/koreksi outcome dan reaktivasi `discharged|discontinued → admitted`.
   - Efek kolom: `status`, `status_changed_at`, `final_outcome`, `date_of_join` (admit pertama), `date_of_discharge`, `date_of_discontinue`, `discharge_reason`/`discharge_note` (wajib alasan untuk discharge/discontinue), `updated_by`. **Tanpa tabel riwayat tahap.** Admit **tidak** membuat paket (saldo 0 = Frozen sampai Finance mengaktifkan paket).
   - **Discharge**: hapus permanen semua `schedules` aktif (`scheduled/rescheduled/reschedule_pending`, termasuk seri) + ledger `discharge` (−sisa per paket aktif, paket `depleted`) dalam satu transaksi → disambung S2 hari 3–4.
3. **Cek duplikat:** hanya peringatan; FE tetap boleh simpan.
4. **Hapus client (`DeleteClientAction`):** `lockForUpdate` client; kumpulkan path file bukti bayar → `DELETE clients` (FK cascade ke services, documents, kode/respons/draft kuesioner, seri, `client_leaves`, jadwal+laporan, invoice+bukti+log, paket, konversi, ledger) → setelah commit hapus file sinkron (gagal hanya dilog) → tulis 1 baris log aplikasi (pelaku, entitas, jumlah baris).

### Integrasi FE
| Item | File |
|---|---|
| Store | `stores/clientsStore.js` → API (list dengan `page/per_page` + `q`; `usePagination` client-side diganti state yang masuk query key) |
| Hook | `features/inquiry/hooks/useClientOutcomeActions.js` → `POST clients.transition`; `useClientDeleteActions.js` → `DELETE clients` (S2 hari 1) |
| Halaman | `InquiryPipeline.js`, `ClientDetailInquiry.js`, `DashboardInquiry.js` (tab Discontinued & Menunggu Kuesioner) |
| Endpoint ditambah | `clients.pipelineSummary`, `clients.checkDuplicate`, `assessmentCodes.awaiting`. Hapus `clients.pipelineLogs` & `clients.discharge` dari `endpoints.js` (riwayat tahap dibuang 13 Okt; discharge lewat `transition`) |

---

## 8. M5 Asesmen & kuesioner (Hari 9–10)

### API — mesin kuesioner
| # | Endpoint | Akses | Request kunci | Tabel | Catatan |
|---|---|---|---|---|---|
| 5.1 | `GET /assessment-categories?with=sections.questions` | `inquiry_*` | — | `assessment_categories/sections/questions` R (`idx_questions_form`) | satu query form |
| 5.2 | `POST /assessment-categories`, `PATCH /{id}` | `inquiry_*` | `name,type_code(unik),domain,is_active,version` | `assessment_categories` | `type_code` tidak diubah setelah ada kode terbit |
| 5.3 | `DELETE /assessment-categories/{id}` | `inquiry_*`+hapus | — | cascade sections/questions | 409 `in_use` bila ada kode/respons; minimal 1 kategori |
| 5.4 ✚ | `POST /assessment-categories/{id}/sections`, `PATCH/DELETE /assessment-sections/{id}` | `inquiry_*` | `title,lead_text,sort_order` | `assessment_sections` | DELETE cascade soal bila belum dijawab |
| 5.5 ✚ | `POST /assessment-sections/{id}/questions`, `PATCH/DELETE /assessment-questions/{id}`, `PUT …/questions/order` | `inquiry_*` | `question_type` (12 tipe, termasuk `birth_date`), `question,options,range_*,quadrant_code,is_required,sort_order` | `assessment_questions` | DELETE 409 bila sudah ada `assessment_answers` |

### API — kode, publik, hasil
| # | Endpoint | Action | Akses | Request kunci | Tabel | Respons & error |
|---|---|---|---|---|---|---|
| 5.6 | `GET /clients/{id}/assessment-codes` | kode client | lihat client | — | `assessment_access_codes` R | |
| 5.7 | `POST /clients/{id}/assessment-codes` | `IssueAssessmentCodeAction` | `inquiry_pipeline` | `category_id`, `expires_at?`, `invoice_required` (default 1) | `assessment_access_codes` C; `clients` U (maju ke `assessment_scheduled`); bila `invoice_required` + `invoices` C (S2) | satu client boleh banyak kode |
| 5.8 ✚ | `DELETE /assessment-codes/{id}` | hapus kode | `inquiry_pipeline`+hapus | — | kode D; invoice assessment pemicu yang **belum lunas** D (yang `paid` dibiarkan, FK SET NULL) | 409 bila `submitted`; **409 `draft_exists`** bila sudah punya draft |
| 5.9 | `GET /public/assessments/{code}` | `OpenAssessmentAction` | publik, throttle IP | — | kode, client, kategori/section/soal, `invoices`, `assessment_drafts` R | 404 generik; 409 `already_submitted`; 410 `expired`; **403 `proof_required`** (+id & no. invoice); respons memuat **draft** bila ada |
| 5.9b ✚ | `PUT /public/assessments/{code}/draft` | `SaveAssessmentDraftAction` | publik, throttle IP + kode | `answers` (patch **array** `[{question_id, t, v?}]`, `v: null` = hapus; bukan kamus berkunci id soal), `last_section_id`, `consent?`, `version` | `assessment_drafts` C/U | 409 `version_conflict`; 422 payload > 256 KB |
| 5.10 | `POST /public/assessments/{code}/responses` | `SubmitAssessmentAction` | publik, throttle | `answers[]` (yang belum di draft), `consent` | `assessment_responses` C; `assessment_answers` C; `assessment_quadrant_scores` C; kode U(`submitted`); `assessment_drafts` D | 409 sudah diisi; 422 `incomplete` (+daftar soal wajib kosong) |
| 5.11 | `GET /clients/{id}/assessment-responses`, `GET /assessment-responses/{id}` | hasil | `inquiry_*`,`therapist_module` | — | responses/answers/scores R | **ortu tidak melihat hasil** |
| 7.x ✚ | `POST /invoices/{id}/proof` (varian publik) | upload bukti dari `/assessment` | publik dikunci kode kuesioner | `file` (JPG/PNG/PDF ≤5 MB) + `code` | `payment_proofs`, `invoices.proof_upload_count` | **Diselesaikan di Sprint 2** (modul Finance); S1 hanya membaca status gating |

### Core logic
1. **Kode:** `{type_code}-{6 acak}`; retry bila bentrok UNIQUE. `expires_at` opsional (tanpa job: kedaluwarsa dicek saat dibuka). Terbit kode → `advanceStatus` ke `assessment_scheduled`.
2. **Urutan cek `OpenAssessmentAction` (dipakai ulang draft & submit):**
   1. lookup kode (tidak ada → 404 generik, throttle IP);
   2. `status=submitted` → 409 (**sekali isi**);
   3. `expires_at < now` → 410, **kecuali** kode sudah punya draft dengan `started_at <= expires_at`;
   4. ada invoice assessment (milik kode / manual tanpa kode) belum `paid`/`void` **dan `proof_upload_count = 0`** → 403 `proof_required`. Invoice tetap menunggu Finance menandai lunas; yang diwajibkan hanya **bukti terunggah**;
   5. respons: form + draft (`answers`, `last_section_id`, `answered_count`, `consent_at`, `version`).
3. **Autosave draft:** satu baris per kode, `lockForUpdate`; cek `version` (dua perangkat → 409); gabungkan patch (null = hapus; id soal di luar kategori dibuang); `answered_count` dihitung server; `version+1`. Tidak menghitung skor, tidak mengubah status.
4. **Submit:** validasi semua soal `is_required` terjawab + `consent_at` terisi (draft atau request) → satu transaksi: insert `assessment_responses` (UNIQUE `access_code_id`, `consent_at`, `ip_address`), `assessment_answers` (snapshot `item_no`,`quadrant_code`,`score`), `assessment_quadrant_scores` (Σ skor per kuadran, **dihitung server**, tanpa klasifikasi), kode → `submitted` + `submitted_at`, **DELETE draft**. Status client **tidak** berubah.
5. **Hapus kode:** hanya `issued` tanpa draft; bila ada invoice assessment belum lunas ikut dihapus (hapus invoice belum lunas membuka gating).

### Integrasi FE
| Item | File |
|---|---|
| Store | `assessmentsStore.js`, `assessmentDraftsStore.js` → API |
| Hook | `useQuestionnaireCodeActions.js` (terbit/hapus kode), `features/assessment/hooks/useAssessmentFillActions.js`, `useDraftAutosave.js` (debounce `PUT draft`, tangani 409 → muat ulang draft) |
| Halaman | `AssessmentFill.js` (publik, 375px), `AssessmentMasterData.js` (mesin), `ParentAssessmentView.js` (hasil staf), `AssessmentProofCard.js` (gating bukti) |
| Catatan | Halaman publik `/assessment` memakai `api.*` tanpa token; pesan 403 `proof_required` menampilkan kartu upload bukti |

---

## 9. Test wajib Sprint 1

| Modul | Skenario |
|---|---|
| M1 | login generik; throttle & lockout ortu; `must_change_password` memblokir endpoint lain; OTP (5 percobaan, kedaluwarsa, SMTP gagal → 503, token dihapus setelah reset) |
| M2 | hapus client/cabang hanya master (role lain 403); hapus role dipakai → 409; user non-master tidak bisa tanpa cabang; master tak tersentuh |
| M3 | master dipakai → 409; alasan cancel/discharge terhapus bebas; UNIQUE libur (tanggal+cabang); libur berentang → N baris |
| M4 | kode client berurutan per grup & tidak dipakai ulang; transisi otomatis hanya maju, manual bebas; discontinue/discharge wajib alasan; hapus client cascade tanpa baris yatim; `BranchScope` (cabang lain → 404) |
| M5 | sekali isi; expiry (kode ber-draft boleh diselesaikan); gating `proof_required`; skor kuadran server; consent wajib; draft: simpan/lanjut, konflik `version`, terhapus saat submit; hapus kode ber-draft → 409; soal wajib kosong → 422 `incomplete` |

## 10. Risiko khusus sprint ini

| Risiko | Mitigasi |
|---|---|
| Migration berubah setelah jawaban klien terlambat (R1) | Pakai default `pertanyaan_klien.md`, kunci Rabu 14 Okt; perubahan setelahnya = change request |
| Seeder RBAC tidak sama dengan `domain/rbac.js` → menu hilang/berlebih | Test: matriks seeder == `domain/rbac.js` per role |
| Email OTP gagal di env UAT (SMTP belum siap) | Siapkan SMTP/Mailtrap di hari 1; fallback: Master reset manual (2.5) |
| FE bergeser ke API sebagian (sebagian store masih localStorage) | Flag `VITE_DATA_SOURCE` per modul; jangan campur store domain yang sama |
