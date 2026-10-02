# 03 — Data Model (localStorage) & Mapping ke `schema.md`

Semua key disimpan dengan prefix `therapedia_v5_`. Field bertanda *opsional* bisa tidak ada di data lama, jadi selalu akses dengan fallback (`?.`, `|| []`).

## Ringkasan key
Store ada di `frontend/src/stores/`. I/O localStorage hanya lewat `services/storage/localStore.js`.

| Key | Store | Bentuk | Tabel target (`schema.md` v2) |
|---|---|---|---|
| `clients` | `clientsStore` | `Client[]` | `clients`, `client_services`, `client_documents`, `client_notes`, `assessment_access_codes`, `assessment_responses`, `assessment_answers` |
| `schedules` | `schedulesStore` | `Schedule[]` | `schedules`, `schedule_series`, `session_reports` |
| `credits` | `creditsStore` | `{ masterPackages, records, invoices, renewals }` | `master_packages`, `client_packages`, `credit_ledger`, `invoices`, `payment_proofs` |
| `therapists` | `therapistsStore` | `Therapist[]` (read-only) | `users` (role therapist) + `therapist_availabilities` |
| `assessment_categories` | `assessmentsStore` | `Category[]` | `assessment_categories`, `assessment_sections`, `assessment_questions` |
| `master_services` | `masterDataStore` | `Service[]` (key `value`) | `services` |
| `master_quadrants` | `masterDataStore` | `Quadrant[]` (key `code`) | `sensory_quadrants` |
| `auth`, `activeBranch`, `staffUsers`, `rolesList`, `rbacPermissions` | `authStore` | lihat 02 | `users`, `roles`, `role_permissions`, `access_modules`, `branches` |
| `audit_logs` | `auditStore` | `AuditEntry[]` (terbaru dulu, append-only) | `audit_logs` |
| `therapedia_seed_version` (tanpa prefix) | `data/seedRegistry.js` | string | — |

## Client (`clients[]`)
Dibuat oleh `makeInquiryClient(form)` di `domain/client.js`.

| Field | Tipe | Catatan |
|---|---|---|
| `id` | string | `uid()`; seed memakai `c-001` dst. |
| `branchId` | string | id cabang |
| `status` | enum | lihat **Status client** |
| `clientName`, `gender`, `dob` | string | `dob` = `yyyy-MM-dd` |
| `parentName`, `parentContact`, `parentEmail` | string | `parentContact` = nomor WhatsApp |
| `clientAccessCode` | string | `TDC-XXXX`, dipakai login portal ortu |
| `serviceTypes` | string[] | layanan terpilih (multi). **Pakai `getClientServiceIds(client)`** |
| `serviceType` | string | legacy single = `serviceTypes[0]` |
| `includesSchoolCompanion` | bool | *opsional* |
| `assessmentCodes` | `{ code, categoryId, name/categoryName, createdAt, status? }[]` | kode kuesioner `ASM-XXXX` |
| `assessmentAnswers` | `{ categoryId, categoryName, submittedAt?, answers: Answer[] }[]` | satu entry per kategori (submit ulang = replace) |
| `Answer` | `{ questionId, itemNo, quadrant, domain, question, answer, score }` | `score` diambil dari angka di awal jawaban |
| `assessmentReportNote` | string \| null | |
| `gdriveClientLink` | string \| null | |
| `finalOutcome` | enum \| null | `admitted` / `done_consult` / `done_assessment` / `discontinued` |
| `dateOfJoin`, `dateOfDischarge` | `yyyy-MM-dd` \| null | |
| `dischargeReason`, `dischargeNote` | string \| null | reason = `DISCHARGE_REASONS[].value` |
| `createdAt`, `updatedAt` | ISO | `updateClient` otomatis set `updatedAt` |

**Status client** (`PIPELINE_STATUSES` + `discharged`):
`inquiry` → `service_selected` → `assessment_scheduled` → `assessment_done` → `admitted` | `done_consult` | `done_assessment` | `discontinued`. Client `admitted` bisa menjadi `discharged`.
Transisi otomatis hanya maju lewat `advanceStatus(current, target)` (`domain/client.js`, urutan `PIPELINE_FLOW`).
Label & kelas warna: `STATUS_META` di `domain/status.js`.

