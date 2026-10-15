# 10 — Integrasi Laravel API

Target backend: **Laravel 12 + MySQL 8 + Sanctum**, tanpa Redis dan tanpa queue (cache & session memakai driver `database`; semua proses sinkron; cron terjadwal dijelaskan di `schema.md` §11). Desain database lengkap (tabel, indeks, jejak perubahan, alur transaksi): **`schema.md`**. Dokumen ini memetakan frontend → API.

## Yang sudah siap di frontend
| Bagian | File | Fungsi |
|---|---|---|
| Konfigurasi | `src/config/env.js`, `frontend/.env.example` | `VITE_DATA_SOURCE` (`local`/`api`), `VITE_API_BASE_URL`, `VITE_API_TIMEOUT_MS`, `isApiMode()` |
| HTTP client | `src/services/http/httpClient.js` | axios instance; bearer token; body/params camelCase→snake_case; respons snake_case→camelCase; helper `api.get/post/put/patch/delete/upload/list` (unwrap `data`, paginator `{ items, meta }`) |
| Error | `src/services/http/apiError.js` | `ApiError` dengan `status`, `message` (bahasa Indonesia), `fieldErrors` (422), getter `isValidation/isUnauthorized/isForbidden/isConflict` |
| Token | `src/services/http/tokenStore.js` | simpan/hapus token Sanctum; 401 → `setUnauthorizedHandler` |
| Endpoint | `src/services/api/endpoints.js` | `ENDPOINTS.*` — satu sumber URL |
| Aturan bisnis | `src/domain/*.js` | acuan identik untuk Action/Service Laravel (ber-test) |
| Use-case | `features/*/hooks/use*Actions.js` | tiap fungsi = satu endpoint transaksional |
| React Query | `app/providers/AppProviders.js` | `QueryClient` sudah terpasang |

## Format key JSON (satu aturan, tanpa pengecualian)
snake_case di kabel, camelCase di frontend; konversi otomatis hanya di `services/http/httpClient.js` (tidak ada opsi pengecualian). Konsekuensinya, kontrak API **tidak boleh memakai data sebagai key objek** (kode modul, id, kode alasan): kamus diganti array. Contoh: `permissions: ["finance"]`; matriks RBAC `[{ module_code, allowed }]`; draft jawaban kuesioner `[{ question_id, ... }]`. Pemetaan payload API → state hidup di `services/api/mappers/` (domain tidak mengenal bentuk payload API). `api.get/list` menerima `{ signal }` untuk pembatalan request (react-query).

## Prinsip
1. Halaman tidak berubah saat pindah ke API: **interface store & hook use-case tetap**, implementasi di dalamnya yang diganti (skill `react-architecture` §3).
2. Aksi lintas tabel = **satu endpoint transaksional** (complete, cancel, verify, transition). Frontend tidak merangkai beberapa request.
3. Kirim `version` untuk entity ber-optimistic-lock (`clients`, `schedules`, `invoices`, `client_packages`, `session_reports`) → 409 ditangani `ApiError.isConflict`.
4. Data turunan (saldo, frozen, skor kuadran, KPI) dihitung/diambil dari backend; jangan disimpan di frontend.
5. **Tidak ada audit log** (ADR 0004). Semua modul memakai `created_by`/`updated_by`; log khusus hanya `credit_ledger`, `invoice_logs`, `package_conversions`.

## Mapping use-case → endpoint
Kolom Jejak: log khusus selain kolom pelaku `created_by`/`updated_by` (tidak ada tabel audit log, ADR 0004): `credit_ledger`, `invoice_logs`, `package_conversions`; `—` = cukup kolom pelaku. Endpoint bertanda *(baru)* belum ada di `endpoints.js`.

