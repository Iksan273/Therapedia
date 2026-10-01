# PROPOSAL PENGEMBANGAN
# ONE GATE INTEGRATED CLINIC SYSTEM
### Sistem Informasi Terpadu Satu Pintu Operasional Klinik & Rekam Medis Digital

```text
Prepared by  : Jupiter Cosmic (IT Solutions)
Prepared for : Manajemen Therapedia Center (Pediatric Developmental Center)
Periode      : Maret 2026
```

---

## DAFTAR ISI (TABLE OF CONTENTS)
* **01 Executive Summary**
* **02 Profile Perusahaan & Portofolio**
* **03 Pemahaman Kebutuhan Proyek & Rincian Fitur One Gate System (9 Modul Lengkap Sesuai Frontend)**
* **04 Solusi Teknis & Arsitektur Sistem**
* **05 Strategi Performa, Skalabilitas, dan Keamanan Data Medis**
* **06 Metodologi Pengembangan**
* **07 Rencana Kerja & Timeline (Sprint Schedule)**
* **08 Deliverables**
* **09 Penawaran Harga (Investasi Proyek Rp 18.000.000)**
* **10 Garansi & Support**
* **11 Asumsi dan Batasan**
* **12 Ketentuan Tambahan (Hak Cipta, Kerahasiaan Data Medis & SLA)**
* **13 Penutup & Kontak**

---

## 01 Executive Summary

**Therapedia Center** (*Pediatric Developmental Center*) adalah klinik tumbuh kembang anak di Surabaya (Cabang Rungkut Megah Raya, Citraland, dan Lagoon Avenue Sungkono Mall) dengan spesialisasi terapi okupasi, *Sensory Integration* (SI), dan *Neurodevelopmental Treatment* (NDT). 

Sistem informasi satu pintu ini dikembangkan untuk mendigitalisasi manajemen operasional harian klinik secara presisi, dengan **dua alur utama**:

1. **Alur Admin Inquiry (Penerimaan & Asesmen Pasien Baru)**:
   * **Pipeline Intake Terstruktur**: Mengelola alur pendaftaran calon pasien baru dari pencatatan identitas, pemilihan layanan multi-disiplin (BOT-A, FOT-A, konsultasi), hingga penjadwalan sesi asesmen.
   * **Digitalisasi Kuesioner Asesmen**: Orang tua mengisi kuesioner psikologi sensori secara digital via portal publik, dengan kalkulasi skor otomatis untuk menentukan keputusan akhir penerimaan pasien (*Admit to Active Client*).

2. **Alur Admin Schedule (Penjadwalan, Rekam Sesi & Kontrol Kredit)**:
   * **Jadwal Rutin Bebas Bentrok**: Generator jadwal berulang hingga 12 minggu di kalender dengan sistem deteksi bentrok terapis dan ketersediaan ruangan secara *real-time*.
   * **Pencatatan Detail Setiap Sesi Terapi**: Dokumentasi klinis terstandarisasi pasca-sesi yang mencakup *Aktivitas Sesi* (stimulasi sensori/motorik), *Catatan Evaluasi / SOAP*, dan *Latihan Mandiri di Rumah (Homework)* yang langsung terhubung ke portal orang tua.
   * **Manajemen Kredit Pasien (*Credit per Client*) & Proteksi Slot Frozen**: Saldo sesi terpotong otomatis saat sesi diselesaikan (*Completed*). Pasien aktif dengan saldo 0 kredit otomatis memiliki slot kalender berstatus **Frozen (❄️ Beku)** guna memastikan anak tidak diterapi sebelum perpanjangan paket divalidasi oleh Finance.

Didukung modul Finance, Portal Terapis, Portal Orang Tua, dan Otomasi WhatsApp, integrasi kedua alur utama ini mengeliminasi pencatatan manual, mencegah kebocoran sesi terapi, dan menjaga kualitas operasional di seluruh cabang Therapedia.

---

## 02 Profile Perusahaan & Portofolio

**Jupiter Cosmic** adalah *independent software development studio* yang berfokus pada rancang bangun sistem berbasis web dan aplikasi terintegrasi (*custom enterprise software solutions*). Berpengalaman membangun sistem ERP operasional internal, sistem keuangan, sistem pelacakan logistik, hingga aplikasi manajemen klinik terpadu.

Pendekatan kami mengutamakan arsitektur modern (*clean architecture*), kemudahan penggunaan (*user-centric design*), performa tinggi, dan skalabilitas jangka panjang.

### Layanan & Portofolio Terkait Jupiter Cosmic:
* **Ekspedisi ERP and Finance System**: Sistem operasional terintegrasi dengan modul keuangan, rekonsiliasi pembayaran, dan penagihan invoice.
* **Tracking & Fleet Logistics Mobile Application**: Aplikasi pelacakan real-time untuk pemantauan rute dan status operasional.
* **Multi-Branch Executive Dashboard & Analytics**: Dashboard visualisasi performa bisnis, analisa omzet bruto/netto, dan utilisasi kapasitas.
* **Point of Sales (POS) Web & Cashier Tablet App**: Sistem kasir berbasis web dan tablet untuk pencatatan transaksi cepat.
* **Human Resource Information System (HRIS)**: Manajemen jadwal shift staf, rekapitulasi kehadiran, dan evaluasi beban kerja.
* **Warehouse & Inventory Management System**: Manajemen stok barang terdistribusi multi-lokasi.

---

## 03 Pemahaman Kebutuhan Proyek & Rincian Fitur One Gate System

