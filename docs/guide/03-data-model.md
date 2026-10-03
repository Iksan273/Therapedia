# 03 — Data Model (localStorage) & Mapping ke `schema.md`

> Keputusan klien 3 Okt 2026 yang menyentuh dokumen ini sudah diimplementasi di frontend; register keputusan + status: [12-keputusan-klien.md](12-keputusan-klien.md).

Semua key disimpan dengan prefix `therapedia_v5_`. Field bertanda *opsional* bisa tidak ada di data lama, jadi selalu akses dengan fallback (`?.`, `|| []`).

## Ringkasan key
Store ada di `frontend/src/stores/`. I/O localStorage hanya lewat `services/storage/localStore.js`.

| Key | Store | Bentuk | Tabel target (`schema.md` v2) |
|---|---|---|---|
| `clients` | `clientsStore` | `Client[]` | `clients`, `client_services`, `client_documents`, `assessment_access_codes`, `assessment_responses`, `assessment_answers` |
| `schedules` | `schedulesStore` | `Schedule[]` | `schedules`, `schedule_series`, `session_reports` |
| `credits` | `creditsStore` | `{ masterPackages, records, invoices, renewals }` (invoice terhapus tidak diekspos) | `master_packages`, `client_packages`, `credit_ledger`, `invoices`, `payment_proofs` |
| `therapists` | `therapistsStore` | `Therapist[]` (read-only) | `users` (role therapist) |
| `assessment_categories` | `assessmentsStore` | `Category[]` | `assessment_categories`, `assessment_sections`, `assessment_questions` |
| `master_services` | `masterDataStore` | `Service[]` (key `value`) | `services` |
| `master_quadrants` | `masterDataStore` | `Quadrant[]` (key `code`) | `sensory_quadrants` |
| `master_cancel_reasons` | `masterDataStore` | `{ value, label, active }[]` (pilihan cepat) | `cancel_reasons` (tanpa FK) |
| `master_discharge_reasons` | `masterDataStore` | `{ value, label, active }[]` (pilihan cepat) | `discharge_reasons` (tanpa FK) |
| `auth`, `activeBranch`, `staffUsers`, `rolesList` (+ `canDelete`), `rbacPermissions`, `passwordResets` | `authStore` | lihat 02 |
| `holidays` | `holidaysStore` | `{ id, date, name, branchId \| null }[]` | `holidays` | `users`, `roles`, `role_permissions`, `access_modules`, `branches` |
| `audit_logs` | `auditStore` | `AuditEntry[]` (terbaru dulu, append-only) | `audit_logs` |
| `therapedia_seed_version` (tanpa prefix) | `data/seedRegistry.js` | string | — |

## Client (`clients[]`)
Dibuat oleh `makeInquiryClient(form)` di `domain/client.js`.