| Frontend (store / hook) | Endpoint (`ENDPOINTS`) | Tabel utama | Jejak |
|---|---|---|---|
| `login` staf | `POST auth.staffLogin` | `users`, `personal_access_tokens` | — |
| ganti password (wajib di login pertama) *(baru)* | `POST auth.changePassword` | `users` | — |
| lupa password: minta OTP / reset *(baru)* | `POST auth.forgotPassword` / `auth.resetPassword` | `password_reset_otps`, `users` | — |
| reset password oleh Master *(baru)* | `POST users.resetPassword(id)` | `users` | — |
| `login` ortu (kode client + tanggal lahir anak) | `POST auth.clientLogin` | `clients.client_code` | — |
| `addClient` | `POST clients.list` | `clients`, `client_code_counters` | — |
| `updateClient` (biodata) | `PATCH clients.detail(id)` | `clients` | — |
| toggle layanan | `PUT clients.services(id)` | `client_services` | — |
| `useClientOutcomeActions.*` (admit, outcome, discharge, discontinue, reaktivasi, ubah status manual) | `POST clients.transition(id)` | `clients`; untuk `discharge` juga `schedules` (hapus jadwal aktif) + `credit_ledger` (`discharge`) + `client_packages` | — |
| simpan link GDrive | `POST clients.gdriveLinks(id)` | `client_documents` | — |
| generate kode kuesioner (+ masa berlaku opsional) | `POST clients.assessmentCodes(id)` | `assessment_access_codes` | — |
| buka kuesioner (publik; cek sekali isi, expiry — kode ber-draft boleh diselesaikan, bukti invoice assessment) *(baru)*; respons membawa draft | `GET publicAssessment.byCode(code)` | `assessment_access_codes`, `invoices`, `assessment_drafts` | — |
| simpan otomatis kuesioner (patch jawaban `{questionId: nilai\|null}`, `last_section_id`, `consent`, `version`; 409 `version_conflict`) *(baru, R31)* | `PUT publicAssessment.draft(code)` | `assessment_drafts` | — |
| submit kuesioner (publik, consent wajib; 422 `incomplete`; draft dihapus di transaksi yang sama) | `POST publicAssessment.submit(code)` | `assessment_responses/answers/quadrant_scores`, `assessment_drafts` (D) | — |
| CRUD kategori/section/soal | `assessmentCategories.*` | `assessment_categories/sections/questions` | — |
| `cancelSession` (Cancel / Off = SATU aksi; alasan dari satu daftar `cancel_reasons`; `deduct_credit` wajib; potong = credit leave paket dulu, habis baru kredit sesi) | `POST schedules.cancel` | `schedules`, `credit_ledger` (`cancel_leave`/`cancel_penalty`/`cancel_excused`), `client_packages` (`leave_used`, `cancel_count`), `clients.leave_credit_balance` | `credit_ledger` |
| `cancelForLeave` (pembatalan karena cuti Finance: `leave_id`, ledger `off_*`, tanpa cancel_count; hanya dipanggil di transaksi `createLeave`) | (bagian dari `POST leaves.list`) | `schedules`, `credit_ledger` (`off_*`) | `credit_ledger` |
| `useLeaveActions.createLeave` (catat cuti: wajib ada sesi terapi di rentang; hari = sesi pertama–terakhir `counted_start/end`; paket satuan 1x/bulan; **tanpa potong kredit sesi** (memotong saldo cuti); saldo lewat = peringatan) | `POST leaves.list` | `client_leaves`, `client_leave_sessions`, `schedules` (`leave_id`), `credit_ledger` (`off_excused`), `clients` | `credit_ledger` |
| `useLeaveActions.resetAllBalances` (reset cuti tahunan: semua client → 30 hari, sisa hangus; pratinjau `planAnnualLeaveReset`) *(baru)* | `POST leaves.annual-reset` | `clients` (`leave_granted`, `leave_reset_at`), `leave_resets` | — |
| Detail log cuti (riwayat dicatat / selesai lebih awal / void + sesi terdampak) *(baru)* | `GET leaves.detail(id)` | `client_leaves`, `client_leave_sessions`, `schedules` | — |
| `useLeaveActions.endLeaveEarly` / `voidLeave` (sesi Off cuti pada/sesudah tanggal masuk kembali → `scheduled`; slot terisi dilewati; alasan wajib bila void) | `POST leaves.end(id)` / `POST leaves.void(id)` | `client_leaves`, `schedules`, `credit_ledger` (`reversal`) | `credit_ledger` |
| `leaveQuotaSummary` (kartu jatah di detail client, pratinjau dialog) | `GET leaves.quota(clientId)` (`?year=`) | `client_leaves`, `schedules` | — |
| `replaceRoutine` (ganti jadwal rutin: hapus sesi `scheduled` pola lama + buat pola baru, 1 transaksi, cek bentrok ulang di server; memakai `series_id` bila ada) / `deleteRoutineSessions` | `POST clients.routineReplace` / `DELETE clients.routine` | `schedule_series`, `schedules` | `updated_by` |
| `addSchedule` / `addSchedules` | `POST schedules.list` / `POST schedules.bulkCreate` | `schedules`, `schedule_series` | `updated_by` |
| `useSessionActions.saveReport` | `PUT schedules.report(id)` | `session_reports` | `updated_by` |
| `useSessionActions.completeSession` | `POST schedules.complete(id)` | `schedules`, `client_packages`, `credit_ledger`, `clients` | `credit_ledger` (`used` / `cancel_*`) |
| `useSessionActions.cancelSession` (body: `reason`, `deduct_credit` wajib) | `POST schedules.cancel(id)` | `schedules`, `client_packages` (`cancel_count`), `credit_ledger` | `credit_ledger` (`used` / `cancel_*`) |
| `rescheduleSession` / `markPending` / `dropPending` | `schedules.reschedule/markPending/dropPending(id)` | `schedules` | `updated_by` |
| revert (hanya 1x) | `POST schedules.revert(id)` | `schedules`, `credit_ledger` (reversal) | `credit_ledger` (`reversal`), `schedules.reverted_at` |
| `bulkComplete` / `bulkCancel` / `bulkReschedule` | `POST schedules.bulkAction(action)` (complete / cancel / reschedule / revert). `reschedule` menerima `rows[{id,date,start_time,end_time,therapist_id}]` dan berjalan **1 transaksi atomik**: ada satu baris gagal → rollback semua, respons 422 berisi error per baris | sama + `batch_id` | `updated_by` |
| cek bentrok (preview) | `GET schedules.conflicts` | `schedules`, `holidays` | — |
| hari libur *(baru)* | `holidays.*` (CRUD) | `holidays` | — |
| monitoring sesi completed tanpa report *(baru)* | `GET schedules.unreported` | view `v_unreported_sessions` | — |
| `issueCode` (kode kuesioner + invoice assessment otomatis, satu transaksi) / `deleteCode` (hapus kode + invoice belum lunas; ditolak 409 `draft_exists` bila kode sudah punya draft) | `POST clients.assessmentCodes` / `DELETE` | `assessment_access_codes`, `invoices` (`assessment_access_code_id`), `invoice_counters`, `invoice_logs` | `invoice_logs` |
| `uploadPaymentProof({ byFinance })` Finance upload/ganti bukti manual (tanpa batas 4x, tidak untuk void) | `POST invoices.proof` (role finance) | `payment_proofs`, `invoices.proof_upload_count`, `invoice_logs` | `invoice_logs` |
| `uploadPaymentProof` dari `/assessment` (publik, dikunci kode kuesioner; wajib sebelum isi) | `POST invoices.proof` | `payment_proofs`, `invoices.proof_upload_count`, `invoice_logs` | `invoice_logs` |
| `issueInvoice` renewal cepat tab Perlu Renewal (paket sama, kredit < 3) | `POST invoices.list` | `invoices`, `invoice_counters`, `invoice_logs` | `invoice_logs` |
| `updateSchedule({ historyNote })` dari Log Kredit / detail sesi | `PATCH schedules.detail` | `schedules.history_note`, `history_note_by` | — |
| `issueInvoice` jenis `leave` (invoice cuti oleh Finance: nominal manual, `leaveId` opsional; lunas tanpa efek kredit) | `POST invoices.list` | `invoices` (`leave_id`), `invoice_counters`, `invoice_logs` | `invoice_logs` |
| `issueInvoice` (jenis `package` / `assessment`; saldo lebihan otomatis memotong invoice paket) | `POST invoices.list` | `invoices` (`gross_amount`, `balance_applied`), `invoice_counters`, `invoice_logs`, `clients.leftover_balance` | `invoice_logs` |
| `uploadPaymentProof` (LEGACY: ortu tidak lagi upload; hanya data lama) | `POST invoices.proof(id)` (multipart, `api.upload`) | `payment_proofs`, `invoices` | `invoice_logs` |
| `verifyPaymentProof` | `POST invoices.verify(id)` | `invoices`, `client_packages`, `credit_ledger` | `invoice_logs` |
| `usePackageActivationActions.approvePackagePayment` / `renewDirect` (aktivasi paket + pindahkan sesi mendatang ke paket aktif, satu transaksi dengan verify/renewal) | `POST invoices.verify(id)` / `POST clients.renewals(id)` | `schedules.client_package_id` | — |
| `renewClientCredit` (renewal / invoice paket pertama **langsung lunas**; `reason` = catatan opsional, `is_renewal` false untuk paket pertama) | `POST clients.renewals(id)` | `invoices` (`renewal_reason`), `client_packages` (snapshot harga), `credit_ledger` | `invoice_logs` |
| renewal **terbitkan invoice baru** = `issueInvoice` jenis `package` + `isRenewal: true` (tanpa endpoint baru; kolom `invoices.is_renewal`) | `POST invoices.list` | lihat `issueInvoice` | `invoice_logs` |
| `usePackageConversionActions.convertInvoicePackage` (konversi sisa sesi + hapus jadwal mendatang + saldo lebihan) *(baru)* | `POST invoices.convertPackage(id)` (`target_package_id`, `sessions?`, `reason?`) | `package_conversions`, `client_packages`, `credit_ledger`, `clients.leftover_balance`, `invoice_logs`, `schedules` (hapus permanen) | `invoice_logs` (`converted`), `package_conversions`, `credit_ledger` (`converted_out/in`) |
| tab Saldo Lebihan (`leftoverSummaryByClient`) *(baru)* | `GET credits.leftoverBalances` (filter cabang, `q`, `include_zero`) | `clients.leftover_balance`, `package_conversions`, `invoices.balance_applied` | — |
| log milik invoice (tombol Log) *(baru)* | `GET invoices.logs(id)` | `invoice_logs` | — |
| void / refund / koreksi saldo | `invoices.void(id)` / `invoices.refund(id)` / `credits.adjust` | `invoices`, `credit_ledger` | `invoice_logs`, `credit_ledger` (`manual_adjust`, `refund`) |
| `useInvoiceVoidActions.voidInvoiceAction` (alasan; **hanya bila kredit belum dipakai**, kredit selalu dipertahankan) | `POST invoices.void(id)` | `invoices` (`void_*`, `replaces_invoice_id`) | `invoice_logs` (`voided`) |
| `useInvoiceRefundActions.refundInvoiceAction` (nominal otomatis/manual + alasan; sisa kredit jadi 0; relink/Frozen sesi mendatang) *(baru)* | `POST invoices.refund(id)` | `invoices` (`refund_*`), `client_packages` (`voided`, `is_refunded`), `credit_ledger` (`refund`), `schedules.client_package_id`, `clients` | `invoice_logs` (`refunded`) |
| `renewClientCredit` / `issueInvoice` + `resetLeave`; `verifyPaymentProof` (paket lunas) memberi saldo cuti | `POST invoices.renewals` / `invoices.verify` | `clients.leave_granted/leave_reset_at`, `invoices.reset_leave` | `invoice_logs` |
| `updateTherapistMaxSessions` (maksimal sesi per bulan) *(baru)* | `PATCH therapists.capacity(id)` | `users.max_sessions_per_month` | — |
| Utilisasi terapis (`buildTherapistUtilization`: kapasitas = maks sesi/bulan × porsi hari kerja periode) & kalender tim hari/minggu (`TeamDayGrid`, `freeTherapistsAt`) — turunan | `GET therapists.utilization?branch&from&to` / `GET schedules.team?date` | `users`, `schedules`, `holidays` | — |
| hapus data (client & cabang hanya role `master`, lainnya akses modul; **permanen**, ADR 0005) *(baru)* | `DELETE …/{id}` pada client, invoice, sesi, master data, cabang (`DELETE branches.detail(id)` = sinkron, atomik, boleh lama; balas 200 + ringkasan jumlah data terhapus) | FK `ON DELETE CASCADE` (client → jadwal/invoice/ledger/…; invoice → bukti/log/paket/konversi); master ber-FK yang dipakai → 409 | log aplikasi (bukan tabel) |
| riwayat kredit | `GET creditLedger` (keyset) | `credit_ledger` | — |
| export laporan harian (portal ortu) *(baru)* | `GET portalClient.reportExport(scheduleId)` | `session_reports` | — |
| `addMasterPackage` (+ `invoice_code`) | `master.packages` | `master_packages` | — |
| layanan / kuadran | `master.services` / `master.quadrants` | `services` / `sensory_quadrants` | — |
| `branchesStore` (`addBranch` / `updateBranch` / `setBranchActive` / `deleteBranch`) *(baru)* | `POST branches.list` / `PUT branches.detail(id)` / `PATCH branches.setActive(id)` / `DELETE branches.detail(id)` | `branches` (+ cascade seluruh isi cabang) | `updated_by` |
| `branchesStore` (`addBankAccount` / `updateBankAccount` / `setBankAccountActive` / `removeBankAccount`) *(baru)* | `POST branches.bankAccounts(id)` / `PATCH branches.bankAccount(id, accountId)` / `PATCH branches.bankAccountActive(id, accountId)` / `DELETE branches.bankAccount(id, accountId)`; daftar dibaca dari `GET /branches` (`bankAccounts[]`) | `branch_bank_accounts` | `created_by`, `updated_by` |
| `addStaffUser` / nonaktifkan staf | `users.*` | `users` | — |
| `addRole` / `updateRole` / `deleteRole` / `updateRolePermission`  | `roles.*`, `roles.permissions(id)` | `roles`, `role_permissions` | — |
| dashboard revenue / inquiry / schedule / cabang / terapis | `dashboards.*?branchId=&period=` | view `v_daily_revenue` / `v_daily_sessions` / `v_daily_credit_usage` (funnel inquiry dihitung dari `clients`) / `v_therapist_sessions` | — |