Sistem *One Gate* untuk **Therapedia** dirancang mencakup **9 modul utama** yang saling terhubung dalam satu basis data terpusat, merefleksikan seluruh arsitektur antarmuka, rute navigasi, dan komponen fungsional yang ada pada antarmuka frontend sistem:

### 1. Executive Multi-Branch & HQ Control (Pintu Direksi & Manajemen Pusat — Role: Master)
*Route URL: `/master` | Komponen Frontend: `DashboardRevenue.js`, `BranchPerformance.js`, `UserManagement.js`, `RoleModuleAccess.js`*
* **Executive Multi-Branch Revenue Analytics Dashboard (`/master/revenue`)**:
  * Visualisasi kartu metrik utama secara terpadu: **Omzet Bruto (*Total Invoiced*)**, **Penerimaan Kas Masuk (*Cash-In Collected*)**, dan **Piutang Tertunda (*Pending Receivables*)**.
  * **Quick Operational Branch KPIs**: Pemantauan instan jumlah Total Pasien Terdaftar, Pasien Aktif (*Active Clients*), Terapis Aktif, Sesi Terjadwal, dan Sesi Berhasil Selesai.
  * **Filter Rentang Waktu & Multi-Cabang Fleksibel**: Pilihan rentang waktu Mingguan (*This Week*), Bulanan (*This Month*), Triwulan (*Last 3 Months*), hingga *Custom Date Range* (dari tanggal s/d tanggal).
  * **Multi-Branch Selector**: Kemampuan menyaring data gabungan seluruh cabang (*All Branches*) atau cabang tertentu (Rungkut Megah Raya / East, Citraland, Lagoon Avenue Sungkono Mall / West).
  * **Grafik Finansial Komparatif**: Grafik batang (*Bar Chart*) perbandingan pendapatan antar cabang dan grafik lingkaran (*Pie Chart*) distribusi penerimaan berdasarkan metode pembayaran dan paket terapi.
* **Cross-Branch Inquiry & Intake Performance Analytics (`/master/branch-performance`)**:
  * Matriks komparasi konversi pendaftaran calon pasien antar-cabang: Total Inquiries, Admitted to Active, In-Progress, Done Assessment, dan Discontinued/Drop.
  * Perhitungan analitik rasio konversi pendaftaran (*Conversion Rate %*) dan rasio pembatalan (*Drop Rate %*).
  * Indikator cabang dengan performa konversi terbaik (*Best Performing Branch*).
  * **Grafik Tren Pendaftaran 6 Bulan Terakhir (*6-Month Intake Trend Chart*)**: Visualisasi garis tren pendaftaran pasien baru per cabang dari bulan ke bulan.
* **Staff & User Management System (`/master/users`)**:
  * Manajemen akun pengguna staf multi-cabang (Role: Branch Manager, Admin Inquiry, Admin Schedule, Role Finance, dan Clinical Therapist).
  * Penugasan cabang staf (*branch assignment*) untuk membatasi akses operasional sesuai lokasi kerja.
  * Filter pencarian cepat staf berdasarkan nama, alamat email, atau role, dilengkapi sistem paginasi rapi.
  * Formulir penambahan akun staf baru dan fungsi penghapusan akun yang sudah tidak aktif.
* **Dynamic RBAC Module Access Management Matrix (`/master/rbac`)**:
  * Matriks konfigurasi hak akses granular sakelar (*toggle switch*) secara dinamis untuk **8 modul aplikasi** (Dashboard Revenue, Inquiry Pipeline, Weekly Schedule, Active Clients & Analytics, Finance Hub, Clinical Notes Therapist, User Management, RBAC Permissions) terhadap **6 peran pengguna** (Branch Manager, Admin Inquiry, Admin Schedule, Role Finance, Therapist, Parent Portal).
  * Menjamin kerahasiaan data finansial klinik dan menjaga privasi rekam medis anak dari akses staf yang tidak berwenang.

### 2. Branch Operations Control (Pintu Branch Manager — Role: Manager)
*Route URL: `/manager` | Komponen Frontend: `DashboardRevenue.js`, `AppLayout.js`*
* **Pusat Kendali Operasional Cabang Mandiri**:
  * Sesi Branch Manager secara otomatis terkunci pada wilayah cabang yang dikelolanya (Rungkut Megah Raya, Citraland, atau Lagoon Avenue Sungkono Mall).
  * Pemantauan khusus omzet bruto, kas masuk, dan tagihan tertunda cabang yang bersangkutan.
* **Pengawasan Lintas Fungsi Cabang Terpadu**:
  * Akses langsung satu klik ke Inquiry Pipeline cabang, Kalender Jadwal Mingguan terapis cabang, dan Roster Pasien Aktif cabang.
  * Evaluasi beban caseload sesi harian dan keterisian ruangan terapi di cabang manajer.

### 3. Intake Pipeline & Registrasi Pasien Baru (Pintu Admin Inquiry — Role: Admin Inquiry)
*Route URL: `/admin-inquiry` | Komponen Frontend: `DashboardInquiry.js`, `InquiryPipeline.js`, `ClientDetailInquiry.js`*
* **Inquiry Funnel & Status Dashboard (`/admin-inquiry/dashboard`)**:
  * Metrik pendaftaran masuk harian/bulanan, rasio konversi intake baru, dan daftar antrean intake terbaru.
