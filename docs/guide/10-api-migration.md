# 10 — Integrasi Laravel API

Target backend: **Laravel 11 + MySQL 8 + Sanctum**, tanpa Redis dan tanpa queue (cache & session memakai driver `database`; semua proses sinkron; cron terjadwal dijelaskan di `schema.md` §11). Desain database lengkap (tabel, indeks, jejak perubahan, alur transaksi): **`schema.md`**. Dokumen ini memetakan frontend → API.

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

## Prinsip
1. Halaman tidak berubah saat pindah ke API: **interface store & hook use-case tetap**, implementasi di dalamnya yang diganti (skill `react-architecture` §3).
2. Aksi lintas tabel = **satu endpoint transaksional** (complete, cancel, verify, transition). Frontend tidak merangkai beberapa request.
3. Kirim `version` untuk entity ber-optimistic-lock (`clients`, `schedules`, `invoices`, `client_packages`, `session_reports`) → 409 ditangani `ApiError.isConflict`.
4. Data turunan (saldo, frozen, skor kuadran, KPI) dihitung/diambil dari backend; jangan disimpan di frontend.
5. **Tidak ada audit log** (ADR 0004). Semua modul memakai `created_by`/`updated_by`; log khusus hanya `credit_ledger`, `client_status_histories`, `invoice_logs`, `package_conversions`.

## Mapping use-case → endpoint
Kolom Jejak: log khusus selain kolom pelaku `created_by`/`updated_by` (tidak ada tabel audit log, ADR 0004): `credit_ledger`, `client_status_histories`, `invoice_logs`, `package_conversions`; `—` = cukup kolom pelaku. Endpoint bertanda *(baru)* belum ada di `endpoints.js`.