## Pagination list (semua endpoint list)
Semua endpoint list memakai `page` + `per_page` (default **10**, maks 50) dan merespons `data` + `meta` (`total`, `page`, `per_page`, `last_page`). Riwayat yang terus bertambah (`creditLedger`, `invoices.logs`, riwayat sesi) memakai keyset: `cursor` + `per_page`, respons `next_cursor`. Filter/pencarian dijalankan di server sebelum dipaginasi. Frontend: `usePagination` (client-side sekarang) diganti state `page`/`perPage` yang masuk ke query react-query; `TablePagination` tetap.

## Keputusan yang sudah diambil di `schema.md` v2
Gap antara prototype dan schema v1 sudah diselesaikan (detail `schema.md` §08.2):
- Enum `clients.status` & `schedules.status` mengikuti prototype; **frozen** = turunan `credit_balance = 0`.
- Alasan cancel/pending/discharge = **string bebas** di `schedules.cancel_reason`, `pending_reason`, `clients.discharge_reason`, `credit_ledger.cancel_reason` (kode pilihan cepat atau teks custom, maks 150 karakter, tanpa FK). Tabel `cancel_reasons`/`discharge_reasons` hanya sumber dropdown. Kuota cancel 3 **per paket** (`client_packages.cancel_count`) hanya penghitung; admin memilih potong kredit atau tidak di tiap cancel (`deduct_credit`).
- Laporan sesi → `session_reports` (3 bagian prototype).
- Riwayat kredit → `credit_ledger` append-only (+ `reversal`).
- Master layanan & kuadran → `services`, `sensory_quadrants`. Pilihan cepat alasan → `cancel_reasons` (Cancel / Off dan Therapist Off, dibedakan `is_therapist_off`), `discharge_reasons`.
- **Cancellation Rate / Therapist Off Rate** (Schedule Dashboard): `v_daily_sessions.sessions_cancel_counted` dan `sessions_cancel_therapist_off` dibagi `sessions_total`; Therapist Off adalah bagian dari rate keseluruhan.
- Keputusan klien 3 Okt 2026 (kode client `AE-00001`, kuesioner sekali isi + masa berlaku opsional, invoice paket/assessment, revert 1x, hapus client/cabang hanya master, hari libur, OTP lupa password, tanpa audit log: jejak = kolom pelaku + log khusus): lihat [12-keputusan-klien.md](12-keputusan-klien.md).