## Schedule (`schedules[]`)
| Field | Tipe | Catatan |
|---|---|---|
| `id`, `clientId`, `therapistId`, `branchId` | string | |
| `type` | `therapy` \| `assessment` | hanya `therapy` yang memotong kredit |
| `serviceType` | string | *opsional* |
| `date` | `yyyy-MM-dd` | |
| `startTime`, `endTime` | `HH:mm` | jam kalender 08:00–17:00 (`CALENDAR_HOURS`) |
| `status` | enum | `scheduled`, `completed`, `cancelled`, `rescheduled`, `reschedule_pending` |
| `creditPackageId` | string \| null | id item paket di `credits.records[].packages[]` |
| `isRecurring`, `recurrenceRule` | bool, string | `none`, `weekly`, `weekly_Monday,Thursday`, `single_week` |
| `cancelReason` | string \| null | `CANCEL_REASONS[].value` atau `RESCHEDULE_DROPPED` |
| `notes` | string \| null | |
| `activitySection`, `noteSection`, `homeworkSection` | string | laporan sesi 3 bagian (Activity / SOAP note / Homework) |
| `progressNote` | string | duplikat `noteSection` (legacy sync) |
| `reportUpdatedAt` | ISO | |
| `rescheduledFrom` `{date,startTime,endTime,therapistId}`, `rescheduledAt` | | jejak slot asal (lihat `scheduleSlot()`) |
| `pendingFrom`, `pendingAt`, `pendingReason`, `pendingNote` | | hanya saat `reschedule_pending` |

## Credits (`credits`)
```
credits = {
  masterPackages: [{ id, name, credits, price, description }],
  records: [{
    id, clientId, branchId, cancelCountTotal,
    packages: [{ id /*cp-...*/, packageId /*pkg-...*/, packageName, totalCredit, remainingCredit, cancelCount, status /*active|depleted*/ }],
    history:  [{ id, date, scheduleId, packageId, packageName, action, creditChange, cancelReason?, note }]
  }],
  invoices: [{ id, invoiceNumber, clientId, clientName, branchId, packageId, packageName, amount, status /*unpaid|paid*/,
               proofUrl, proofOfPaymentUrl, proofFileName, proofFileType, proofFileSize, proofUploadedAt, createdAt, issuedAt?, paidAt }],
  renewals: []   // belum dipakai
}
```
- `history.action`: `used` (−1), `cancel_excused` (0), `cancel_penalty` (−1), `renewed` (+N).
- Satu client punya **satu record** dan **banyak paket**. Sisa kredit total = jumlah `remainingCredit` semua paket (`summarizeCreditRecord` di `domain/credit.js`, dipakai `getRecordForClient`; juga memberi `leaveQuota: CANCEL_QUOTA` = 3).
- Aturan mutasi (pure, ber-test): `applySessionCompleted`, `applySessionCancelled`, `applyPackageAdded`, `newClientPackage`, `newCreditRecord`, `nextInvoiceNumber` di `domain/credit.js`.
- **Frozen** = sisa kredit total 0. Ini status turunan (tidak disimpan), ditampilkan di kalender dan detail client.

## Audit log (`audit_logs[]`)
`{ id, occurredAt, batchId, actorType /*user|client|public|system*/, actorId, actorName, actorRole, branchId /*null = global*/, action /*entity.verb*/, entityType, entityId, entityLabel, subjectType, subjectId, subjectLabel, oldValues, newValues, meta, reason, revertsAuditId, source, ipAddress, userAgent }` — sama dengan kolom `audit_logs` di `schema.md` §05 (camelCase).

## Therapist (`therapists[]`)
`{ id /*t-001*/, name, specialty, branchId, availableSlots: [{ day /*Monday..*/, startTime, endTime }] }`
Akun login terapis ada di `staffUsers` (`authStore`, seed `data/staffUsers.seed.json`) dan dihubungkan lewat `therapistId`.

## Assessment category (`assessment_categories[]`)
`{ id, categoryName, domain, standardTitle, author, scoringKey: { "0": label, … "5": label }, sections: [{ sectionId, title, leadText, questions: [{ id, itemNo, quadrant, question, type?, options? }] }] }`
Kategori lama mungkin memakai `questions[]` langsung tanpa `sections`. `AssessmentFill` menangani kedua bentuk ini.

