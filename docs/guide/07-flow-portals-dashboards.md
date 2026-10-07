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

**Laporan sesi 3 bagian** (disimpan di schedule): `activitySection` (aktivitas), `noteSection` (catatan klinis/SOAP, disalin juga ke `progressNote`), dan `homeworkSection` (PR di rumah). Laporan bisa diisi kapan saja, tidak harus menunggu sesi completed.

## B. Portal Orang Tua (`/client`, role `client`)
`features/parent/pages/ClientDashboard.js`, data milik `auth.clientId`.
- Banner status tagihan (Lunas / Menunggu Pembayaran) **dihapus** (6 Okt 2026) dan kartu **Riwayat Invoice** juga **dihapus** (7 Okt 2026): portal ortu tidak lagi menampilkan daftar invoice.
- Fungsi `invoicesForParent` / `parentInvoiceStatus` ikut dihapus dari `domain/credit.js`.
- Sisa kredit total + per paket (`remainingCredit / totalCredit`).
- **Tidak ada** kartu/daftar kode kuesioner di portal ortu dan tidak ada upload bukti bayar: admin mengirim kode kuesioner lewat WhatsApp, ortu mengisinya di `/assessment` (kode diketik manual). Finance yang menandai lunas.
- Riwayat terapi: **hanya sesi `completed`**. Tombol **View Report nonaktif** bila laporan belum diisi terapis (`isReportEmpty`: label "Laporan belum tersedia"); modal laporan tidak lagi memakai teks placeholder. **Export laporan** per sesi dan "Export Laporan" (sesuai filter) membuka dokumen cetak (`shared/lib/reportExport.js`, simpan sebagai PDF lewat dialog cetak). Filter tanggal "Dari–Sampai" (`DateFilterPicker`, `filterSessionsByDate`) + reset; list dibatasi tinggi `min(520px, 60vh)`, pagination 10/20/50.
- Login dengan **kode client** (`clientCode`, mis. `AE-00006`) di `/roles` atau `/login` (demo; backend: kode + tanggal lahir anak).
- Target utama: **mobile** (ortu membuka dari HP).

## C. Dashboard eksekutif
| Route | Role | Halaman | Isi |
|---|---|---|---|
| `/master/revenue`, `/manager/revenue` | master, manager | `features/master/pages/DashboardRevenue.js` | Omzet dari invoice `paid` per cabang & periode, tren, breakdown paket. Manager terkunci ke cabangnya |
| `/master/branch-performance` | master | `BranchPerformance.js` | Perbandingan performa intake/pipeline antar cabang (recharts). Filter **rentang waktu** (`PeriodFilter`: Semua Waktu … Bulan Ini … Rentang Kustom) menyaring intake berdasarkan `createdAt`; kartu **Tren Volume Intake** punya filter sendiri (3 / 6 default / 12 bulan / Tahun ini; `buildMonthlyIntakeTrend` di `domain/branch.js`) dan tidak mengikuti filter rentang waktu halaman. Rasio konversi (admitted ÷ total intake) dan drop-off hanya di KPI + matriks (chart konversi terpisah dihapus karena duplikat). Cabang dinamis dari Master Cabang |
| `/master/branches` | master (modul `branch_master`) | `BranchManagement.js` | Master Cabang: tambah, ubah, aktif/nonaktif, dan hapus cabang (hapus = **permanen** seluruh isi cabang: client + jadwal + invoice + ledger + hari libur + akun staf cabang; hanya role `canDelete`, konfirmasi mengetik kode cabang; ADR 0005), cari + pagination 10. Tanpa kolom jumlah client. Store `branchesStore` mensinkronkan registry `BRANCHES` di `domain/branch.js` |
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
| `/master/rbac` | `RoleModuleAccess.js` | Matriks role × modul (`updateRolePermission`) + baris **"Boleh menghapus data"** per role (`setRoleCanDelete`; tombol hapus di semua modul hanya tampil bila role punya flag + akses modul), tambah/ubah/hapus role kustom (`addRole`, `updateRole`, `deleteRole`). Role sistem (`isSystem`) tidak bisa dihapus |


## E. Halaman publik / pendukung
| Route | Halaman |
|---|---|
| `/` | `Welcome.js`: pemilih portal |
| `/landing`, `/home` | `Home.js` + `features/landing/components/*` (Hero, Programs, Team, Branches, WhyUs, Knowledge, Contact, Footer). **Dua bahasa (Indonesia / Inggris)**: `features/landing/i18n/LanguageContext.js` (`useLang`, `L(en, id)`, pilihan disimpan di key `landing_lang`, default Indonesia) + pengalih `LanguageToggle` di header. Konten Inggris dari `data/landingData.js`, terjemahan Indonesia di `data/landingDataId.js` (kunci = id item) |
| `/assessment` | `AssessmentFill.js` (lihat 04) |
| `/print/client/:id` | `features/therapist/pages/PrintClientReport.js`: laporan cetak client (route mandiri tanpa `AppLayout`, untuk semua role staf; `STANDALONE_ROUTES` di `app/router/routes.js`) |

## File terkait
`frontend/src/features/therapist/pages/`, `frontend/src/features/therapist/components/`, `frontend/src/features/parent/pages/`, `frontend/src/features/master/pages/`, `frontend/src/shared/lib/periods.js`, `frontend/src/shared/components/`

## Dashboard Inquiry: Discharge (revisi 7 Okt 2026)
- Kartu **Total Discharge** (`KpiCards`) dan **Report Discharge per Alasan** (`DischargeReport`: bar + daftar jumlah/persen) di `/admin-inquiry`. Dihitung `dischargeStats(clients, dischargeReasons)` (`domain/client.js`): hanya status `discharged` (discontinue tidak ikut walau juga mengisi `dischargeReason`); alasan teks bebas tetap dikelompokkan, kosong = *Tanpa alasan*. **Periode memakai tanggal discharge** (`dateOfDischarge`), ikut filter cabang & layanan tetapi tidak filter status. `BranchPerformance` menambah kolom **Discharged** per cabang. Utilisasi terapis & Kalender Tim: lihat 05.

## Rekap Harian Sesi Selesai (report terapis, 7 Okt 2026)
Halaman **Summary & Laporan Sesi** (`/therapist/summary`) punya tab ketiga **Rekap Harian** (`DailyReport`, `dailySessionReport` di `domain/schedule.js`): untuk sesi **completed** terapis pada filter yang sama dengan tab lain (Pencarian, Client, **Rentang Waktu** termasuk kustom; status laporan tidak berlaku), tampil per tanggal: hari, jumlah sesi, **total jam** (mis. "3 Hours"; 1 sesi = durasi jam–selesai) dan **daftar client** hari itu, terbaru dulu, pagination 10, plus ringkasan total (hari, sesi, jam, client berbeda). Dipakai sebagai bahan laporan terapis.
- **Performa Inquiry & Intake All-Branch** (`/master/branch-performance`): ditambah kartu **Total Discharged** dan **Report Discharge per Alasan** (komponen bersama `shared/components/DischargeReport`, data `dischargeStats`) untuk seluruh cabang pada filter rentang waktu; periode discharge memakai **tanggal discharge** (intake tetap memakai tanggal dibuat). Kolom **Discharged** per cabang di matriks ikut aturan yang sama.