### Pekerjaan frontend saat integrasi
| Item | Perubahan |
|---|---|
| Status invoice | Hanya `unpaid`, `paid`, `void` (unggah bukti tidak mengubah status; Finance "Tandai Lunas"; tanpa Tolak); jenis invoice paket/assessment/cuti; hapus jatuh tempo |
| Kode & kuesioner | Login ortu memakai `client_code` (bukan `TDC-`); kuesioner sekali isi (tanpa isi ulang), cek expiry/invoice dari server |
| Hapus | Tombol delete: client/cabang cek `role === master`, lainnya akses modul (dari respons login) |
| Jejak pelaku | Backend mengisi `created_by`/`updated_by`; frontend tidak mengirim pelaku |
| Riwayat kredit | Label aksi baru: `purchased`, `reversal`, `manual_adjust` |
| Revert sesi | Tombol "Batalkan completed / cancel" (wajib alasan) sudah ada di `SessionDetailModal` (`RevertSessionPanel`, `useSessionActions.revertSession`); ganti isinya menjadi satu request `schedules.revert` |
| Log invoice | Tombol **Log** membaca `GET invoices.logs(id)` (sekarang `invoice.logs` di store) |
| Upload bukti | Kirim file asli via `api.upload` (multipart), bukan dataURL |

