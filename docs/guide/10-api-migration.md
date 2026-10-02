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
5. Semua aksi yang mengubah data menghasilkan baris `audit_logs` di backend (kode aksi `schema.md` §05.4).

## Mapping use-case → endpoint
| Frontend (store / hook) | Endpoint (`ENDPOINTS`) | Tabel utama | Audit |
|---|---|---|---|
| `login` staf | `POST auth.staffLogin` | `users`, `personal_access_tokens` | `auth.login` |
| `login` ortu (kode) | `POST auth.clientLogin` | `clients.client_access_code` | `auth.client_login` |
| `addClient` | `POST clients.list` | `clients`, `client_status_histories` | `client.created` |
| `updateClient` (biodata) | `PATCH clients.detail(id)` | `clients` | `client.updated` |
| toggle layanan | `PUT clients.services(id)` | `client_services` | `client.services_updated` |
| `useClientOutcomeActions.*` | `POST clients.transition(id)` | `clients`, `client_status_histories`, `client_packages`? | `client.admitted` / `…discontinued` |
| simpan link GDrive | `POST clients.gdriveLinks(id)` | `client_documents` | `client.document_added` |
| generate kode kuesioner | `POST clients.assessmentCodes(id)` | `assessment_access_codes` | `assessment_code.issued` |
| submit kuesioner (publik) | `POST publicAssessment.submit(code)` | `assessment_responses/answers/quadrant_scores` | `assessment_response.submitted` |
| CRUD kategori/section/soal | `assessmentCategories.*` | `assessment_categories/sections/questions` | `assessment_category.*` |
| `addSchedule` / `addSchedules` | `POST schedules.list` / `POST schedules.bulkCreate` | `schedules`, `schedule_series` | `schedule.created` / `schedule.series_created` |
| `useSessionActions.saveReport` | `PUT schedules.report(id)` | `session_reports` | `schedule.report_saved` |
| `useSessionActions.completeSession` | `POST schedules.complete(id)` | `schedules`, `client_packages`, `credit_ledger`, `clients` | `schedule.completed` + `credit.used` |
| `useSessionActions.cancelSession` | `POST schedules.cancel(id)` | + `cancel_reasons` | `schedule.cancelled` (+ `credit.cancel_penalty`) |
| `rescheduleSession` / `markPending` / `dropPending` | `schedules.reschedule/markPending/dropPending(id)` | `schedules` | `schedule.rescheduled` / `…marked_pending` / `…pending_dropped` |
| (baru) batalkan completed/cancel | `POST schedules.revert(id)` | `schedules`, `credit_ledger` (reversal) | `schedule.completion_reverted` / `…cancellation_reverted` |
| `bulkComplete` / `bulkCancel` / `bulkReschedule` | `POST schedules.bulkAction(action)` | sama + `batch_id` | `schedule.bulk_*` |
| cek bentrok (preview) | `GET schedules.conflicts` | `schedules`, `therapist_availabilities` | — |
| `issueInvoice` | `POST invoices.list` | `invoices` | `invoice.issued` |
| `uploadPaymentProof` | `POST invoices.proof(id)` (multipart, `api.upload`) | `payment_proofs`, `invoices` | `invoice.proof_uploaded` |
| `verifyPaymentProof` | `POST invoices.verify(id)` | `invoices`, `client_packages`, `credit_ledger` | `invoice.verified` / `invoice.rejected` |
| `renewClientCredit` | `POST clients.renewals(id)` | `invoices`, `client_packages`, `credit_ledger` | `invoice.renewal_created` |
| riwayat kredit | `GET creditLedger` (keyset) | `credit_ledger` | — |
| `addMasterPackage` | `master.packages` | `master_packages` | `package.created` |
| layanan / kuadran | `master.services` / `master.quadrants` | `services` / `sensory_quadrants` | `service.*` / `quadrant.*` |
| `addStaffUser` / `removeStaffUser` | `users.*` | `users` | `user.created` / `user.deleted` |
| `addRole` / `updateRole` / `deleteRole` / `updateRolePermission` | `roles.*`, `roles.permissions(id)` | `roles`, `role_permissions` | `role.*` |
| dashboard revenue / inquiry / schedule / cabang / terapis | `dashboards.*?branchId=&period=` | view `v_daily_revenue` / `v_daily_sessions` / `v_daily_pipeline` / `v_daily_credit_usage` / `v_therapist_sessions` | — |
| timeline audit | `auditLogs.list`, `auditLogs.forEntity(type, id)` | `audit_logs` | — |

## Keputusan yang sudah diambil di `schema.md` v2
Gap antara prototype dan schema v1 sudah diselesaikan (detail `schema.md` §08.2):
- Enum `clients.status` & `schedules.status` mengikuti prototype; **frozen** = turunan `credit_balance = 0`.
- Alasan cancel = lookup table `cancel_reasons` dengan `counts_toward_quota` & `always_penalty` (default perilaku = prototype: kuota 3 per client).
- Laporan sesi → `session_reports` (3 bagian prototype + SOAP opsional).
- Riwayat kredit → `credit_ledger` append-only (+ `reversal`).
- Master layanan & kuadran → `services`, `sensory_quadrants`.

### Pekerjaan frontend saat integrasi
| Item | Perubahan |
|---|---|
| Status invoice | Tampilkan `pending_verification` (setelah ortu upload), `rejected` (+ alasan), `void` |
| Riwayat kredit | Label aksi baru: `purchased`, `reversal`, `manual_adjust` |
| Revert sesi | Tombol "Batalkan completed / cancel" (wajib alasan) di `SessionDetailModal` → `schedules.revert` |
| Timeline audit | Panel riwayat perubahan per client/sesi/invoice (`auditLogs.forEntity`) |
| Upload bukti | Kirim file asli via `api.upload` (multipart), bukan dataURL |

## Urutan migrasi yang disarankan
1. Backend: migration sesuai `schema.md` §09 + seeder master dari `src/domain/*`.
2. Auth: login staf & ortu via Sanctum; `tokenStore`; `setUnauthorizedHandler` → logout + redirect.
3. Ganti store read-only dulu (`therapistsStore`, `masterDataStore`), lalu `clientsStore`, `assessmentsStore`, `schedulesStore`, `creditsStore` — interface value tetap.
4. Ganti isi hook use-case dengan satu mutation per fungsi; invalidasi query terkait.
5. Hapus seed/localStorage untuk domain yang sudah pindah; `usePersistentState` hanya untuk preferensi UI.