* **Interactive Kanban Pipeline Board (`/admin-inquiry/pipeline`)**:
  * Papan visualisasi alur penerimaan pasien dalam **8 kolom tahapan intake**:
    1. *New Intake* (Data kontak dan identitas awal anak masuk)
    2. *Service Selected* (Layanan klinis asesmen/konsultasi telah ditentukan)
    3. *Assessment Scheduled* (Sesi asesmen klinis telah dibooking ke kalender)
    4. *Assessment Done* (Sesi asesmen selesai, tautan GDrive & tabel psikologi terisi)
    5. *Admit to Active Client* (Pasien resmi menjadi klien aktif untuk terapi rutin)
    6. *Done Consult* (Konsultasi evaluasi selesai tanpa lanjut terapi)
    7. *Done Assessment* (Penyerahan laporan asesmen selesai)
    8. *Discontinued* (Pembatalan pendaftaran intake)
  * Fitur pencarian instan nama anak/orang tua/kode akses, filter cabang, serta dialog modal pendaftaran *New Intake*.
* **Client Detail Pipeline dengan 8 Non-Sequential Cards/Steps (`/admin-inquiry/pipeline/:id`)**:
  * **Step 1 - Data New Intake**: Profil anak, tanggal lahir, hitung usia otomatis (tahun dan bulan), identitas orang tua, kontak WhatsApp & email, cabang intake, serta dialog modal **Edit Data Intake** untuk pembaruan data sewaktu-waktu.
  * **Step 2 - Pilihan Layanan Klinis Multi-Disiplin**: Mendukung pemilihan lebih dari satu layanan klinis sekaligus (BOT-A: *Brief OT Assessment*, FOT-A: *Full OT Assessment*, Konsultasi Tanpa Laporan, Konsultasi Dengan Laporan Tertulis, serta profil *School Companion*).
  * **Step 3 - Questionnaire Code Generator**: Penerbitan multi-kode kuesioner unik per kategori instrumen (misal kode kuesioner ortu + kode evaluasi guru sekolah) dengan tombol salin cepat dan link langsung ke form.
  * **Step 4 - Schedule Assessment Booking**: Menjadwalkan **1 atau lebih sesi asesmen** langsung ke kalender terapis terkait, dengan pelacakan status sesi (*scheduled* atau *completed*).
  * **Step 5 - Parent Assessment Answer**: Tinjauan hasil pengisian kuesioner ortu/sekolah, lengkap dengan tautan langsung ke tabel psikologi klinis dan format cetak PDF.
  * **Step 6 - Google Drive Client Integration**: Penyimpanan dan pembukaan tautan folder Google Drive untuk arsip video observasi klinis dan dokumen rujukan medis anak.
  * **Step 7 - Tagihan Invoice & Bukti Pembayaran**: Pemantauan status invoice asesmen/intake, indikator warna (*Menunggu Pembayaran* vs *Lunas Terverifikasi*), dan modal pratinjau bukti transfer orang tua.
  * **Step 8 - Final Decision Outcomes (Keputusan Akhir Non-Sekuensial)**:
    * **Admit to Active Client**: Pasien resmi menjadi klien aktif dan siap dijadwalkan sesi terapi rutin. **Dapat di-admit meskipun saldo kredit awal masih 0** (slot jadwal di kalender otomatis berstatus *Frozen* ❄️).
    * **Done Consult**: Ditandai selesai konsultasi awal tanpa lanjut sesi terapi.
    * **Done Assessment**: Penyerahan laporan klinis selesai tanpa lanjut sesi terapi.
    * **Discontinue**: Pembatalan intake dengan dialog pencatatan alasan detail (pindah kota, biaya, bentrok jadwal, dll).

### 4. Mesin Kuesioner Asesmen Psikologi Klinis & Evaluasi Sensori (Assessment Engine)
*Route URL: `/admin-inquiry/assessments`, `/admin-inquiry/parent-assessment/:id`, `/assessment` | Komponen: `AssessmentMasterData.js`, `ParentAssessmentView.js`, `AssessmentFill.js`*
* **Master Data Kategori & Domain Sensori (`/admin-inquiry/assessments`)**:
  * Pengelolaan master instrumen asesmen klinis baku (Sensory Profile Winnie Dunn, School Companion, Motorik Kasar & Halus, Wicara).
  * Pengelompokan domain klinis: *Auditory, Visual, Touch, Movement, Body Position, Oral, Behavioral*.
* **Dynamic Clinical Question Builder (Mendukung 6 Tipe Pertanyaan)**:
  1. *Skala 0–5 Standar Winnie Dunn* (5: Hampir Selalu s/d 0: Tidak Berlaku).
  2. *Range Angka Kustom* (1–5 atau 1–10).
  3. *Pilihan Ganda (Single Choice)*.
  4. *Pilihan Jamak (Multi-Choice Checkbox)*.
  5. *Teks Bebas / Esai Observasi Kualitatif*.
  6. *Pilihan Biner Ya / Tidak*.
* **Portal Pengisian Kuesioner Publik (`/assessment`)**:
  * Halaman publik pengisian kuesioner yang ringan dan ramah layar smartphone orang tua/guru sekolah.
  * Pengisian cukup menggunakan kode akses unik (misal `ASM-XXXX`) tanpa perlu mendaftar email/password baru.
  * Dilengkapi indikator progres pengerjaan dan penyimpanan jawaban instan ke database klinik.
* **Kalkulasi Skor Otomatis 4 Kuadran Sensori Winnie Dunn (`/admin-inquiry/parent-assessment/:id`)**:
  * Kalkulasi matematis instan pengelompokan kuadran sensori anak:
    * **AV**: *Avoiding* (Penghindar Sensori)
    * **SN**: *Sensory Sensitivity* (Sensitivitas Tinggi)
    * **RG**: *Low Registration* (Pendaftaran Rendah)
    * **SK**: *Sensory Seeking* (Pencari Sensori)
  * Rekapitulasi skor mentah per domain, skor kuadran, dan klasifikasi ambang batas (*cutoff*) standar klinis.
  * **Clinical Report Print & PDF View**: Mode pratinjau dan cetak laporan hasil asesmen yang rapi dan profesional untuk dibagikan ke orang tua atau dokter spesialis anak.