## Status integrasi frontend per modul
### M1 Auth — terintegrasi (13 Okt 2026)
Aktif bila `VITE_DATA_SOURCE=api` (salin `frontend/.env.example` ke `.env.local`; backend `php artisan serve`). Mode `local` (default) tetap memakai akun demo.
| Bagian | Implementasi |
|---|---|
| Hook use-case | `features/auth/hooks/useAuthActions.js`: `loginStaff`, `loginClient`, `changePassword`, `requestPasswordOtp`, `resetPasswordWithOtp` |
| Store | `stores/authStore.js`: `applySession`, `markPasswordChanged`, `logout` (cabut token di server), pulihkan sesi lewat `GET /auth/me`, handler 401 (`setUnauthorizedHandler`) |
| Izin | Server mengirim `permissions` sebagai **daftar kode modul** yang diizinkan; `services/api/mappers/authMapper.js` (`staffSessionToAuth`) mengubahnya jadi peta `auth.permissions` yang dibaca `hasPermission`/`canDelete`. Master selalu boleh; hapus client/cabang `masterOnly` |
| Halaman | `Login.js` (staf + ortu, dialog ganti password wajib dan lupa password OTP), `RootRedirect.js` ("/" tanpa beranda), guard → `/login`, `AccessDenied` untuk akun yang tidak berhak |
| Galat | Login gagal = 422 (bukan 401, agar tidak memicu handler logout); 429 lockout; 503 email OTP gagal; pesan dari server ditampilkan apa adanya |
**Lockout login (429) real-time (15 Okt 2026).** `ApiError.retryAfter` (detik) diisi dari `retry_after` di body (`too_many_attempts` dari `StaffLoginAction` / `ClientLoginAction`) atau header `Retry-After` (throttle rute). Halaman Login menampilkan `LockoutNotice` dengan hitung mundur mm:ss yang berjalan tiap detik (`useCountdown`), mengunci tombol ("Coba lagi dalam 0:42") dan mengabaikan submit selama terkunci; terbuka otomatis saat habis. Mengganti email / kode client membuka kunci di layar karena lockout server dihitung per email (staf) / per kode+IP (ortu), dan server menilai ulang saat dicoba lagi.

**Lupa password: kirim ulang OTP (15 Okt 2026).** Di langkah OTP, `ForgotPasswordDialog` punya tombol "Kirim ulang OTP" dengan jeda 60 detik (countdown di tombol), penanda masa berlaku 10:00 yang menghitung mundur, dan pesan kedaluwarsa saat habis; kirim ulang memanggil `POST /auth/forgot-password` lagi dengan email yang sama (OTP lama otomatis tidak berlaku), mengosongkan kolom kode, dan memulai jeda lagi. Batas server (3 permintaan / 10 menit / email, 429) ditampilkan apa adanya. Hook: `shared/hooks/useCountdown.js`.