## Master data
- **Service** `{ value, label, shortLabel, fullLabel, category /*Asesmen|Konsultasi*/, description, active }`. Seed dari `INTAKE_SERVICES`. Pakai `activeServices` untuk form, `getService(value)` untuk label.
- **Quadrant** `{ code /*AV|SN|RG|SK*/, title, fullName, description, color }`. Warna dari `QUADRANT_COLORS`.

## Konstanta & aturan (sumber kebenaran, semua di `frontend/src/`)
| Modul | Isi |
|---|---|
| `domain/branch.js` | `BRANCHES`, `branchName` |
| `domain/status.js` | `STATUS_META` (label + kelas warna semua status) |
| `domain/client.js` | `PIPELINE_STATUSES`, `PIPELINE_FLOW`, `advanceStatus`, `CONCERN_TAGS`, `INTAKE_SERVICES` (+ alias legacy), `DISCHARGE_REASONS`, `dischargeReasonLabel`, `makeInquiryClient`, `getClientServiceIds` |
| `domain/schedule.js` | `CANCEL_REASONS`, `RESCHEDULE_DROPPED`, `SYSTEM_CANCEL_REASONS`, `cancelReasonLabel`, `isCreditNeutralCancel`, `scheduleSlot`, `getOriginSlot`, `buildReportPatch`, `CLEAR_PENDING_PATCH`, `CALENDAR_DAYS`, `CALENDAR_HOURS`, `TIME_OPTIONS`, `WEEKDAY_OPTIONS`, `timeToMin`, `rangesOverlap`, `checkConflicts`, `buildRecurringSchedules`, `SCHEDULE_MANAGER_ROLES`, `canManageSchedule` |
| `domain/credit.js` | `DEFAULT_MASTER_PACKAGES`, `formatPackageName`, `CANCEL_QUOTA` + aturan mutasi kredit (lihat di atas) |
| `domain/rbac.js` | `ACCESS_MODULES`, `DEFAULT_ROLES`, `DEFAULT_PERMISSIONS`, `SYSTEM_ROLE_IDS`, `isSystemRole`, `roleHasPermission`, `withDefaultPermissions` |
| `domain/audit.js` | `AUDIT_CATEGORIES`, `AUDIT_ACTIONS`, `auditActionMeta`, `auditCategoryLabel`, `buildAuditEntry`, `auditChanges`, `indexReverts`, `auditInBranch`, `newAuditBatchId` |
| `shared/lib/id.js` | `uid`, `nowIso`, `todayStr`, `genCode` |
| `shared/lib/format.js` | `fmtDate`, `formatDdMmYyyy`, `parseDdMmYyyy`, `calcAge`, `calcAgeDetailed`, `fmtCurrency` |
| `shared/lib/periods.js` | `PERIOD_OPTIONS`, `periodLabel`, `makePeriodMatcher` |
| `shared/lib/caseConverter.js` | `keysToSnake`, `keysToCamel` (dipakai httpClient) |

## Mapping nama field frontend → `schema.md` v2
Tabel lengkap ada di `schema.md` bagian 08. Yang paling sering dipakai:

| Frontend | Database | Catatan |
|---|---|---|
| `clients[].clientName` / `dob` | `clients.child_name` / `date_of_birth` | |
| `clients[].parentContact` / `parentEmail` | `clients.parent_phone` / `parent_email` | |
| `clients[].status` | `clients.status` | enum v2 = 9 status prototype (sudah selaras) |
| `clients[].serviceTypes[]` | `client_services` | |
| `clients[].gdriveClientLink` | `client_documents` (`type=gdrive_folder`) | |
| `clients[].assessmentAnswers[]` | `assessment_responses` (+ revisi) + `assessment_answers` + `assessment_quadrant_scores` | skor kuadran dihitung server |
| perubahan status client | `client_status_histories` + `audit_logs` | frontend belum menyimpan log; backend wajib |
| `schedules[].date/startTime/endTime` | `schedules.session_date/start_time/end_time` | |
| `schedules[].rescheduledFrom` | `schedules.origin_*` | |
| `schedules[].activitySection/noteSection/homeworkSection` | `session_reports` | |
| `credits.records[].packages[]` | `client_packages` | |
| `credits.records[].history[]` | `credit_ledger` (append-only) | |
| `credits.records[].cancelCountTotal` | `clients.cancel_count_total` | |
| `therapists[]` + `staffUsers[]` | `users` (+ `therapist_availabilities`) | |
| camelCase | snake_case | dikonversi otomatis oleh `services/http/httpClient.js` |