| Field | Tipe | Catatan |
|---|---|---|
| `id` | string | `uid()`; seed memakai `c-001` dst. |
| `branchId` | string | id cabang |
| `status` | enum | lihat **Status client** |
| `clientName`, `gender`, `dob` | string | `clientName` = nama lengkap (tanpa nama panggilan); `dob` = `yyyy-MM-dd` |
| `parentName`, `parentContact`, `parentEmail` | string | `parentContact` = nomor WhatsApp |
| `clientCode` | string | **Kode client** `AE-00001`: grup 2 huruf dari huruf pertama nama (A–E=AE, F–J=FJ, K–O=KO, P–T=PT, U–Z=UZ) + 5 digit counter per grup (`nextClientCode`, `domain/client.js`; tidak berubah walau nama diedit). Juga kode login portal ortu (fase API: kode + tanggal lahir anak). Dulu `clientAccessCode` `TDC-XXXX` |
| `serviceTypes` | string[] | layanan terpilih (multi). **Pakai `getClientServiceIds(client)`** |
| `serviceType` | string | legacy single = `serviceTypes[0]` |
| `assessmentCodes` | `{ code, categoryId, name/categoryName, createdAt, issuedAt, expiresAt?, status? }[]` | kode kuesioner `{typeCode kategori}-{6 acak}` (`buildQuestionnaireCode`, `domain/assessment.js`; kode seed lama `ASM-xxxx` tetap valid). `expiresAt` **opsional** (null = tanpa masa berlaku), dicek saat kode dibuka |
| `assessmentAnswers` | `{ categoryId, categoryName, submittedAt?, consentAt?, answers: Answer[] }[]` | satu entry per pengisian. **Hanya sekali isi** per kode (tanpa submit ulang); `consentAt` = waktu persetujuan |
| `Answer` | `{ questionId, itemNo, quadrant, domain, question, answer, score }` | `score` diambil dari angka di awal jawaban |
| `intakeNote` | string \| null | catatan saat intake (input di New Intake / Edit Intake; tampil di Client Detail, portal terapis, dan laporan cetak) |
| `gdriveClientLink` | string \| null | |
| `finalOutcome` | enum \| null | `admitted` / `done_consult` / `done_assessment` / `discontinued` |
| `dateOfJoin`, `dateOfDischarge`, `dateOfDiscontinue` | `yyyy-MM-dd` \| null | `dateOfDiscontinue` = tanggal discontinue (field sendiri) |
| `dischargeReason`, `dischargeNote` | string \| null | reason = **string bebas**: `value` pilihan cepat (Master Data) atau teks yang diketik user ("Lainnya"); tanpa relasi/FK |
| `createdAt`, `updatedAt` | ISO | `updateClient` otomatis set `updatedAt` |

**Status client** (`PIPELINE_STATUSES` + `discharged`):
`inquiry` → `service_selected` → `assessment_scheduled` → `assessment_done` → `admitted` | `done_consult` | `done_assessment` | `discontinued`. Client `admitted` bisa menjadi `discharged`; `discharged`/`discontinued` bisa diaktifkan kembali menjadi `admitted` (`client.reactivated`). Kolom pipeline inquiry memuat `discharged`.
Transisi otomatis hanya maju lewat `advanceStatus(current, target)` (`domain/client.js`, urutan `PIPELINE_FLOW`). Perubahan **manual** boleh ke tahap mana pun (`buildStatusChangePatch`, `useClientOutcomeActions().changeStatus`). Client juga bisa di-**soft delete** (`deletedAt`/`deletedBy`; store tidak menampilkannya).
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
| `cancelReason` | string \| null | **string bebas**: `value` pilihan cepat (Master Data), teks custom, atau `RESCHEDULE_DROPPED` (alasan sistem); `pendingReason` sama |
| `notes` | string \| null | |
| `activitySection`, `noteSection`, `homeworkSection` | string | laporan sesi 3 bagian (Activity / SOAP note / Homework) |
| `progressNote` | string | duplikat `noteSection` (legacy sync) |
| `reportUpdatedAt` | ISO | |
| `rescheduledFrom` `{date,startTime,endTime,therapistId}`, `rescheduledAt` | | jejak slot asal (lihat `scheduleSlot()`) |
| `pendingFrom`, `pendingAt`, `pendingReason`, `pendingNote` | | hanya saat `reschedule_pending` |
| `previousStatus` | string \| null | status sebelum transisi terakhir (complete/cancel/pending/drop); dipakai revert. Data lama tanpa field ini → `restoreStatusOf` |
| `rescheduledPrev` `{date,startTime,endTime,therapistId}` | | slot tepat sebelum reschedule terakhir (target revert; `rescheduledFrom` = jadwal asal pertama) |
| `revertedAt` | ISO \| null | terisi saat revert; **revert hanya 1x** (diblokir bila terisi, dikosongkan transisi berikutnya) |
| `deletedAt`, `deletedBy` | | soft delete sesi |