### M2 User, Role/RBAC, Cabang, Terapis: terintegrasi (13 Okt 2026)
Aktif bila `VITE_DATA_SOURCE=api`. Mode demo tetap memakai localStorage; implementasi dipilih per build (`isApiMode()`), jadi halaman dan pemanggilnya sama.
| Bagian | Implementasi |
|---|---|
| Store cabang | `stores/branchesStore.js`: `GET /branches` (react-query, dibaca semua staf; dipakai semua filter/combo box lewat `BRANCHES`/`activeBranches()`); tambah/ubah/aktif async dan melempar `ApiError` |
| Store terapis | `stores/therapistsStore.js`: `GET /therapists`; kapasitas `PATCH /therapists/{id}/capacity` |
| Hook admin | `features/master/hooks/useStaffAdmin.js` (daftar dipaginasi **server**: `page`, `per_page`, `q`, `branch_id`; tambah/ubah/aktif/reset password), `useRoleAdmin.js` (role + matriks izin, saklar optimistis), `useBranchDeleteActions.js` (pratinjau dampak dari server) |
| Mapper | `services/api/mappers/organizationMapper.js` (cabang, terapis, akun, role, matriks) |
| Halaman | `UserManagement`, `RoleModuleAccess`, `BranchManagement` memanggil hook; semua mutasi `await` dan galat server (422/403/409) ditampilkan sebagai toast |
| Id | Id entity server dijadikan **string** di frontend (`"1"`); kode role tetap menjadi `id` role di frontend (sama dengan `auth.role`), id server di `serverId` |
| Matriks izin | Dikirim/diterima sebagai **array** `[{ moduleCode, allowed }]`; di server `permissions` role = daftar kode modul |
| Sesi | `auth` memuat `roleName`/`roleBadge` (label sidebar role kustom); `refreshSession()` dipanggil bila Master mengubah izin role akunnya sendiri; `queryClient.clear()` saat logout |
Urutan provider: `AuthProvider` kini di luar `BranchesProvider`/`TherapistsProvider` (store API membaca sesi untuk menentukan kapan boleh memanggil API; sesi tersimpan tanpa token dianggap kosong).
Rekening bank cabang (info pembayaran ke ortu): `GET /branches` memuat `bankAccounts[]`; CRUD lewat dialog "Rekening" di Master Cabang (`features/master/components/branch/BranchBankAccountsDialog.js`). Ortu melihat rekening **aktif** cabang client lewat `shared/components/BranchBankAccounts.js` di `AssessmentProofCard` (kuesioner publik) dan portal ortu; mode API portal ortu membaca `auth.branchBankAccounts` (dari `branch.bank_accounts` pada respons login client, `authMapper`). Kuesioner publik mode API menunggu endpoint M5 5.9 memuat `branch.bank_accounts`.
Hapus cabang permanen: server membalas 501 sampai Sprint 4; halaman menjelaskan dan menyarankan Nonaktifkan.
### M3 Master data & hari libur: terintegrasi (14 Okt 2026)
Aktif bila `VITE_DATA_SOURCE=api`. Mode demo tetap memakai localStorage; implementasi dipilih per build (`isApiMode()`), jadi halaman sama. Kontrak endpoint: `implementation_detail.md` §5.
| Bagian | Implementasi |
|---|---|
| Endpoint | `ENDPOINTS.master.{services,quadrants,cancelReasons,dischargeReasons,packages}` (`list`/`detail`, paket + `setActive`) dan `ENDPOINTS.holidays` |
| Mapper | `services/api/mappers/masterDataMapper.js`: layanan/alasan memakai kunci `value` + `active` (= `code`/`is_active` server), kuadran kunci `code`, paket `id` = kode internal server (`pkg-reguler`, cocok dengan `packageId` di data kredit) dan id angka di `serverId`, libur `date`/`branchId` string. Request hanya memuat field yang diisi (patch parsial aman) |
| Store | `masterDataStore` (layanan, kuadran, alasan Cancel/Off, alasan Discharge; react-query `["master", …]`), `holidaysStore` (`["holidays"]`, `createHolidayRange`), master paket di `creditsStore` (`useMasterPackages`, `["master","packages"]`; sisa data kredit/invoice masih localStorage sampai Finance) |
| Aksi tulis | Mode API mengembalikan Promise dan melempar `ApiError`; halaman `await` + `try/catch` dengan `apiErrorText` (422 kode ganda, 409 `in_use`, 403 libur cabang lain). Mode demo sinkron |
| Hook | `useHolidayActions`: mode API mengirim libur sekali (satu tanggal atau rentang), tanpa pratinjau/konfirmasi pembatalan, hasil `{ cancelled: 0, affected }` |
| Halaman | `InquiryMasterData` + `ReasonListTab`, `Holidays`, `FinancePortal` + `PackagesTab` (saklar aktif + hapus paket) |
| Paket aktif | `getActiveMasterPackages()` untuk pilihan di form invoice, renewal, asesmen, dan konversi; paket nonaktif tetap terbaca lewat `getMasterPackages()` |
Aturan yang berubah (13–14 Okt): kuadran yang belum dipakai boleh dihapus semua (tidak ada batas minimal, demo ikut). Hapus paket di demo hanya bila belum dipakai invoice/paket client (`masterPackageUsage`, `domain/credit.js`).
Batasan sementara: (1) libur di mode API **tidak** membatalkan sesi (Sprint 2); toast menyebut jumlah sesi terjadwal yang terdampak. (2) Pemakaian layanan/kuadran di halaman Master Data memakai **angka asli dari server** di mode API (`GET /master/services` memuat `client_count` + `schedule_count`, `GET /master/quadrants` memuat `question_count` + `score_count`; dihitung lintas cabang). Selama kuesioner belum dimigrasi (M5) jumlah soal di database masih 0, jadi badge "N soal" kuadran baru akurat setelah M5; mode demo tetap menghitung dari store lokal. (3) Paket baru dari server belum dikenali reducer kredit lokal (renewal/aktivasi paket) sampai Finance dimigrasi (Sprint 2).

