# 07 — Portal Terapis, Portal Ortu, Dashboard & Administrasi

## A. Portal Terapis (`/therapist`, role `therapist`)
Semua data difilter berdasarkan `auth.therapistId`.

| Route | Halaman | Isi |
|---|---|---|
| `/therapist` | `features/therapist/pages/MySchedule.js` | Jadwal milik terapis. View `week` (`WeeklyCalendar`) atau `day` (`DayAgenda`, default di layar < 768px). Filter per client. Klik sesi → `SessionDetailModal`; terapis hanya bisa **menyimpan laporan**, tidak bisa mengubah status. Ada link ke detail client & hasil asesmen |
| `/therapist/summary` | `TherapistSummary.js` + `summary/*` | Rekap sesi `completed`: `SummaryStats`, `SessionFeed`, `ClientRollup`. Filter periode, client, dan status laporan (`pending` / `filled` = 3/3 bagian terisi). Edit laporan → `features/therapist/components/SessionReportModal.js`. Riwayat per client → `ClientReportHistoryDrawer.js` |
| `/therapist/clients/:id` | `TherapistClientDetail.js` | Profil client, riwayat sesi & laporan, link hasil asesmen, tombol cetak ke `/print/client/:id` |
| `/therapist/parent-assessment/:id` | `features/assessment/pages/ParentAssessmentView.js` | Hasil kuesioner + kuadran (lihat 04) |

**Laporan sesi 3 bagian** (disimpan di schedule): `activitySection` (aktivitas), `noteSection` (catatan klinis/SOAP, disalin juga ke `progressNote`), dan `homeworkSection` (PR di rumah). `SessionReportModal` menyediakan template teks cepat. Laporan bisa diisi kapan saja, tidak harus menunggu sesi completed.

## B. Portal Orang Tua (`/client`, role `client`)
`features/parent/pages/ClientDashboard.js`, data milik `auth.clientId`.
- Kartu tagihan: invoice terbaru + status. **Upload bukti transfer** (drag & drop, gambar/PDF) → lihat 06.
- Sisa kredit total + per paket (`remainingCredit / totalCredit`).
- Riwayat terapi: **hanya sesi `completed`** yang ditampilkan ke ortu. Filter tanggal "Dari–Sampai" (`DateFilterPicker`, logika `filterSessionsByDate` di `domain/schedule.js`) + reset; list dibatasi tinggi `min(520px, 60vh)` dan bisa di-scroll, dengan pagination (`usePagination`/`TablePagination`, 10/20/50 per halaman; list kembali ke atas saat ganti halaman). Klik "View Report" → modal laporan (activity / note / homework).
- Login dengan `clientAccessCode` di `/roles` atau `/login`.
- Target utama: **mobile** (ortu membuka dari HP).

## C. Dashboard eksekutif
| Route | Role | Halaman | Isi |
|---|---|---|---|
| `/master/revenue`, `/manager/revenue` | master, manager | `features/master/pages/DashboardRevenue.js` | Omzet dari invoice `paid` per cabang & periode, tren, breakdown paket. Manager terkunci ke cabangnya |
| `/master/branch-performance` | master | `BranchPerformance.js` | Perbandingan performa intake/pipeline antar cabang (recharts) |
| `/admin-inquiry` | lihat 04 | `DashboardInquiry.js` | KPI funnel inquiry |
| `/admin-schedule` | lihat 05 | `DashboardSchedule.js` | KPI sesi & client aktif |

Pola dashboard:
- Filter periode memakai `shared/components/PeriodFilter.js` + `makePeriodMatcher(preset, start, end)` dari `shared/lib/periods.js`.
- Filter cabang memakai pola scoping (02) + `shared/components/BranchFilter.js`.
- Angka KPI ditampilkan dengan `shared/components/StatCard.js`. Chart memakai `recharts` (chunk `vendor-charts`, jadi halaman chart di-lazy).
- Semua angka **dihitung on-the-fly** di `useMemo` dari context. Tidak ada data agregat yang disimpan.