### 5. Timetable, Penjadwalan Kalender & Active Clients Roster (Pintu Admin Schedule & Front-Desk)
*Route URL: `/admin-schedule` | Komponen: `DashboardSchedule.js`, `CalendarPage.js`, `WeeklyCalendar.js`, `ActiveClients.js`, `ActiveClientDetail.js`*
* **Schedule Telemetry & Attendance Dashboard (`/admin-schedule`)**:
  * Analisis rasio kehadiran (*Attendance Rate %*), total klien aktif, beban sesi terapis, dan chart status sesi (*completed, cancelled, rescheduled*).
  * **Filter Telemetri Lanjutan**: Penyaringan data sesi berdasarkan nama klien, terapis spesifik, cabang, status kehadiran, dan rentang tanggal custom.
* **Weekly Timetable Grid & Day Agenda (`/admin-schedule/calendar`)**:
  * Tampilan kalender mingguan interaktif (Senin–Sabtu, jam 08:00–17:00) dan tampilan agenda harian (*Day Agenda*) yang optimal untuk tablet front-desk.
  * Filter visualisasi berdasarkan nama terapis dan opsi menampilkan/menyembunyikan klien yang telah lulus (*discharged*).
* **Real-Time Conflict Detection Engine**:
  * Pencegahan otomatis bentrok jadwal antara jam terapis, pelanggaran ketersediaan jam kerja terapis (*therapist working hours*), dan bentrok ruangan secara instan saat sesi dibuat/digeser.
* **Recurring Schedule Generator (Otomatisasi 12 Minggu)**:
  * Pembuatan jadwal sesi berulang mingguan hingga **12 minggu sekaligus**, dengan fleksibilitas konfigurasi jam, terapis, dan tipe sesi terapi berbeda di tiap hari terpilih (contoh: Senin Terapi Okupasi jam 09.00, Kamis Sensori Integrasi jam 10.00).
* **Proteksi Slot Frozen (❄️ Zero-Credit Safeguard)**:
  * Pasien aktif dengan sisa saldo **0 kredit sesi** tetap dapat memiliki alokasi slot jadwal rutin di kalender, namun berstatus **Frozen (Beku)**.
  * Slot beku ini menjadi pengingat visual tegas bagi terapis dan resepsionis bahwa anak **belum dapat diterapi sebelum paket diperpanjang oleh orang tua dan diverifikasi oleh Finance**, mencegah kerugian kebocoran sesi terapi gratis.
* **Operasi Massal (Bulk Operations)**:
  * **Bulk Reschedule**: Memindahkan tanggal atau menukar praktisi terapis untuk puluhan sesi sekaligus secara cepat saat ada terapis berhalangan hadir.
  * **Bulk Cancel / Leave**: Pembatalan/izin massal dengan dokumentasi alasan cuti.
* **Session Lifecycle & Credit Rules**:
  * *Sesi Selesai (Completed)*: Otomatis memotong 1 saldo kredit sesi anak dan mencatat log riwayat kehadiran.
  * *Sesi Izin/Cuti (Leave/Rescheduled)*: Mencatat kuota cuti/izin tanpa memotong kredit sesi jika memenuhi ketentuan SOP izin klinik.
  * *Force Schedule Override*: Otorisasi darurat penjadwalan saat kondisi khusus.
* **Active Clients Directory (`/admin-schedule/clients`)**:
  * **Tab 1: Roster Klien Aktif**: Direktori pasien aktif dengan filter cabang, pencarian instan nama anak/ortu/kode akses, filter status saldo kredit (**Kredit Sehat >2 sesi**, **Kredit Menipis 1–2 sesi**, **Kredit Nol/Frozen 0 sesi**), tombol *Quick Schedule Modal*, tautan detail klien, dan direct modal WhatsApp.
  * **Tab 2: Birthday Radar**: Radar pemantauan ulang tahun anak per bulan berjalan untuk memelihara kedekatan kekeluargaan antara klinik dan orang tua, terhubung langsung dengan template ucapan ulang tahun WhatsApp ramah anak.
  * **Tab 3: Caseload & Attendance Analytics**: Evaluasi analitik beban jam kerja per terapis dan rekapitulasi alasan pembatalan sesi (Sakit, Izin Keluarga, Bentrok Sekolah, No Show/Tanpa Kabar).
* **Active Client Detail & Discharge Flow (`/admin-schedule/clients/:id`)**:
  * Profil lengkap pasien anak, paket kredit yang sedang berjalan, riwayat kehadiran seluruh sesi, dan alur kelulusan/terminasi terapi (*Discharge Flow*) dengan pencatatan alasan resmi (*Goal Achieved / Graduated, Moving / Relocation, Financial, Schedule Conflict, Expectation Not Met, Other*) beserta catatan evaluasi akhir.

### 6. Finance Portal & Billing Gateway (Pintu Keuangan & Kasir — Role: Finance)
*Route URL: `/finance` | Komponen Frontend: `FinancePortal.js`, `PaymentProofViewerModal.js`*
* **Tab 1: Antrean Verifikasi Bukti Transfer (`verification`)**:
  * Antrean khusus untuk memeriksa slip transfer pembayaran bank yang diunggah orang tua dari portal.
  * **Interactive Payment Proof Viewer Modal**: Modal pratinjau bukti transfer beresolusi tinggi (format gambar JPG/PNG dan dokumen PDF) dengan kontrol interaktif: *Zoom-In, Zoom-Out, Pan/Geser, Rotate 90°, Fit-to-screen*, dan reset tampilan.
  * **Aksi Validasi Finansial**:
    * **Approve (Lunas)**: Invoice resmi berstatus *Paid* dan saldo kredit sesi anak **otomatis bertambah di sistem** sesuai jumlah kuota paket yang dibeli.
    * **Reject (Tolak)**: Menolak slip bukti bayar yang tidak valid disertai pencatatan alasan penolakan yang informatif bagi orang tua.