**Batasan sementara (modul lain masih localStorage):** halaman selain auth belum membaca data dari API sampai modulnya dimigrasi (sprint 1 hari 6+). Akibatnya setelah login API: `branchId` berupa id numerik server (belum cocok dengan id cabang demo), portal ortu/terapis belum menemukan datanya, dan halaman User/RBAC masih memakai data lokal sampai M2 dimigrasi.

### Aturan fetch di semua modul (berlaku untuk integrasi berikutnya)
Halaman hanya mengambil data yang dibacanya (`useDemand`, getter / panggilan fungsi); jangan men-fetch daftar saat login. Aturan lengkap + contoh: `docs/guide/08` bagian "Fetch hanya yang diperlukan" dan `CLAUDE.md` aturan 22b. Setiap modul baru wajib punya tes daftar endpoint halamannya.

### M4 Inquiry & Client: terintegrasi — pipeline & detail client (15 Okt 2026)
Endpoint aktif: `GET /clients` (filter `status[]`, `q`, `service_code`, `credit_status`, `sort`, `page/per_page`), `GET /clients/pipeline-summary`, `GET /clients/check-duplicate`, `POST /clients`, `GET/PATCH/DELETE /clients/{id}`, `PUT /clients/{id}/services`, `POST/DELETE /clients/{id}/gdrive-links`, `POST /clients/{id}/transition`. Kontrak yang berbeda dari store demo, yang harus dipetakan saat integrasi FE (`services/api/mappers/clientMapper.js`):
- `dob` → `date_of_birth`, `clientName` → `child_name`, `serviceTypes[]` → `service_codes[]`, `gdriveClientLink` → `gdrive_links[]` (array; FE lama satu link), `frozen` dan `credit_balance` datang dari server (tidak disimpan di FE).
- **Alasan keluar**: transisi `discharged`/`discontinued` mengirim `reason` (wajib) + `note?`; server menyimpannya di `discharge_reason`/`discharge_note`. Pola lama FE (`dischargeReason="other"` + `dischargeNote=alasan` untuk discontinue) dibuang: tampilkan `discharge_reason` apa adanya.
- `version` wajib pada `PATCH` dan `transition` (409 `version_conflict`); kode client tidak bisa diubah.
- Efek discharge (hapus jadwal aktif + hanguskan sisa kredit) belum ada di server sampai Sprint 2; `useClientOutcomeActions` mode API tidak boleh mengandalkannya.
- Hapus client hanya master (403 selain itu); hook `useClientDeleteActions` mode API cukup `DELETE /clients/{id}` (cascade di server).
- Pencarian `q` prefix per kata (sama dengan `matchesClientSearch`); daftar dipaginasi server.

**Implementasi FE (aktif bila `VITE_DATA_SOURCE=api`):**
| Bagian | Implementasi |
|---|---|
| Mapper | `services/api/mappers/clientMapper.js` (`clientFromApi`, `clientCreateToApi`, `clientUpdateToApi`, `transitionToApi`); nama field FE lama dipertahankan (`clientName`, `dob`, `parentContact`, `serviceTypes`, `gdriveClientLink`) |
| Store | `stores/clientsStore.js` mode API = **cache ringan** 50 client terbaru (`GET /clients`) agar modul lain yang belum terintegrasi tidak error; mutatornya hanya mengubah cache di memori |
| Hook halaman | `features/inquiry/hooks/useInquiryClients.js`: `useInquiryPipeline` (SATU request `GET /clients/board?per_stage=10` untuk halaman pertama 9 tahap sekaligus (jumlah asli `total` per tahap), lalu **infinite scroll per kolom**: `loadMore(status)` mengambil `GET /clients?status[]=…&page=N&per_page=10` dengan filter yang sama (halaman tambahan dibuang saat filter berubah / papan disegarkan; duplikat akibat offset bergeser dibuang; gagal = `loadMoreFailed`); `isLoading` untuk muat pertama, `isFetching` untuk muat ulang) dan `useClientDetail` (`GET /clients/{id}`, ubah biodata, pilih layanan, link GDrive) |
| Use-case | `useClientOutcomeActions` mode API = `POST /clients/{id}/transition` (async, 409/422 dilempar); `useClientDeleteActions` mode API = `DELETE /clients/{id}` |
| Halaman | `InquiryPipeline`, `ClientDetailInquiry` (semua aksi `await` + toast galat server); `PipelineBoard` menampilkan jumlah asli per tahap + kerangka (skeleton) kartu saat muat pertama; teks "memperbarui…" di filter bar saat muat ulang |