| Frontend (store / hook) | Endpoint (`ENDPOINTS`) | Tabel utama | Jejak |
|---|---|---|---|
| `login` staf | `POST auth.staffLogin` | `users`, `personal_access_tokens` | — |
| ganti password (wajib di login pertama) *(baru)* | `POST auth.changePassword` | `users` | — |
| lupa password: minta OTP / reset *(baru)* | `POST auth.forgotPassword` / `auth.resetPassword` | `password_reset_otps`, `users` | — |
| reset password oleh Master *(baru)* | `POST users.resetPassword(id)` | `users` | — |
| `login` ortu (kode client + tanggal lahir anak) | `POST auth.clientLogin` | `clients.client_code` | — |
| `addClient` | `POST clients.list` | `clients`, `client_code_counters`, `client_status_histories` | — |
| `updateClient` (biodata) | `PATCH clients.detail(id)` | `clients` | — |
| toggle layanan | `PUT clients.services(id)` | `client_services` | — |
| `useClientOutcomeActions.*` (admit, outcome, discharge, discontinue, reaktivasi, ubah status manual) | `POST clients.transition(id)` | `clients`, `client_status_histories` | — |
| simpan link GDrive | `POST clients.gdriveLinks(id)` | `client_documents` | — |
| generate kode kuesioner (+ masa berlaku opsional) | `POST clients.assessmentCodes(id)` | `assessment_access_codes` | — |
| buka kuesioner (publik; cek sekali isi, expiry, invoice assessment) *(baru)* | `GET publicAssessment.show(code)` | `assessment_access_codes`, `invoices` | — |
| submit kuesioner (publik, consent wajib) | `POST publicAssessment.submit(code)` | `assessment_responses/answers/quadrant_scores` | — |
| CRUD kategori/section/soal | `assessmentCategories.*` | `assessment_categories/sections/questions` | — |
| `offSession` + `leaveInvoiceAmount` (Off + invoice cuti opsional, nominal manual; satu transaksi dengan ledger `off_*`) | `POST schedules.off` | `schedules`, `credit_ledger`, `invoices` (`invoice_type=leave`, `leave_schedule_id`), `invoice_counters`, `invoice_logs` | `invoice_logs` |
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
| `issueCode` (kode kuesioner + invoice assessment otomatis, satu transaksi) / `deleteCode` (hapus kode + invoice belum lunas) | `POST clients.assessmentCodes` / `DELETE` | `assessment_access_codes`, `invoices` (`assessment_access_code_id`), `invoice_counters`, `invoice_logs` | `invoice_logs` |
| `uploadPaymentProof({ byFinance })` Finance upload/ganti bukti manual (tanpa batas 4x, tidak untuk void) | `POST invoices.proof` (role finance) | `payment_proofs`, `invoices.proof_upload_count`, `invoice_logs` | `invoice_logs` |
| `uploadPaymentProof` dari `/assessment` (publik, dikunci kode kuesioner; wajib sebelum isi) | `POST invoices.proof` | `payment_proofs`, `invoices.proof_upload_count`, `invoice_logs` | `invoice_logs` |
| `issueInvoice` renewal cepat tab Perlu Renewal (paket sama, kredit < 3) | `POST invoices.list` | `invoices`, `invoice_counters`, `invoice_logs` | `invoice_logs` |
| `updateSchedule({ historyNote })` dari Log Kredit / detail sesi | `PATCH schedules.detail` | `schedules.history_note`, `history_note_by` | — |
| `issueInvoice` (jenis `package` / `assessment`; saldo lebihan otomatis memotong invoice paket) | `POST invoices.list` | `invoices` (`gross_amount`, `balance_applied`), `invoice_counters`, `invoice_logs`, `clients.leftover_balance` | `invoice_logs` |
| `uploadPaymentProof` (LEGACY: ortu tidak lagi upload; hanya data lama) | `POST invoices.proof(id)` (multipart, `api.upload`) | `payment_proofs`, `invoices` | `invoice_logs` |
| `verifyPaymentProof` | `POST invoices.verify(id)` | `invoices`, `client_packages`, `credit_ledger` | `invoice_logs` |
| `usePackageActivationActions.approvePackagePayment` / `renewDirect` (aktivasi paket + pindahkan sesi mendatang ke paket aktif, satu transaksi dengan verify/renewal) | `POST invoices.verify(id)` / `POST clients.renewals(id)` | `schedules.client_package_id` | — |
| `renewClientCredit` (renewal / invoice paket pertama **langsung lunas**; `reason` = catatan opsional, `is_renewal` false untuk paket pertama) | `POST clients.renewals(id)` | `invoices` (`renewal_reason`), `client_packages` (snapshot harga), `credit_ledger` | `invoice_logs` |
| renewal **terbitkan invoice baru** = `issueInvoice` jenis `package` + `isRenewal: true` (tanpa endpoint baru; kolom `invoices.is_renewal`) | `POST invoices.list` | lihat `issueInvoice` | `invoice_logs` |
| `usePackageConversionActions.convertInvoicePackage` (konversi sisa sesi + hapus jadwal mendatang + saldo lebihan) *(baru)* | `POST invoices.convertPackage(id)` (`target_package_id`, `sessions?`, `reason?`) | `package_conversions`, `client_packages`, `credit_ledger`, `clients.leftover_balance`, `invoice_logs`, `schedules` (hapus permanen) | `invoice_logs` (`converted`), `package_conversions`, `credit_ledger` (`converted_out/in`) |
| tab Saldo Lebihan (`leftoverSummaryByClient`) *(baru)* | `GET credits.leftoverBalances` (filter cabang, `q`, `include_zero`) | `clients.leftover_balance`, `package_conversions`, `invoices.balance_applied` | — |
| log milik invoice (tombol Log) *(baru)* | `GET invoices.logs(id)` | `invoice_logs` | — |
| void / koreksi saldo | `invoices.void(id)` / `credits.adjust` | `invoices`, `credit_ledger` | `invoice_logs`, `credit_ledger` (`manual_adjust`) |
| `useInvoiceVoidActions.voidInvoiceAction` (alasan + `credit_action` keep/revoke; relink/Frozen sesi mendatang) *(baru)* | `POST invoices.void(id)` | `invoices` (`void_*`, `replaces_invoice_id`), `client_packages` (`voided`), `credit_ledger` (`manual_adjust`), `schedules.client_package_id`, `clients` | `invoice_logs` (`voided`) |
| hapus data (butuh `roles.can_delete`; **permanen**, ADR 0005) *(baru)* | `DELETE …/{id}` pada client, invoice, sesi, master data, cabang (`DELETE branches.detail(id)` = sinkron, atomik, boleh lama; balas 200 + ringkasan jumlah data terhapus) | FK `ON DELETE CASCADE` (client → jadwal/invoice/ledger/…; invoice → bukti/log/paket/konversi); master ber-FK yang dipakai → 409 | log aplikasi (bukan tabel) |
| riwayat kredit | `GET creditLedger` (keyset) | `credit_ledger` | — |
| export laporan harian (portal ortu) *(baru)* | `GET portalClient.reportExport(scheduleId)` | `session_reports` | — |
| `addMasterPackage` (+ `invoice_code`) | `master.packages` | `master_packages` | — |
| layanan / kuadran | `master.services` / `master.quadrants` | `services` / `sensory_quadrants` | — |
| `branchesStore` (`addBranch` / `updateBranch` / `setBranchActive` / `deleteBranch`) *(baru)* | `POST branches.list` / `PUT branches.detail(id)` / `PATCH branches.setActive(id)` / `DELETE branches.detail(id)` | `branches` (+ cascade seluruh isi cabang) | `updated_by` |
| `addStaffUser` / nonaktifkan staf | `users.*` | `users` | — |
| `addRole` / `updateRole` / `deleteRole` / `updateRolePermission` (termasuk `can_delete`) | `roles.*`, `roles.permissions(id)` | `roles`, `role_permissions` | — |
| dashboard revenue / inquiry / schedule / cabang / terapis | `dashboards.*?branchId=&period=` | view `v_daily_revenue` / `v_daily_sessions` / `v_daily_pipeline` / `v_daily_credit_usage` / `v_therapist_sessions` | — |