* **Tab 2: Invoicing & Penerbitan Tagihan (`billing`)**:
  * Formulir penerbitan invoice tagihan digital baru (pilih klien, pilih paket terapi, dan nominal tagihan).
  * Indikator warna status tagihan (Merah: *Belum Lunas / Unpaid*, Hijau: *Lunas Terverifikasi / Paid*).
  * Tabel audit trail seluruh invoice dengan filter cabang, tanggal, dan paginasi rapi.
* **Tab 3: Renewal Paket Kredit (`renewal`)**:
  * Menu perpanjangan paket eksklusif tim finance untuk memproses renewal saldo kredit sesi anak yang kuotanya telah menipis atau habis.
* **Tab 4: History Logs Mutasi Kredit (`history`)**:
  * Audit log rekam jejak mutasi kredit per anak secara transparan (pencatatan tanggal transaksi, penambahan kredit via verifikasi invoice, pemotongan kredit via sesi selesai di kalender, beserta identitas user pencatat).
* **Tab 5: Master Paket Layanan & Tarif (`packages`)**:
  * Pengaturan master harga paket, jumlah kuota kredit sesi, diskon, dan deskripsi program terapi (Paket Regular Therapist 10 sesi, Paket Senior Therapist 10 sesi, Paket Konsultasi 1 sesi, serta formulir pembuatan paket kustom baru).

### 7. Portal Praktisi Terapis (Therapist Portal — Role: Therapist)
*Route URL: `/therapist` | Komponen: `MySchedule.js`, `TherapistSummary.js`, `TherapistClientDetail.js`, `SessionReportModal.js`, `ClientReportHistoryDrawer.js`, `PrintClientReport.js`*
* **My Clinical Schedule (`/therapist`)**:
  * Kalender jadwal sesi harian dan mingguan khusus terapis yang bersangkutan secara *real-time*.
  * Navigasi tanggal, filter status sesi, dan quick action input catatan rekam sesi.
* **Therapist Summary & Dokumentasi Sesi (`/therapist/summary`)**:
  * **Monitoring Dokumentasi Sesi Selesai**: Pelacakan seluruh sesi yang telah selesai dilaksanakan, dengan filter *Pending Documentation* (sesi yang belum diisi catatannya) dan *Fully Documented*.
  * **Standarisasi Rekam Sesi Klinis 3 Bagian (*3-Part Clinical Session Notes*)**:
    1. **Aktivitas Sesi (*Activity Section*)**: Pendataan stimulasi sensori, latihan motorik, atau aktivitas intervensi okupasi yang dijalankan anak selama sesi berlangsung.
    2. **Catatan Evaluasi / SOAP (*Note Section*)**: Evaluasi klinis praktisi mengenai regulasi sensori, fokus, respon emosional anak, dan SOAP catatan perkembangan.
    3. **Latihan Mandiri di Rumah (*Homework / Home Program Section*)**: Instruksi latihan mandiri terstruktur yang langsung dapat dibaca dan dipraktikkan oleh orang tua di rumah guna menjaga konsistensi terapi sehari-hari.
  * **Client Report History Drawer**: Laci riwayat seluruh sesi yang pernah dijalani anak bersama terapis, memudahkan evaluasi perkembangan terapi berkala.
  * **Cetak Laporan Sesi Klinis (`PrintClientReport.js`)**: Format cetak laporan sesi terapis yang rapi dan profesional untuk diserahkan ke orang tua atau dokter rujukan.
* **Therapist Client Detail (`/therapist/clients/:id`)**:
  * Berkas profil klinis anak, riwayat kehadiran, diagnosa, dan akses langsung ke hasil kuesioner asesmen ortu (`ParentAssessmentView`).

### 8. Portal Mandiri Keluarga Pasien (Parent / Family Portal — Role: Client)
*Route URL: `/client` | Komponen Frontend: `ClientDashboard.js`*
* **Akses Login Cepat Bebas Password**:
  * Orang tua masuk ke portal cukup dengan memasukkan **Kode Pasien Anak (misal `TDC-XXXX`)** tanpa repot mendaftar email atau menghafal kata sandi, ramah digunakan di smartphone.
* **Kartu Status Tagihan & Upload Bukti Transfer**:
  * Indikator warna status tagihan (Merah: *Belum Dibayar*, Hijau: *Lunas Terverifikasi*).
  * Fitur unggah slip bukti transfer bank langsung dari galeri/kamera smartphone atau dokumen PDF dengan validasi ukuran file dan pratinjau bukti yang sudah terkirim.
* **Monitoring Saldo Kredit Sesi Terapi (Real-Time Credits Tracker)**:
  * Tampilan transparan jumlah sesi yang tersisa dari paket (*remaining credits*), total sesi yang telah selesai, dan indikator peringatan saat kuota sesi menipis.
* **Jadwal Sesi Mendatang & Informasi Terapis**:
  * Memantau tanggal, jam sesi terapi anak mendatang, lokasi cabang, dan nama terapis pendamping.
