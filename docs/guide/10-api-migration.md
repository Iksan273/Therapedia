# 10 — Integrasi Laravel API

Target backend: **Laravel 11 + MySQL 8 + Sanctum**, tanpa Redis (cache, queue, session memakai driver `database`; job malam dijelaskan di `schema.md` §11). Desain database lengkap (tabel, indeks, audit log, alur transaksi): **`schema.md`**. Dokumen ini memetakan frontend → API.

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
5. Hanya aksi modul **schedule dan finance** yang menghasilkan baris `audit_logs` di backend (kode aksi `schema.md` §05.4). Modul lain (intake, asesmen, master, akses) cukup `created_by`/`updated_by`; riwayat pipeline = `client_status_histories`. Frontend demo saat ini masih mencatat lebih luas (lihat `11-known-issues.md`).

## Mapping use-case → endpoint
Kolom Audit: hanya modul **schedule & finance** yang menulis `audit_logs`; selain itu `—` (cukup `created_by`/`updated_by`/`deleted_by`). Endpoint bertanda *(baru)* belum ada di `endpoints.js`.

| Frontend (store / hook) | Endpoint (`ENDPOINTS`) | Tabel utama | Audit |
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
| `addSchedule` / `addSchedules` | `POST schedules.list` / `POST schedules.bulkCreate` | `schedules`, `schedule_series` | `schedule.created` / `schedule.series_created` |
| `useSessionActions.saveReport` | `PUT schedules.report(id)` | `session_reports` | `schedule.report_saved` |
| `useSessionActions.completeSession` | `POST schedules.complete(id)` | `schedules`, `client_packages`, `credit_ledger`, `clients` | `schedule.completed` |
| `useSessionActions.cancelSession` (body: `reason`, `deduct_credit` wajib) | `POST schedules.cancel(id)` | `schedules`, `client_packages` (`cancel_count`), `credit_ledger` | `schedule.cancelled` |
| `rescheduleSession` / `markPending` / `dropPending` | `schedules.reschedule/markPending/dropPending(id)` | `schedules` | `schedule.rescheduled` / `…marked_pending` / `…pending_dropped` |
| revert (hanya 1x) | `POST schedules.revert(id)` | `schedules`, `credit_ledger` (reversal) | `schedule.completion_reverted` / `…cancellation_reverted` / `…reschedule_reverted` / `…pending_reverted` |
| `bulkComplete` / `bulkCancel` / `bulkReschedule` | `POST schedules.bulkAction(action)` (complete / cancel / reschedule / revert) | sama + `batch_id` | `schedule.bulk_*` |
| cek bentrok (preview) | `GET schedules.conflicts` | `schedules`, `holidays` | — |
| hari libur *(baru)* | `holidays.*` (CRUD) | `holidays` | — |
| monitoring sesi completed tanpa report *(baru)* | `GET schedules.unreported` | view `v_unreported_sessions` | — |
| `issueInvoice` (jenis `package` / `assessment`; saldo lebihan otomatis memotong invoice paket) | `POST invoices.list` | `invoices` (`gross_amount`, `balance_applied`), `invoice_counters`, `invoice_logs`, `clients.leftover_balance` | `invoice.issued` |
| `uploadPaymentProof` (≤5 MB, maks 3x re-upload) | `POST invoices.proof(id)` (multipart, `api.upload`) | `payment_proofs`, `invoices` | `invoice.proof_uploaded` |
| `verifyPaymentProof` | `POST invoices.verify(id)` | `invoices`, `client_packages`, `credit_ledger` | `invoice.verified` / `invoice.rejected` |
| `renewClientCredit` | `POST clients.renewals(id)` | `invoices`, `client_packages` (snapshot harga), `credit_ledger` | `invoice.renewal_created` |
| `usePackageConversionActions.convertInvoicePackage` (konversi sisa sesi + hapus jadwal mendatang + saldo lebihan) *(baru)* | `POST invoices.convertPackage(id)` (`target_package_id`, `sessions?`, `reason?`) | `package_conversions`, `client_packages`, `credit_ledger`, `clients.leftover_balance`, `invoice_logs`, `schedules` (soft delete) | `invoice.package_converted` + `schedule.deleted` |
| log milik invoice (tombol Log) *(baru)* | `GET invoices.logs(id)` | `invoice_logs` (bukan `audit_logs`) | — |
| void / koreksi saldo | `invoices.void(id)` / `credits.adjust` | `invoices`, `credit_ledger` | `invoice.voided` / `credit.manual_adjusted` |
| hapus data (butuh `roles.can_delete`) *(baru)* | `DELETE …/{id}` pada client, inquiry, invoice, sesi, master data | `deleted_at`, `deleted_by` | `schedule.deleted` / `invoice.deleted` (modul lain —) |
| riwayat kredit | `GET creditLedger` (keyset) | `credit_ledger` | — |
| export laporan harian (portal ortu) *(baru)* | `GET portalClient.reportExport(scheduleId)` | `session_reports` | — |
| `addMasterPackage` (+ `invoice_code`) | `master.packages` | `master_packages` | — |
| layanan / kuadran | `master.services` / `master.quadrants` | `services` / `sensory_quadrants` | — |
| `addStaffUser` / nonaktifkan staf | `users.*` | `users` | — |
| `addRole` / `updateRole` / `deleteRole` / `updateRolePermission` (termasuk `can_delete`) | `roles.*`, `roles.permissions(id)` | `roles`, `role_permissions` | — |
| dashboard revenue / inquiry / schedule / cabang / terapis | `dashboards.*?branchId=&period=` | view `v_daily_revenue` / `v_daily_sessions` / `v_daily_pipeline` / `v_daily_credit_usage` / `v_therapist_sessions` | — |
| timeline audit | `auditLogs.list`, `auditLogs.forEntity(type, id)` | `audit_logs` | — |