## Pagination list (semua endpoint list)
Semua endpoint list memakai `page` + `per_page` (default **10**, maks 50) dan merespons `data` + `meta` (`total`, `page`, `per_page`, `last_page`). Riwayat yang terus bertambah (`creditLedger`, `invoices.logs`, riwayat sesi) memakai keyset: `cursor` + `per_page`, respons `next_cursor`. Filter/pencarian dijalankan di server sebelum dipaginasi. Frontend: `usePagination` (client-side sekarang) diganti state `page`/`perPage` yang masuk ke query react-query; `TablePagination` tetap.

## Keputusan yang sudah diambil di `schema.md` v2
Gap antara prototype dan schema v1 sudah diselesaikan (detail `schema.md` §08.2):
- Enum `clients.status` & `schedules.status` mengikuti prototype; **frozen** = turunan `credit_balance = 0`.
- Alasan cancel/pending/discharge = **string bebas** di `schedules.cancel_reason`, `pending_reason`, `clients.discharge_reason`, `credit_ledger.cancel_reason` (kode pilihan cepat atau teks custom, maks 150 karakter, tanpa FK). Tabel `cancel_reasons`/`discharge_reasons` hanya sumber dropdown. Kuota cancel 3 **per paket** (`client_packages.cancel_count`) hanya penghitung; admin memilih potong kredit atau tidak di tiap cancel (`deduct_credit`).
- Laporan sesi → `session_reports` (3 bagian prototype + SOAP opsional).
- Riwayat kredit → `credit_ledger` append-only (+ `reversal`).
- Master layanan & kuadran → `services`, `sensory_quadrants`. Pilihan cepat alasan → `cancel_reasons`, `discharge_reasons`.
- Keputusan klien 3 Okt 2026 (kode client `AE-00001`, kuesioner sekali isi + masa berlaku opsional, invoice paket/assessment, revert 1x, hapus per role `can_delete`, hari libur, OTP lupa password, tanpa audit log: jejak = kolom pelaku + log khusus): lihat [12-keputusan-klien.md](12-keputusan-klien.md).

### Pekerjaan frontend saat integrasi
| Item | Perubahan |
|---|---|
| Status invoice | Tampilkan `pending_verification` (setelah ortu upload), `rejected` (+ alasan), `void`; jenis invoice paket/assessment; hapus jatuh tempo |
| Kode & kuesioner | Login ortu memakai `client_code` (bukan `TDC-`); kuesioner sekali isi (tanpa isi ulang), cek expiry/invoice dari server |
| Hapus | Tombol delete mengikuti `canDelete` dari respons login (role) |
| Jejak pelaku | Backend mengisi `created_by`/`updated_by`; frontend tidak mengirim pelaku |
| Riwayat kredit | Label aksi baru: `purchased`, `reversal`, `manual_adjust` |
| Revert sesi | Tombol "Batalkan completed / cancel" (wajib alasan) sudah ada di `SessionDetailModal` (`RevertSessionPanel`, `useSessionActions.revertSession`); ganti isinya menjadi satu request `schedules.revert` |
| Log invoice | Tombol **Log** membaca `GET invoices.logs(id)` (sekarang `invoice.logs` di store) |
| Upload bukti | Kirim file asli via `api.upload` (multipart), bukan dataURL |

## Urutan migrasi yang disarankan
1. Backend: migration sesuai `schema.md` §09 + seeder master dari `src/domain/*`.
2. Auth: login staf & ortu via Sanctum; `tokenStore`; `setUnauthorizedHandler` → logout + redirect.
3. Ganti store read-only dulu (`therapistsStore`, `masterDataStore`), lalu `clientsStore`, `assessmentsStore`, `schedulesStore`, `creditsStore` — interface value tetap.
4. Ganti isi hook use-case dengan satu mutation per fungsi; invalidasi query terkait.
5. Hapus seed/localStorage untuk domain yang sudah pindah; `usePersistentState` hanya untuk preferensi UI.