* **Riwayat Sesi Selesai & Edukasi Rumah (Home Program)**:
  * Orang tua dapat membuka riwayat sesi anak yang telah selesai beserta catatan terapis dan panduan latihan di rumah (*Homework / Home Program*) yang diberikan praktisi.
* **Tautan Langsung Kuesioner Asesmen**:
  * Shortcut langsung menuju halaman pengisian kuesioner asesmen anak (`/assessment`).

### 9. WhatsApp Automation & Communication Hub (6 Smart Scenarios)
*Komponen Frontend: `WhatsAppAutomationModal.js`*
* Terintegrasi langsung di seluruh antarmuka sistem (Header Navigasi, Detail Klien Inquiry, Kalender Jadwal, Roster Klien Aktif, dan Birthday Radar).
* Menggunakan protokol *Smart WhatsApp Dispatch (`wa.me`)* yang langsung membuka aplikasi WhatsApp dengan pesan dan nomor tujuan terformat rapi **tanpa biaya langganan bulanan dari vendor pihak ketiga**:
  1. *Undangan & Kode Kuesioner Asesmen (Assessment Appointment & Questionnaire Code)*: Konfirmasi tanggal sesi asesmen, nama terapis, serta link dan kode akses kuesioner ortu/sekolah.
  2. *Pengingat Sesi Terapi H-1 (Therapy Session Reminder Day-Before)*: Pengingat otomatis jadwal terapi esok hari dan panduan persiapan fisik anak sebelum sesi.
  3. *Pemberitahuan Saldo Paket Menipis & Renewal (Package Balance & Renewal Notice)*: Pengingat santun saat saldo sesi anak tersisa 1–2 sesi, disertai info paket renewal terapi.
  4. *Pemberitahuan Laporan Evaluasi Klinis Siap (Clinical Evaluation Report Ready)*: Pemberitahuan bahwa laporan hasil evaluasi klinis anak telah selesai disusun dan siap diambil/didiskusikan.
  5. *Penawaran Slot Kosong / Waiting List (Open Therapy Slot Offer)*: Konfirmasi penawaran cepat slot jadwal yang mendadak kosong akibat pembatalan pasien lain kepada keluarga di antrean tunggu.
  6. *Ucapan Ulang Tahun Pasien Anak (Pediatric Birthday Greeting)*: Pesan selamat ulang tahun ramah anak yang hangat dari keluarga besar Therapedia.

---

## 04 Solusi Teknis & Arsitektur Sistem