## Keputusan yang sudah diambil di `schema.md` v2
Gap antara prototype dan schema v1 sudah diselesaikan (detail `schema.md` §08.2):
- Enum `clients.status` & `schedules.status` mengikuti prototype; **frozen** = turunan `credit_balance = 0`.
- Alasan cancel/pending/discharge = **string bebas** di `schedules.cancel_reason`, `pending_reason`, `clients.discharge_reason`, `credit_ledger.cancel_reason` (kode pilihan cepat atau teks custom, maks 150 karakter, tanpa FK). Tabel `cancel_reasons`/`discharge_reasons` hanya sumber dropdown. Kuota cancel 3 **per paket** (`client_packages.cancel_count`) hanya penghitung; admin memilih potong kredit atau tidak di tiap cancel (`deduct_credit`).
- Laporan sesi → `session_reports` (3 bagian prototype + SOAP opsional).
- Riwayat kredit → `credit_ledger` append-only (+ `reversal`).
- Master layanan & kuadran → `services`, `sensory_quadrants`. Pilihan cepat alasan → `cancel_reasons`, `discharge_reasons`.
- Keputusan klien 3 Okt 2026 (kode client `AE-00001`, kuesioner sekali isi + masa berlaku opsional, invoice paket/assessment, revert 1x, hapus per role `can_delete`, hari libur, OTP lupa password, audit hanya schedule & finance): lihat [12-keputusan-klien.md](12-keputusan-klien.md).

### Pekerjaan frontend saat integrasi
| Item | Perubahan |
|---|---|
| Status invoice | Tampilkan `pending_verification` (setelah ortu upload), `rejected` (+ alasan), `void`; jenis invoice paket/assessment; hapus jatuh tempo |
| Kode & kuesioner | Login ortu memakai `client_code` (bukan `TDC-`); kuesioner sekali isi (tanpa isi ulang), cek expiry/invoice dari server |
| Hapus | Tombol delete mengikuti `canDelete` dari respons login (role) |
| Audit | Selaraskan `domain/audit.js` dan halaman `AuditLogs` dengan kategori schedule & finance saja |
| Riwayat kredit | Label aksi baru: `purchased`, `reversal`, `manual_adjust` |
| Revert sesi | Tombol "Batalkan completed / cancel" (wajib alasan) sudah ada di `SessionDetailModal` (`RevertSessionPanel`, `useSessionActions.revertSession`); ganti isinya menjadi satu request `schedules.revert` |
| Timeline audit | Panel riwayat perubahan per client/sesi/invoice (`auditLogs.forEntity`) |
| Upload bukti | Kirim file asli via `api.upload` (multipart), bukan dataURL |

## Urutan migrasi yang disarankan
1. Backend: migration sesuai `schema.md` §09 + seeder master dari `src/domain/*`.
2. Auth: login staf & ortu via Sanctum; `tokenStore`; `setUnauthorizedHandler` → logout + redirect.
3. Ganti store read-only dulu (`therapistsStore`, `masterDataStore`), lalu `clientsStore`, `assessmentsStore`, `schedulesStore`, `creditsStore` — interface value tetap.
4. Ganti isi hook use-case dengan satu mutation per fungsi; invalidasi query terkait.
5. Hapus seed/localStorage untuk domain yang sudah pindah; `usePersistentState` hanya untuk preferensi UI.