## D. Administrasi (Master)
| Route | Halaman | Aksi → `authStore` |
|---|---|---|
| `/master/users` | `UserManagement.js` | Tambah/hapus akun staf (`addStaffUser`, `removeStaffUser`). Data `staffUsers` dipakai di `/login` |
| `/master/audit-logs`, `/manager/audit-logs` | `features/audit/pages/AuditLogs.js` | Lihat bagian F |
| `/master/rbac` | `RoleModuleAccess.js` | Matriks role × modul (`updateRolePermission`), tambah/ubah/hapus role kustom (`addRole`, `updateRole`, `deleteRole`). Role sistem (`isSystem`) tidak bisa dihapus |

## F. Audit Logs (`/master/audit-logs`, `/manager/audit-logs`, modul RBAC `audit_logs`)
Jejak seluruh aksi perubahan data. Default akses: **master & manager** (ubah di `/master/rbac`; role kustom bisa diberi modul ini).

| Bagian | Isi |
|---|---|
| Data | `stores/auditStore.js` (key `audit_logs`, append-only, maks. 2000 entri). Dummy dibuat `data/auditSeed.js` dari seed lain: sesi completed/cancel/reschedule/pending, laporan sesi, invoice & verifikasi, intake/admit/discharge, kuesioner ortu, login, login gagal, aksi global Master, serta contoh **completed lalu dibatalkan** & **cancel yang ditarik kembali** per cabang (45 hari terakhir) |
| Pencatatan aksi nyata (demo) | `useAuditLogger().record()` (`features/audit`) dipanggil `useSessionActions` (complete, cancel, reschedule, pending, drop, laporan, bulk) & `useClientOutcomeActions` (admit, done, discontinue). Satu aksi user = satu `batchId` |
| Per cabang | Pola `defaultBranch`: manager terkunci ke cabangnya (log global tidak terlihat); master bisa pilih cabang / semua (termasuk log global tanpa cabang). `auditInBranch` di `domain/audit.js` |
| Filter (di URL) | pencarian (pelaku/objek/alasan), cabang, periode (default 7 hari), kategori (`AUDIT_CATEGORIES`), role pelaku |
| Tampilan | 4 StatCard (total, dibatalkan, berisiko, pelaku aktif), tabel (stack di mobile) dengan badge aksi per tone, penanda "Sudah dibatalkan"/"Membatalkan aksi"/"batch", ringkasan perubahan lama → baru |
| Detail | `AuditDetailSheet`: pelaku, objek, client, alasan, tabel perubahan, meta, rantai pembatalan (lompat ke log asal/pembatal), entri lain dalam batch, IP & perangkat |
| Katalog aksi | `AUDIT_ACTIONS` di `domain/audit.js` (selaras `schema.md` §05.4) |
| Fase API | Store diganti `GET ENDPOINTS.auditLogs.list` (keyset); `useAuditLogger` tidak dipakai lagi karena backend menulis `audit_logs` di transaksi yang sama |

## E. Halaman publik / pendukung
| Route | Halaman |
|---|---|
| `/` | `Welcome.js`: pemilih portal |
| `/landing`, `/home` | `Home.js` + `features/landing/components/*` (Hero, Programs, Team, Branches, WhyUs, Knowledge, Contact, Footer). Konten dari `features/landing/data/landingData.js` |
| `/assessment` | `AssessmentFill.js` (lihat 04) |
| `/print/client/:id` | `features/therapist/pages/PrintClientReport.js`: laporan cetak client (route mandiri tanpa `AppLayout`, untuk semua role staf; `STANDALONE_ROUTES` di `app/router/routes.js`) |

## File terkait
`frontend/src/features/therapist/pages/`, `frontend/src/features/therapist/components/`, `frontend/src/features/parent/pages/`, `frontend/src/features/master/pages/`, `frontend/src/shared/lib/periods.js`, `frontend/src/shared/components/`