Sistem dirancang dengan arsitektur modern berstandar enterprise yang memisahkan sisi antarmuka dan logika bisnis backend (*Decoupled RESTful Architecture*):

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                          │
│  React.js SPA (Tailwind CSS, Lucide Icons, Recharts, Sonner)│
│  [Desktop Reception, Tablet Therapist, Mobile Parent View]   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON REST API
┌──────────────────────────────▼──────────────────────────────┐
│                    BACKEND APPLICATION                      │
│                  Laravel 11.x RESTful API                   │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ Controllers & Form Requests (Input Validation)       │  │
│   │ Service Layer (Scheduling Logic, Credits Engine)     │  │
│   │ Sanctum Authentication & RBAC Policy Middleware      │  │
│   └──────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Eloquent ORM
┌──────────────────────────────▼──────────────────────────────┐
│                      DATABASE LAYER                         │
│             MySQL Relational Database Engine                │
│  [Clients, Schedules, Credits, Invoices, Assessments, Logs] │
└─────────────────────────────────────────────────────────────┘
```

* **Frontend Layer**: **React.js (Single Page Application)**
  * Bebas reload halaman, responsif untuk desktop kantor klinik maupun smartphone orang tua/terapis.
  * Antarmuka didesain modern menggunakan Tailwind CSS, ikon Lucide, Recharts untuk visualisasi data eksekutif, dan Sonner untuk sistem notifikasi.
* **Backend Layer**: **Laravel (PHP 8.2+) RESTful API**
  * Framework backend tangguh dengan keamanan teruji, menggunakan Laravel Sanctum untuk otentikasi token aman, Form Request Validation untuk validasi data medis/keuangan, dan arsitektur Service/Repository.
* **Database Layer**: **MySQL Relational Database**
  * Skema database relasional berelasi kuat untuk menjaga konsistensi antara data cabang, staf terapis, jadwal sesi, kuota kredit, invoice transaksi, dan hasil skor asesmen.
* **Server & Deployment**:
  * VPS Ubuntu Server LTS, Nginx Reverse Proxy, SSL HTTPS Let's Encrypt, dan sistem storage berkas bukti bayar terproteksi.

---

## 05 Strategi Performa, Skalabilitas, dan Keamanan Data Medis

1. **Performa & Skalabilitas Multi-Cabang**:
   * *Optimized Database Indexing*: Struktur indeks pada tabel transaksi, kuota kredit, dan jadwal sesi untuk memastikan query tetap cepat saat data pasien bertambah ribuan rekam.
   * *Offloaded Video Storage*: Integrasi penyimpanan video observasi menggunakan Google Drive sehingga bandwidth dan kapasitas harddisk server utama tetap efisien.
2. **Keamanan Data Medis & Transaksi**:
   * *Strict Role-Based Access Control*: Staf hanya dapat membuka menu dan data sesuai wewenangnya (terapis tidak memiliki akses ke laporan keuangan, kasir tidak dapat mengubah data klinis).
   * *Data Encryption & Protection*: Enkripsi password menggunakan Bcrypt, proteksi otomatis terhadap SQL Injection, XSS, dan CSRF token.
   * *Daily Automated Database Backup*: Pencadangan database otomatis terjadwal setiap hari untuk perlindungan dari kehilangan data.

---

## 06 Metodologi Pengembangan

Pengembangan dijalankan menggunakan metodologi **Agile Sprint (5–6 Minggu)** yang transparan dan adaptif:
* **Siklus 1 Minggu = 1 Sprint**
* **Demo Mingguan di Server Staging**: Pihak manajemen Therapedia dapat langsung mencoba fitur yang selesai di tiap akhir sprint.
* **User Acceptance Test (UAT)**: Uji coba menyeluruh bersama admin, finance, dan perwakilan terapis sebelum peluncuran resmi.

---

## 07 Rencana Kerja & Timeline

| Fase & Sprint | Durasi | Target Capaian (Key Milestones) |
| :--- | :---: | :--- |
| **Fase 1: Inisiasi & Arsitektur Database**<br>• Sprint 1 (System Setup & DB Design) | **Minggu 1** | • Finalisasi struktur database relasional MySQL One Gate System.<br>• Setup environment staging Laravel API & React.<br>• Implementasi sistem autentikasi (Sanctum) & skema user roles multi-cabang. |
| **Fase 2: Core Backend & Asesmen Sensori**<br>• Sprint 2 (Intake Pipeline & Assessment Engine) | **Minggu 2** | • REST API New Intake & 8-Tahap Pipeline non-sekuensial.<br>• Engine Asesmen Klinis (6 tipe pertanyaan & kalkulasi kuadran Winnie Dunn AV/SN/RG/SK).<br>• Integrasi halaman publik pengisian kuesioner ortu (`/assessment`). |
| **Fase 2: Penjadwalan & Credit per Client**<br>• Sprint 3 (Timetable, Conflict & Credit Engine) | **Minggu 3** | • API Kalender mingguan & generator jadwal berulang (12 minggu).<br>• Real-time conflict detection engine terapis & ruangan.<br>• Credit per client: pemotongan kredit otomatis per sesi selesai, kuota cuti/izin, & proteksi slot Frozen 0-kredit.<br>• Operasi massal: bulk reschedule & bulk cancel, serta Active Clients Roster & Birthday Radar. |
| **Fase 2: Finance Hub, Portals & WA Integration**<br>• Sprint 4 (Finance, Therapist/Parent Portals & WA) | **Minggu 4** | • Modul Finance: Invoicing tagihan, antrean verifikasi bukti transfer dengan interactive proof viewer, renewal kredit, & history logs mutasi.<br>• Portal Terapis: My Schedule, standarisasi 3-Part Clinical Session Notes (Aktivitas, SOAP, Homework), client history drawer, & cetak laporan sesi.<br>• Portal Ortu: Login kode unik anak, status tagihan, upload bukti transfer, tracking sisa kredit, & homework.<br>• Integrasi WhatsApp Communication Hub (6 skenario pesan). |
| **Fase 3: Executive Analytics & QA**<br>• Sprint 5 (HQ Dashboard & System Testing) | **Minggu 5** | • Dashboard Revenue Multi-Cabang & Analitik Komparasi Performa Intake Antar-Cabang.<br>• User Management & RBAC Module Access matrix.<br>• Full integration frontend React dengan backend Laravel API.<br>• Stress testing, validasi integritas data medis & audit trail keuangan. |
| **Fase 3: UAT, Deployment & Go-Live**<br>• Sprint 6 (Peluncuran & Handover) | **Minggu 6** | • Pelaksanaan UAT bersama tim staf Therapedia (Direksi, Finance, Front-Desk, Terapis).<br>• Konfigurasi server produksi VPS, Nginx, domain resmi, & SSL HTTPS.<br>• Pelatihan staf, serah terima source code, buku panduan manual, dan sistem resmi Go-Live. |

---

## 08 Deliverables (Hasil Serah Terima)

1. **Source Code Lengkap**:
   * Source code Frontend (React.js SPA lengkap beserta komponen antarmuka & styling).
   * Source code Backend (Laravel 11 REST API, Controllers, Models, Migrations, Seeders).
2. **Database System**:
   * Skema database terstruktur, skrip migrasi Laravel, serta data master awal.
3. **Dokumentasi Teknis & API**:
   * Dokumentasi endpoint API (Postman Collection / Swagger) dan panduan teknis deployment server.
4. **User Manual (Buku Panduan Operasional)**:
   * Panduan alur kerja untuk Superadmin, Finance, Admin Front-Desk, dan Terapis.
5. **Garansi & Dukungan Teknis**:
   * Garansi perbaikan bug gratis selama **3 (tiga) bulan** pasca Go-Live.

---

## 09 Penawaran Harga (Investasi Proyek)

Karena **seluruh rancang bangun antarmuka, arsitektur alur kerja klinis, dan prototype interaktif frontend telah selesai divalidasi**, fokus pengerjaan utama adalah **membangun backend Laravel REST API, arsitektur database relasional MySQL, logika bisnis kredit & penjadwalan, serta integrasi penuh ke frontend React**.

Dengan ruang lingkup tersebut, kami mengajukan penawaran nilai investasi proyek senilai **Rp 18.000.000,- (Delapan Belas Juta Rupiah)**:

| No | Ruang Lingkup / Modul Sistem | Estimasi Nilai |
| :---: | :--- | :---: |
| 1 | **Analisis Kebutuhan, Perancangan Arsitektur One Gate & Database Relasional (MySQL)**<br>*(Konfigurasi environment repository, skema migrasi database relasi 3 cabang Surabaya, model data pasien, terapis, jadwal, kredit, & audit trail keuangan)* | Rp 2.000.000 |
| 2 | **Development Backend Core REST API (Laravel Framework)**<br>*(Autentikasi Sanctum, RBAC multi-role 6 peran, API Client Intake, Pipeline 8 tahap non-sekuensial, Active Clients Roster, & CRUD Master)* | Rp 4.500.000 |
| 3 | **Development Core Engine (Penjadwalan, Credit per Client & Asesmen Sensori)**<br>*(Conflict detection engine, recurring 12 minggu, pemotongan saldo kredit otomatis per sesi selesai, proteksi slot frozen 0 kredit, serta engine kuesioner dinamis & kalkulasi 4 kuadran sensori Winnie Dunn)* | Rp 3.500.000 |
| 4 | **Development Modul Finance, Invoicing, & Verifikasi Bukti Pembayaran**<br>*(Sistem pembuatan invoice tagihan, upload bukti transfer ortu, antrean validasi slip pembayaran dengan interactive proof viewer, & renewal paket kredit)* | Rp 2.500.000 |
| 5 | **Integrasi Antarmuka Frontend React.js ke Backend API, 3-Part Clinical Notes, & WhatsApp Hub**<br>*(Sinkronisasi state kalender & portal, form rekam sesi 3 bagian: aktivitas, SOAP, homework, toast notification, serta aktivasi modul 6 template otomatisasi pesan WhatsApp)* | Rp 3.500.000 |
| 6 | **Quality Assurance (Testing), Security Hardening, Deployment VPS & Go-Live**<br>*(UAT testing bersama tim staf Therapedia, konfigurasi Nginx web server, instalasi SSL HTTPS, buku panduan operasional manual, & serah terima sistem)* | Rp 2.000.000 |
| **TOTAL** | **NILAI INVESTASI PENGEMBANGAN SISTEM** | **Rp 18.000.000** |

---

## 10 Garansi & Support

1. **Garansi Bug Gratis 3 Bulan**:
   * Menjamin perbaikan setiap kesalahan program, bug, atau malfungsi sistem selama 3 bulan sejak tanggal Go-Live tanpa biaya tambahan.
2. **Pendampingan Teknis**:
   * Tim Jupiter Cosmic siap mendampingi staf Therapedia selama masa transisi awal implementasi sistem.
3. **Opsi Maintenance Lanjutan (Opsional)**:
   * Setelah masa garansi 3 bulan usai, pihak Therapedia dapat memilih opsi kontrak pemeliharaan berkala (*SLA Maintenance*) untuk update fitur dan pemeliharaan server jangka panjang.

---

## 11 Asumsi dan Batasan

1. **Penyediaan Materi & Konten Klinik**:
   * Butir instrumen asesmen klinis, tarif paket terapi, dan data awal terapis disediakan oleh pihak Therapedia.
2. **Infrastruktur Server & Hosting**:
   * Biaya sewa server VPS (rekomendasi: min. 2 vCPU, 4GB RAM) dan domain resmi disediakan oleh pihak Therapedia, dengan proses instalasi dan konfigurasi server ditangani penuh oleh tim Jupiter Cosmic.
3. **Protokol WhatsApp**:
   * Menggunakan integrasi protokol *Smart WhatsApp Dispatch (`wa.me`)* yang langsung membuka aplikasi WhatsApp dengan pesan dan nomor tujuan terformat, bebas biaya langganan bulanan dari vendor pihak ketiga.
4. **Mekanisme Perubahan Ruang Lingkup**:
   * Penambahan modul baru di luar rincian proposal ini akan dihitung melalui mekanisme *Change Request (CR)* yang disepakati bersama.

---

## 12 Ketentuan Tambahan

1. **Kepemilikan Source Code Penuh (*Full Ownership*)**:
   * Seluruh source code aplikasi (Frontend & Backend), database schema, dan aset teknis menjadi **hak milik penuh Therapedia** setelah kewajiban pembayaran proyek selesai.
2. **Kerahasiaan Data Pasien (*Medical Data Confidentiality*)**:
   * Jupiter Cosmic berkomitmen memegang standar kerahasiaan data medis (*Non-Disclosure Agreement*)—tidak akan menduplikasi, membagikan, atau mengeksploitasi data pasien anak, rekam asesmen, maupun laporan finansial Therapedia.
3. **Batasan Tanggung Jawab & Force Majeure**:
   * Vendor dibebaskan dari tanggung jawab atas kegagalan teknis yang disebabkan oleh keadaan di luar kendali wajar (*force majeure*), seperti bencana alam atau gangguan massal jaringan internet nasional.

---

## 13 Penutup & Kontak

Kami dari **Jupiter Cosmic** berkomitmen penuh untuk mewujudkan **One Gate System** sebagai fondasi digital yang kokoh bagi pertumbuhan dan efisiensi operasional **Therapedia Center** di seluruh cabang (Rungkut Megah Raya, Citraland, dan Lagoon Avenue Sungkono Mall). Kami meyakini kehadiran sistem terpadu satu pintu ini akan menghapuskan inefisiensi manual, menjamin akurasi pendataan rekam sesi klinis dan kredit pasien anak, mencegah kebocoran sesi terapi, serta meningkatkan mutu pelayanan dan kepuasan bagi seluruh keluarga pasien Therapedia.

Kami siap untuk mendiskusikan penawaran ini lebih lanjut dan memulai langkah kerjasama yang produktif.

**Hormat kami,**  
**JUPITER COSMIC (IT SOLUTIONS)**  

**Muhammad Ikhsan**  
*Lead Developer & Technical Consultant*  
📞 WhatsApp : +62 812-2266-7763  
✉️ Email    : admin@Jupitercosmic.com  
🌐 Website  : www.JupiterCosmic.com  
