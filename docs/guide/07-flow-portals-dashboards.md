# 07 — Portal Terapis, Portal Ortu, Dashboard & Administrasi

> Keputusan klien 3 Okt 2026 yang menyentuh dokumen ini sudah diimplementasi di frontend; register keputusan + status: [12-keputusan-klien.md](12-keputusan-klien.md).

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
- Kartu tagihan: invoice **Paket Sesi** terbaru + status. **Upload bukti transfer** (drag & drop, JPG/PNG/PDF ≤ 5 MB, re-upload maks 3x) → lihat 06.
- Sisa kredit total + per paket (`remainingCredit / totalCredit`).
- Kartu **Kuesioner Asesmen Ananda**: daftar kode kuesioner yang belum diisi (nama, kode, masa berlaku opsional). Tombol "Isi Kuesioner" membuka `/assessment?code=...` (kode terisi otomatis). Tombol **terkunci** bila ada **invoice Assessment belum lunas** (kartu menampilkan invoice-nya + tombol upload bukti) atau kode **kedaluwarsa**. Kuesioner hanya bisa diisi sekali.
- Riwayat terapi: **hanya sesi `completed`**. Tombol **View Report nonaktif** bila laporan belum diisi terapis (`isReportEmpty`: label "Laporan belum tersedia"); modal laporan tidak lagi memakai teks placeholder. **Export laporan** per sesi dan "Export Laporan" (sesuai filter) membuka dokumen cetak (`shared/lib/reportExport.js`, simpan sebagai PDF lewat dialog cetak). Filter tanggal "Dari–Sampai" (`DateFilterPicker`, `filterSessionsByDate`) + reset; list dibatasi tinggi `min(520px, 60vh)`, pagination 10/20/50.
- Login dengan **kode client** (`clientCode`, mis. `AE-00006`) di `/roles` atau `/login` (demo; backend: kode + tanggal lahir anak).
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
| `/master/users` | `UserManagement.js` | Tambah akun staf dengan **password sementara** (wajib ganti saat login pertama; non-master wajib 1 cabang), **reset password** oleh Master (`resetStaffPassword`), **nonaktifkan/aktifkan** staf (`setStaffActive`; tidak dihapus). Data `staffUsers` dipakai di `/login` (email + password, `domain/auth.js`). Lupa password: dialog OTP email di `/login` (`requestPasswordOtp`, `resetPasswordWithOtp`; di demo email disimulasikan, OTP tampil di layar) |
| `/master/audit-logs`, `/manager/audit-logs` | `features/audit/pages/AuditLogs.js` | Lihat bagian F |
| `/master/rbac` | `RoleModuleAccess.js` | Matriks role × modul (`updateRolePermission`) + baris **"Boleh menghapus data"** per role (`setRoleCanDelete`; tombol hapus di semua modul hanya tampil bila role punya flag + akses modul), tambah/ubah/hapus role kustom (`addRole`, `updateRole`, `deleteRole`). Role sistem (`isSystem`) tidak bisa dihapus |

## F. Audit Logs (`/master/audit-logs`, `/manager/audit-logs`, modul RBAC `audit_logs`)
Jejak seluruh aksi perubahan data. Default akses: **master & manager** (ubah di `/master/rbac`; role kustom bisa diberi modul ini).

| Bagian | Isi |
|---|---|
| Data | `stores/auditStore.js` (key `audit_logs`, append-only, maks. 2000 entri). Dummy dibuat `data/auditSeed.js` dari seed lain: sesi completed/cancel/reschedule/pending, laporan sesi, invoice & verifikasi, intake/admit/discharge, kuesioner ortu, login, login gagal, aksi global Master, serta contoh **completed lalu dibatalkan** & **cancel yang ditarik kembali** per cabang (45 hari terakhir) |
| Pencatatan aksi nyata (demo) | `useAuditLogger().record()` (`features/audit`) dipanggil `useSessionActions` (complete, cancel, reschedule, pending, drop, laporan, bulk, hapus sesi), `useClientOutcomeActions` (admit, done, discontinue, ubah status) dan penghapusan invoice. Backend hanya mencatat modul schedule & finance (`schema.md` §05). Satu aksi user = satu `batchId` |
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
| `/landing`, `/home` | `Home.js` + `features/landing/components/*` (Hero, Programs, Team, Branches, WhyUs, Knowledge, Contact, Footer). **Dua bahasa (Indonesia / Inggris)**: `features/landing/i18n/LanguageContext.js` (`useLang`, `L(en, id)`, pilihan disimpan di key `landing_lang`, default Indonesia) + pengalih `LanguageToggle` di header. Konten Inggris dari `data/landingData.js`, terjemahan Indonesia di `data/landingDataId.js` (kunci = id item) |
| `/assessment` | `AssessmentFill.js` (lihat 04) |
| `/print/client/:id` | `features/therapist/pages/PrintClientReport.js`: laporan cetak client (route mandiri tanpa `AppLayout`, untuk semua role staf; `STANDALONE_ROUTES` di `app/router/routes.js`) |

## File terkait
`frontend/src/features/therapist/pages/`, `frontend/src/features/therapist/components/`, `frontend/src/features/parent/pages/`, `frontend/src/features/master/pages/`, `frontend/src/shared/lib/periods.js`, `frontend/src/shared/components/`