## Credits (`credits`)
```
credits = {
  masterPackages: [{ id, invoiceCode /*kode di nomor invoice*/, name, credits, price, description }],
  records: [{
    id, clientId, branchId,
    packages: [{ id /*cp-...*/, packageId /*pkg-...*/, packageName, price /*snapshot harga*/, totalCredit, remainingCredit, cancelCount /*kuota cancel PER PAKET*/, status /*active|depleted*/ }],
    history:  [{ id, date, scheduleId, packageId, packageName, action, creditChange, cancelReason?, reversesId?, note }]   // action: renewed | used | cancel_excused | cancel_penalty | reversal (reversesId → id baris asal)
  }],
  invoices: [{ id, type /*package|assessment*/, typeCode, invoiceNumber /*INV-{KODE}-{YYYYMMDD}-{NNN}*/, clientId, clientName, branchId, packageId, packageName, credits /*snapshot*/, amount, status /*unpaid|paid*/,
               proofUrl, proofOfPaymentUrl, proofFileName, proofFileType, proofFileSize, proofUploadedAt, proofUploadCount /*maks 4*/, createdAt, issuedAt?, paidAt, deletedAt?, deletedBy? }],
  renewals: []   // belum dipakai
}
```
- `history.action`: `used` (−1), `cancel_excused` (0), `cancel_penalty` (−1), `renewed` (+N).
- Satu client punya **satu record** dan **banyak paket**. Sisa kredit total = jumlah `remainingCredit` semua paket (`summarizeCreditRecord` di `domain/credit.js`, dipakai `getRecordForClient`; juga memberi `cancelCount` / `cancelQuota` (= 3) dari paket yang sedang dipakai, `activePackageOf`).
- Aturan mutasi (pure, ber-test): `applySessionCompleted`, `applySessionCancelled` (`deductCredit`), `applySessionReverted`, `findLiveSessionEntry`, `applyPackageAdded`, `newClientPackage`, `newCreditRecord`, `nextInvoiceNumber`, `invoiceType`, `packageInvoiceCode`, `validateProofFile`, `canUploadProof` di `domain/credit.js`.
- **Frozen** = sisa kredit total 0. Ini status turunan (tidak disimpan), ditampilkan di kalender dan detail client.

## Audit log (`audit_logs[]`)
`{ id, occurredAt, batchId, actorType /*user|client|public|system*/, actorId, actorName, actorRole, branchId /*null = global*/, action /*entity.verb*/, entityType, entityId, entityLabel, subjectType, subjectId, subjectLabel, oldValues, newValues, meta, reason, revertsAuditId, source, ipAddress, userAgent }` — sama dengan kolom `audit_logs` di `schema.md` §05 (camelCase). Backend hanya mencatat modul schedule & finance (`schema.md` §05.4); `actorType` `public` tidak dipakai di backend.

## Therapist (`therapists[]`)
`{ id /*t-001*/, name, specialty, branchId }`
Akun login terapis ada di `staffUsers` (`authStore`, seed `data/staffUsers.seed.json`) dan dihubungkan lewat `therapistId`. `staffUsers[]`: `{ id, name, email, role, branchId /*wajib kecuali master*/, password, mustChangePassword, isActive, passwordChangedAt? }`; permintaan OTP lupa password di key `passwordResets` (mode demo).

## Assessment category (`assessment_categories[]`)
`{ id, typeCode /*awalan kode kuesioner, unik*/, categoryName, domain, standardTitle, author, scoringKey: { "0": label, … "5": label }, sections: [{ sectionId, title, leadText, questions: [{ id, itemNo, quadrant, question, type?, options? }] }] }`
Kategori lama mungkin memakai `questions[]` langsung tanpa `sections`. `AssessmentFill` menangani kedua bentuk ini.

## Master data
- **Service** `{ value, label, shortLabel, fullLabel, category /*Asesmen|Konsultasi*/, description, active }`. Seed dari `INTAKE_SERVICES`. Pakai `activeServices` untuk form, `getService(value)` untuk label.
- **Quadrant** `{ code /*AV|SN|RG|SK*/, title, fullName, description, color }`. Warna dari `QUADRANT_COLORS`.