**Belum terintegrasi (tetap lokal / kosong di mode API):** kode kuesioner & invoice assessment di detail client (M5/M6), jadwal asesmen (S2), `DashboardInquiry` (agregat M10), Active Clients / jadwal / finance (modul masing-masing). Discharge di mode API belum menghapus jadwal / menghanguskan kredit (Sprint 2). Cabang client tidak dapat diubah lewat Edit Intake. UI link GDrive satu kolom: menyimpan menggantikan semua link client.

### Active Clients (M8) — roster & birthday memakai server (15 Okt 2026)
`ActiveClients` (tab Client Roster, Birthday Hub) di mode API **tidak lagi membaca cache client global**: `features/schedule/hooks/useRosterClients.js` memanggil `GET /clients` dengan paginasi server (per_page bawaan 10, `status[]` roster, `branch_id`, `q`, `credit_status`, `sort=child_name`) dan Birthday Hub memakai filter baru `birth_month` (1–12, indeks `idx_clients_birthday`), baru diambil saat tabnya dibuka. Tab Advanced Analytics belum tersedia di mode API (butuh jadwal & kredit: Sprint 2–3). Kolom paket menampilkan saldo total dari server (`creditBalance`); rincian paket & kuota cancel menunggu modul Finance. Penyebab gejala "roster hanya 6 client": halaman membaca cache 50 (kini 10) client terbaru lalu menyaring status roster di klien, jadi hanya sebagian yang tampil — cache itu hanya penambal untuk modul yang belum terintegrasi, jangan dipakai untuk daftar.

### M5 Asesmen — kontrak field section/soal siap, belum dikerjakan (15 Okt 2026)
Mode demo sudah memakai bentuk baru; backend & mode API menyusul di M5 (controller/`AssessmentService` masih kerangka, `assessmentsStore` masih lokal). Kontrak untuk M5:
- `assessment_sections`: **`lead_text` → `description`** (TEXT NULL; migration rename + lebarkan) dan kolom baru **`document_url`** (VARCHAR(500) NULL). JSON: `description`, `documentUrl`. Validasi `document_url`: `url` https dengan host `docs.google.com` / `drive.google.com` (selaras `toDocumentEmbedUrl`).
- `assessment_questions.is_required` (sudah ada, default 1) dipakai sebagai `required` di JSON; soal opsional boleh tidak dijawab saat `POST /public/assessments/{code}/responses` (validasi soal wajib saja; jawaban opsional kosong tidak disimpan / tidak dihitung skor).
- `POST /assessment-categories/{id}/sections` & `PATCH /assessment-sections/{id}` menerima `title, description, document_url, sort_order`; soal menerima `required`.
- Tidak ada tipe soal baru (`question_type` tetap 12 nilai): kesepakatan = section ber-`document_url` + soal `multiple_choice` satu opsi.
- Yang perlu dibuat saat M5: migration, model/FormRequest/Resource, `endpoints.js` (sections/questions), `mappers/assessmentMapper.js` + test, provider API `assessmentsStore` (pola `branchesStore`).

## Urutan migrasi yang disarankan
1. Backend: migration sesuai `schema.md` §09 + seeder master dari `src/domain/*`.
2. Auth: login staf & ortu via Sanctum; `tokenStore`; `setUnauthorizedHandler` → logout + redirect.
3. Ganti store read-only dulu (`therapistsStore`, `masterDataStore`), lalu `clientsStore`, `assessmentsStore`, `schedulesStore`, `creditsStore` — interface value tetap.
4. Ganti isi hook use-case dengan satu mutation per fungsi; invalidasi query terkait.
5. Hapus seed/localStorage untuk domain yang sudah pindah; `usePersistentState` hanya untuk preferensi UI.

- **Hari libur membatalkan sesi** (`useHolidayActions.createHoliday/changeHoliday`): `POST/PATCH holidays` satu transaksi: insert/update `holidays` + `UPDATE schedules SET status='cancelled', cancel_reason='H', cancel_note='Hari libur: …' WHERE session_date = ? AND (branch_id = ? OR holiday semua cabang) AND status IN ('scheduled','reschedule_pending')`. Tidak menulis `credit_ledger`; respons memuat `cancelled_count` untuk toast.