## Konstanta & aturan (sumber kebenaran, semua di `frontend/src/`)
| Modul | Isi |
|---|---|
| `domain/branch.js` | `BRANCHES`, `branchName` |
| `domain/status.js` | `STATUS_META` (label + kelas warna semua status) |
| `domain/client.js` | `PIPELINE_STATUSES`, `PIPELINE_FLOW`, `advanceStatus`, `nextClientCode`, `clientCodeGroup`, `matchesClientSearch`, `buildStatusChangePatch`, `INTAKE_SERVICES` (+ alias legacy), `DEFAULT_DISCHARGE_REASONS` (seed pilihan cepat), `dischargeReasonLabel(value, list?)`, `makeInquiryClient`, `getClientServiceIds`, roster: `isActiveClient`, `isRosterClient`, `canReactivateClient`, `matchesRosterStatus`, `ROSTER_STATUS_FILTERS`, `buildActivationPatch` |
| `domain/schedule.js` | `deriveRecurringRoutines`, `upcomingActiveSessions`, `reportFilledCount`, `isReportEmpty`, `isUnreportedSession`, `getPrevSlot`, `DEFAULT_CANCEL_REASONS` (seed pilihan cepat), `RESCHEDULE_DROPPED`, `SYSTEM_CANCEL_REASONS`, `cancelReasonLabel(val, list?)`, `isCreditNeutralCancel`, `scheduleSlot`, `getOriginSlot`, `buildReportPatch`, `CLEAR_PENDING_PATCH`, `CALENDAR_DAYS`, `CALENDAR_HOURS`, `TIME_OPTIONS`, `WEEKDAY_OPTIONS`, `timeToMin`, `rangesOverlap`, `checkConflicts`, `findTherapistClashIds`, `buildRecurringSchedules`, `SCHEDULE_MANAGER_ROLES`, `canManageSchedule`, `canRevertSession`, `restoreStatusOf` |
| `domain/credit.js` | `DEFAULT_MASTER_PACKAGES`, `formatPackageName`, `CANCEL_QUOTA` + aturan mutasi kredit (lihat di atas) |
| `domain/rbac.js` | `ACCESS_MODULES`, `DEFAULT_ROLES`, `DEFAULT_PERMISSIONS`, `SYSTEM_ROLE_IDS`, `isSystemRole`, `roleHasPermission`, `withDefaultPermissions`, `roleCanDelete`, `canDeleteIn`, `DEFAULT_CAN_DELETE` |
| `domain/assessment.js` | `buildQuestionnaireCode`, `categoryTypeCode`, `normalizeTypeCode`, `isTypeCodeTaken`, `CODE_VALIDITY_OPTIONS`, `buildExpiresAt`, `isQuestionnaireCodeExpired`, `hasPendingAssessmentInvoice`, `checkQuestionnaireAccess` |
| `domain/auth.js` | `DEMO_PASSWORD`, `validateNewPassword`, OTP (`generateOtp`, `makeOtpRequest`, `verifyOtp`), `checkStaffCredentials`, `validateStaffBranch` |
| `domain/holiday.js` | `DEFAULT_HOLIDAYS`, `makeHoliday`, `findHoliday`, `isHoliday`, `holidayDateSet`, `validateHoliday` |
| `domain/audit.js` | `AUDIT_CATEGORIES`, `AUDIT_ACTIONS`, `auditActionMeta`, `auditCategoryLabel`, `buildAuditEntry`, `auditChanges`, `indexReverts`, `auditInBranch`, `newAuditBatchId` |
| `shared/lib/id.js` | `uid`, `nowIso`, `todayStr` |
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
| `clients[].assessmentAnswers[]` | `assessment_responses` (sekali isi, `consent_at`) + `assessment_answers` + `assessment_quadrant_scores` | skor kuadran dihitung server |
| perubahan status client | `client_status_histories` (tanpa `audit_logs`) | frontend belum menyimpan histori; backend wajib |
| `schedules[].date/startTime/endTime` | `schedules.session_date/start_time/end_time` | |
| `schedules[].rescheduledFrom` | `schedules.origin_*` | |
| `schedules[].activitySection/noteSection/homeworkSection` | `session_reports` | |
| `credits.records[].packages[]` | `client_packages` | |
| `credits.records[].history[]` | `credit_ledger` (append-only) | |
| `credits.records[].cancelCountTotal` (lama) → `packages[].cancelCount` | `client_packages.cancel_count` (kuota 3 per paket) | |
| `therapists[]` + `staffUsers[]` | `users` | |
| camelCase | snake_case | dikonversi otomatis oleh `services/http/httpClient.js` |
