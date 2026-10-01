# MASTER PROJECT BRIEF & CONTEXT: THERAPEDIA ONE (ONE GATE INTEGRATED CLINIC SYSTEM)
> **Catatan Panduan untuk AI Generator Proposal / Pitch Deck / Slides:**
> Dokumen ini adalah **sumber kebenaran tunggal (*Single Source of Truth*)** yang memuat seluruh profil bisnis, latar belakang klinis, spesifikasi fungsional 6 modul utama sistem, arsitektur teknis, timeline sprint, dan rincian penawaran harga untuk proyek digitalisasi **Therapedia Center**.
> AI dapat langsung memanfaatkan struktur data, deskripsi fitur yang mendalam, dan istilah klinis di bawah ini untuk meng-generate proposal formal, slide presentasi bisnis (Canva/PowerPoint), dokumen tender, maupun ringkasan eksekutif sesuai template yang dituju.

---

## 1. IDENTITAS PROYEK & PROFIL CLIENT

* **Nama Sistem**: **Therapedia One** (atau *One Gate Integrated Clinic System*)
* **Definisi Sistem**: Sistem Informasi Manajemen Operasional Terpadu Satu Pintu & Rekam Klinis Digital Tumbuh Kembang Anak
* **Client / Institusi**: **Therapedia Center** (*Pediatric Developmental Center*)
* **Website Resmi**: [https://www.therapedia.center/](https://www.therapedia.center/)
* **Spesialisasi Klinis**: Pusat terapi tumbuh kembang dan terapi okupasi pediatrik terkemuka di Surabaya yang berfokus pada penanganan anak-anak dengan tantangan perkembangan (*developmental delays/challenges*) melalui pendekatan klinis berbasis bukti (*evidence-based therapy*):
  1. **Sensory Integration (SI)** — Intervensi integrasi sensori terstruktur.
  2. **Neurodevelopmental Treatment (NDT)** — Terapi neuromuskular dan perbaikan kontrol postur motorik.
* **Layanan Terapi Utama**:
  * *Regular Occupational Therapy Intervention* (usia 18 bulan – 14 tahun)
  * *Sensory Spark* (stimulasi preventif tumbuh kembang usia dini 9–24 bulan)
  * *Early Intensive Behavioral Intervention (EIBI)*
  * *Speech Therapy* (Terapi Wicara) & *Pediatric Physiotherapy* (Fisioterapi Pediatrik)
  * Asesmen Klinis: BOT-A (*Brief OT Assessment*), FOT-A (*Full OT Assessment*), Konsultasi Klinis (dengan/tanpa laporan tertulis)
  * Profil Pendamping Sekolah (*School Companion Profile*)
* **Jaringan Cabang Operasional (3 Cabang di Surabaya)**:
  1. **Cabang Rungkut Megah Raya (Surabaya Timur)**: Ruko Rungkut Megah Raya Blok L-1, Kota Surabaya.
  2. **Cabang Citraland (Surabaya Barat)**: Royal Park TK II No. 21 - 22, Citraland, Lakarsantri, Kota Surabaya.
  3. **Cabang Lagoon Avenue Sungkono Mall (Surabaya Barat - Pusat)**: Lagoon Avenue Mall Sungkono Lt. UG 3 - 6, Jl. K.H. Abdul Wahab Siamin Blok RA 9 - 10, Kota Surabaya.
* **Pengembang Sistem (Vendor IT Solutions)**: **Jupiter Cosmic (IT Solutions)**
* **Lead Developer & Technical Consultant**: Muhammad Ikhsan
* **Kontak Vendor**: WhatsApp: +62 812-2266-7763 | Email: admin@Jupitercosmic.com | Website: www.JupiterCosmic.com
* **Periode Dokumen**: Maret 2026

---

## 2. EXECUTIVE SUMMARY (RINGKASAN EKSEKUTIF UMUM)

Seiring dengan pesatnya pertumbuhan operasional **Therapedia Center** di 3 cabang strategis Kota Surabaya (Rungkut, Citraland, dan Lagoon Avenue Sungkono), kebutuhan akan tata kelola klinik yang modern, akurat, dan terintegrasi menjadi prioritas utama. Selama ini, operasional harian klinik masih menghadapi tantangan konvensional: pencatatan sesi terapi anak yang masih terfragmentasi, koordinasi jadwal terapis dan ruangan yang rentan bentrok, pengawasan sisa kuota sesi (*credit per client*) yang manual sehingga berisiko kebocoran finansial, serta alur pendaftaran client baru dan kuesioner sensori yang belum terhubung langsung ke sistem rekam medis.

**Therapedia One** hadir sebagai solusi sistem informasi satu pintu (*one-gate integrated system*) yang menghubungkan seluruh pemangku kepentingan klinik—mulai dari Direksi/Manajemen Eksekutif, Staf Front-Desk/Admin Pendaftaran, Tim Penjadwalan, Kasir/Finance, Praktisi Terapis, hingga Keluarga Client (Orang Tua). 

Melalui platform ini:
1. **Penerimaan Client Baru & Asesmen Sensori** dikelola secara terstruktur melalui pipeline terpadu, lengkap dengan kalkulasi otomatis profil sensori Winnie Dunn dan pengisian kuesioner digital mandiri bagi orang tua.
2. **Penjadwalan & Rekam Sesi Klinis** berjalan bebas bentrok dengan mesin deteksi konflik otomatis, didukung standarisasi catatan 3-bagian (*Aktivitas, Evaluasi SOAP, dan Latihan Rumah*) yang langsung tersinkronisasi ke portal orang tua.
3. **Akuntabilitas Keuangan & Saldo Sesi** terjamin melalui sistem proteksi slot beku (*Frozen Slot*) saat kredit client habis, verifikasi bukti transfer perbankan yang presisi, dan buku besar mutasi kredit (*credit ledger*) yang transparan.
4. **Visibilitas & Kontrol Manajemen Multi-Cabang** tersaji secara *real-time* dalam dashboard analitik pendapatan, performa intake, dan matriks hak akses keamanan berstandar tinggi.

Digitalisasi ini tidak hanya meningkatkan efisiensi operasional dan mencegah kebocoran pendapatan klinik, namun juga memperkuat kolaborasi klinis antara terapis dan orang tua demi hasil tumbuh kembang anak yang optimal dan berkesinambungan.

---

## 3. SPESIFIKASI LENGKAP 6 MODUL SISTEM

Sistem **Therapedia One** dirancang ke dalam **6 Modul Fungsional Terpadu**, dengan **4 Modul Utama Berdaya Ungkit Besar (Highlighted Core Modules)** yang menjadi tulang punggung operasional klinik:

---

### [🌟 CORE HIGHLIGHT MODULE 1] MODULE - ADMIN INQUIRY
> **Fokus Utama**: Pengelolaan corong penerimaan client baru (*new intake*), seleksi layanan multi-disiplin, penerbitan kuesioner klinis multi-instrumen, mesin scoring profil sensori Winnie Dunn 4-kuadran, hingga eksekusi keputusan akhir penerimaan client (*admission*).
* **Target Pengguna**: Admin Intake, Front-Desk, Koordinator Asesmen Klinis.
* **Route URL**: `/admin-inquiry/dashboard`, `/admin-inquiry/pipeline`, `/admin-inquiry/pipeline/:id`, `/admin-inquiry/assessments`, `/admin-inquiry/parent-assessment/:id`, `/assessment`
* **Komponen Frontend**: `DashboardInquiry.js`, `InquiryPipeline.js`, `ClientDetailInquiry.js`, `AssessmentMasterData.js`, `ParentAssessmentView.js`, `AssessmentFill.js`

#### Rincian Fitur Detail:
1. **Inquiry Telemetry & Dashboard Ringkasan (`/admin-inquiry/dashboard`)**:
   * **Kartu Metrik Konversi Intake**: Menampilkan secara *real-time* jumlah Total Intake Baru, Client Dalam Tahap Asesmen, Client Resmi Diterima (*Admitted to Active*), dan Persentase Tingkat Konversi (*Conversion Rate %*).
   * **Tabel Antrean Pendaftaran Terkini (*Latest Intake Queue*)**: Menampilkan daftar pendaftaran terbaru lengkap dengan nama anak, usia, cabang intake tujuan, nama orang tua, nomor kontak WhatsApp, dan status pipeline saat ini.

2. **Interactive Kanban Pipeline Board 8 Kolom (`/admin-inquiry/pipeline`)**:
   * Papan visualisasi alur pendaftaran client dari hulu ke hilir dengan 8 tahapan status:
     1. *New Intake* (Data pendaftaran awal calon client baru masuk).
     2. *Service Selected* (Kombinasi layanan asesmen/konsultasi telah ditentukan).
     3. *Assessment Scheduled* (Sesi asesmen klinis telah dibooking ke kalender terapis).
     4. *Assessment Done* (Sesi asesmen klinis telah selesai dieksekusi).
     5. *Admit to Active Client* (Resmi disetujui bergabung sebagai client terapi rutin).
     6. *Done Consult* (Konsultasi selesai, tidak memerlukan intervensi lanjutan).
     7. *Done Assessment* (Penyerahan laporan asesmen selesai, tidak lanjut terapi rutin).
     8. *Discontinued* (Batal intake dengan pencatatan alasan resmi).
   * **Filter & Pencarian Instan**: Filter berdasarkan cabang klinik (Rungkut, Citraland, Lagoon Avenue) dan kolom pencarian cepat berdasarkan nama anak, orang tua, atau kode akses.
   * **Tombol Pendaftaran Cepat (*New Intake Action*)**: Dialog modal pendaftaran awal untuk memasukkan data client baru secara instan.

3. **Client Detail Pipeline dengan 8 Tahapan Komprehensif Non-Sekuensial (`/admin-inquiry/pipeline/:id`)**:
   * Arsitektur fleksibel: Staf dapat mengakses dan mengisi informasi pada kartu mana pun tanpa terikat urutan kaku:
   * **Card/Step 1 - Data Profil Intake & Keluarga**:
     * Pendataan identitas lengkap anak: nama lengkap, nama panggilan, jenis kelamin, dan tanggal lahir.
     * Kalkulator usia otomatis yang menampilkan umur presisi (format: *X Tahun Y Bulan*).
     * Informasi orang tua/wali: nama ayah/ibu, nomor WhatsApp aktif, alamat email, domisili, dan cabang yang dipilih.
     * Modal dialog *Edit Data Intake* untuk pembaruan profil sewaktu-waktu.
   * **Card/Step 2 - Pemilihan Layanan Klinis Multi-Disiplin (*Multi-Service Selection*)**:
     * Mendukung pemilihan kombinasi multi-layanan sekaligus dalam 1 kali proses intake:
       * BOT-A (*Brief Occupational Therapy Assessment*)
       * FOT-A (*Full Occupational Therapy Assessment*)
       * Konsultasi Klinis Tanpa Laporan Tertulis
       * Konsultasi Klinis Dengan Laporan Tertulis
       * Profil Pendamping Sekolah (*School Companion Profile*)
     * Otomatisasi kalkulasi estimasi tagihan biaya intake sesuai paket layanan yang dicentang.
   * **Card/Step 3 - Generator Kode Kuesioner Multi-Instrumen (*Questionnaire Code Generator*)**:
     * Penerbitan kode akses kuesioner digital unik (misal `ASM-0012`) untuk masing-masing pihak:
       * Kode Kuesioner Orang Tua (*Parent Sensory Questionnaire*)
       * Kode Kuesioner Guru Sekolah (*School Companion Questionnaire*)
     * Tombol *One-Click Copy Link* dan tombol buka formulir asesmen langsung di peramban.
     * Pelacakan status pengerjaan kuesioner (*Pending / In Progress / Completed*).
   * **Card/Step 4 - Penjadwalan Sesi Asesmen Klinis (*Schedule Assessment Booking*)**:
     * Pemesanan langsung 1 atau beberapa jadwal sesi observasi/asesmen ke kalender terapis terkait.
     * Penentuan praktisi terapis penanggung jawab, tanggal asesmen, jam mulai, dan durasi sesi.
     * Pelacakan status kehadiran sesi asesmen (*Scheduled / Completed / Cancelled*).
   * **Card/Step 5 - Evaluasi Lembar Jawaban Kuesioner (*Parent Assessment Answers*)**:
     * Tinjauan komprehensif seluruh jawaban kuesioner yang telah disubmit orang tua atau pihak sekolah.
     * Tautan langsung ke kalkulator klinis Winnie Dunn dan lembar rekapitulasi skor.
     * Tombol cetak laporan hasil asesmen (*Print Assessment Report*) dan ekspor dokumen PDF.
   * **Card/Step 6 - Integrasi Google Drive Berkas & Video Klinis (*GDrive Client Storage*)**:
     * Penyimpanan tautan URL folder Google Drive khusus per client.
     * Mengarsipkan video observasi anak saat beraktivitas di rumah/sekolah serta berkas rujukan dari dokter spesialis anak (DSA/psikiater).
     * Menghemat ruang server lokal (*offloaded cloud storage*) dengan keamanan tingkat tinggi.
   * **Card/Step 7 - Verifikasi Tagihan Intake & Bukti Bayar (*Billing & Payment Proof*)**:
     * Informasi rincian tagihan biaya pendaftaran, asesmen, atau konsultasi.
     * Indikator status pembayaran (*Unpaid / Pending Verification / Paid*).
     * Modal *Payment Proof Viewer* untuk mengecek bukti transfer yang dikirimkan orang tua.
   * **Card/Step 8 - Eksekusi Keputusan Akhir (*Final Decision Outcomes*)**:
     * *Admit to Active Client*: Mengubah calon client menjadi Client Aktif klinik. **Sangat fleksibel: client dapat di-admit meskipun saldo kredit awal masih 0** (slot jadwal anak di kalender otomatis berstatus *Frozen* ❄️ hingga invoice divalidasi finance).
     * *Done Consult*: Selesai konsultasi evaluasi awal tanpa kebutuhan terapi rutin lanjutan.
     * *Done Assessment*: Penyerahan laporan evaluasi klinis selesai tanpa paket terapi lanjutan.
     * *Discontinue*: Pembatalan intake dengan dialog pencatatan alasan detail (faktor biaya, jarak, pindah kota, dll.).

4. **Mesin Asesmen Sensori & Evaluasi Psikologi Klinis Winnie Dunn**:
   * **Master Data Kategori & 7 Domain Sensori Klinis**:
     1. *Auditory Processing* (Pemrosesan Pendengaran)
     2. *Visual Processing* (Pemrosesan Penglihatan)
     3. *Touch Processing* (Pemrosesan Taktil/Sentuhan)
     4. *Movement Processing* (Pemrosesan Gerak/Vestibular)
     5. *Body Position Processing* (Pemrosesan Posisi Tubuh/Proprioseptif)
     6. *Oral Sensory Processing* (Pemrosesan Sensori Oral/Mulut)
     7. *Behavioral & Emotional Responses* (Respon Emosi & Perilaku Terkait Sensori)
   * **Dynamic Clinical Question Builder (Mendukung 6 Tipe Pertanyaan)**:
     1. *Skala Standar Winnie Dunn 0–5* (5: Hampir Selalu, 4: Sering, 3: Kadang-kadang, 2: Jarang, 1: Hampir Tidak Pernah, 0: Tidak Berlaku).
     2. *Range Angka Kustom* (Skala numerik 1–5 atau 1–10).
     3. *Pilihan Tunggal (Single Choice Radio)*.
     4. *Pilihan Jamak (Multi-Choice Checkbox)*.
     5. *Esai Observasi Teks Bebas*.
     6. *Pilihan Biner Ya / Tidak*.
   * **Kalkulasi Otomatis 4 Kuadran Sensori Winnie Dunn (Automatic Scoring Engine)**:
     * Menghitung otomatis skor mentah per domain dan mengelompokkannya ke dalam 4 kuadran sensori:
       * **AV (*Avoiding*)**: Kecenderungan anak menghindar dari stimulasi sensori.
       * **SN (*Sensory Sensitivity*)**: Tingkat kepekaan dan reaktivitas sensori tinggi.
       * **RG (*Low Registration*)**: Keterlambatan mencatat atau menyadari input sensori.
       * **SK (*Sensory Seeking*)**: Perilaku aktif mencari stimulasi sensori tambahan.
     * Pemetaan otomatis skor terhadap ambang batas klinis (*Cutoff Thresholds*): *Much Less Than Others, Less Than Others, Similar to Others, More Than Others, Much More Than Others*.
     * Format cetak laporan evaluasi klinis resmi berlogo klinik siap cetak atau simpan PDF.
   * **Portal Pengisian Publik Kuesioner Responsif Smartphone (`/assessment`)**:
     * Antarmuka web ramah ponsel untuk orang tua atau guru sekolah.
     * Akses cepat tanpa password: cukup memasukkan kode unik (misal `ASM-0012`).
     * Indikator progres persentase pengerjaan dan fitur *auto-save* otomatis saat tiap butir dijawab.

---

### [🌟 CORE HIGHLIGHT MODULE 2] MODULE - ADMIN SCHEDULE AND TIMETABLE
> **Fokus Utama**: Manajemen kalender jadwal terapi mingguan terpusat di seluruh cabang, mesin pencegah bentrok jadwal & ruangan, generator jadwal rutin 12 minggu, penegakan aturan saldo kredit (*credit per client*), proteksi slot beku (*Frozen Slot*), operasi massal (*bulk actions*), dan direktori client aktif.
* **Target Pengguna**: Admin Penjadwalan, Resepsionis/Front-Desk, Kepala Terapis.
* **Route URL**: `/admin-schedule`, `/admin-schedule/calendar`, `/admin-schedule/clients`, `/admin-schedule/clients/:id`
* **Komponen Frontend**: `DashboardSchedule.js`, `CalendarPage.js`, `WeeklyCalendar.js`, `ActiveClients.js`, `ActiveClientDetail.js`

#### Rincian Fitur Detail:
1. **Schedule Attendance & Telemetry Dashboard (`/admin-schedule`)**:
   * **Metrik Operasional Real-Time**: Persentase Tingkat Kehadiran Klinik (*Attendance Rate %*), Total Client Aktif Berjalan, Total Terapis Berdinas, Total Sesi Terjadwal Minggu Ini, dan Total Sesi Berhasil Selesai.
   * **Filter Telemetri Multi-Dimensi**: Penyaringan data jadwal berdasarkan Nama Client, Nama Terapis, Cabang Klinik, Status Kehadiran (*Scheduled, Completed, Cancelled, Leave*), dan Rentang Tanggal Kustom.
   * **Grafik Rasio Kehadiran (*Attendance Breakdown Chart*)**: Visualisasi proporsi sesi hadir, sesi izin/cuti terencana, dan pembatalan mendadak (*no-show*).

2. **Weekly Timetable Grid & Day Agenda (`/admin-schedule/calendar`)**:
   * **Matriks Jadwal Mingguan Interaktif**: Menampilkan jadwal Senin hingga Sabtu dari pukul 08:00 hingga 17:00 dalam format grid visual yang mudah dipantau.
   * **Penyaringan Cepat**: Filter per terapis, filter per cabang, dan opsi sembunyikan/tampilkan client yang telah lulus (*Hide/Show Discharged Clients*).
   * **Tampilan Agenda Harian (*Daily Agenda View*)**: Tampilan daftar sesi hari berjalan yang ramah tablet meja resepsionis front-desk.
   * **Penanda Visual Status Sesi**: Indikator warna tegas untuk sesi *Scheduled* (Biru), *Completed* (Hijau), *Leave/Rescheduled* (Kuning), dan *Frozen* (Abu-abu Bersalju ❄️).

3. **Real-Time Conflict Detection Engine (Anti-Bentrok Otomatis)**:
   * Algoritma validasi otomatis yang bekerja seketika saat sesi dibuat, diubah, atau digeser:
     * *Therapist Working Hours Violation*: Mencegah pembuatan jadwal di luar jam kerja resmi terapis.
     * *Therapist Clash Prevention*: Mencegah seorang terapis dijadwalkan menangani 2 client berbeda pada jam yang sama.
     * *Room Double-Booking Prevention*: Mencegah 2 sesi berbeda dialokasikan pada ruangan terapi yang sama di jam yang sama.

4. **Recurring Schedule Generator (Otomatisasi Jadwal Rutin 12 Minggu)**:
   * Fitur *batch generation* yang memungkinkan pembuatan jadwal terapi berulang mingguan hingga 12 minggu sekaligus dalam satu kali aksi.
   * **Fleksibilitas Konfigurasi Multi-Hari**: Mengatur jam sesi, terapis penanggung jawab, dan jenis layanan terapi yang berbeda di tiap harinya (contoh: Senin jam 09.00 Terapi Okupasi bersama Terapis A, Kamis jam 10.00 Sensori Integrasi bersama Terapis B).

5. **Proteksi Slot Frozen (❄️ Zero-Credit Safeguard)**:
   * Client aktif yang saldo kreditnya telah habis (0 kredit) **tetap memiliki alokasi slot jadwal rutin di kalender mingguan**, namun slot tersebut ditandai dengan status khusus **Frozen (❄️ Beku)**.
   * Slot beku ini terkunci secara sistem (*locked*): terapis dan resepsionis tidak dapat menandai sesi selesai (*cannot be marked Completed*) sebelum paket diperpanjang oleh orang tua dan disetujui bagian finance.
   * **Manfaat Strategis**: Mencegah kebocoran pendapatan klinik (terapi gratis tanpa pembayaran) sekaligus menjamin slot jam favorit anak tidak hilang diserobot client lain.

6. **Aturan Bisnis & Siklus Sesi Terapi (Session Lifecycle & Credit Rules)**:
   * *Mark Completed*: Mengubah status sesi menjadi selesai, mencatat log kehadiran, dan **secara otomatis memotong 1 saldo kredit sesi anak**.
   * *Mark Reschedule / Leave (Izin/Cuti)*: Membatalkan sesi dengan alasan izin tanpa memotong kredit sesi (sesuai kuota dan batas waktu SOP izin klinik).
   * *Force Schedule Override*: Otorisasi pembuatan jadwal darurat dengan pencatatan alasan khusus oleh supervisor.

7. **Operasi Massal Jadwal (Bulk Operations)**:
   * *Bulk Reschedule*: Memindahkan tanggal atau menukar praktisi terapis pengganti (*substitute therapist*) untuk puluhan sesi sekaligus secara instan saat ada terapis yang sakit atau berhalangan hadir.
   * *Bulk Cancel / Leave*: Pembatalan atau pemberian izin massal untuk hari libur nasional atau perbaikan sarana klinik.

8. **Direktori Client Aktif dengan 3 Tab Komprehensif (`/admin-schedule/clients`)**:
   * **Tab 1 - Roster Client Aktif**:
     * Direktori lengkap anak aktif dengan filter cabang dan pencarian instan nama anak/orang tua/kode client.
     * **Filter Indikator Saldo Kredit**:
       * *Kredit Sehat* (> 2 sesi tersisa - Badge Hijau)
       * *Kredit Menipis* (1–2 sesi tersisa - Badge Kuning Peringatan)
       * *Kredit Habis / Nol* (0 sesi tersisa / Frozen - Badge Merah)
     * Tombol Aksi Cepat: *Quick Schedule Modal* (tambah jadwal langsung), *View Detail*, dan *Direct WhatsApp Trigger*.
   * **Tab 2 - Radar Ulang Tahun Client Anak (Pediatric Birthday Radar)**:
     * Memantau daftar client anak yang berulang tahun pada bulan berjalan.
     * Terhubung langsung dengan tombol kirim ucapan selamat ulang tahun WhatsApp ramah anak untuk mempererat kedekatan emosional antara klinik dan keluarga.
   * **Tab 3 - Analitik Beban Terapis & Alasan Pembatalan (Caseload & Reason Analytics)**:
     * Analitik keseimbangan beban kerja antar terapis (*therapist caseload balance*).
     * Grafik rekapitulasi alasan pembatalan sesi (Sakit, Acara Keluarga, Bentrok Sekolah, Tanpa Kabar/No-Show) sebagai evaluasi manajemen.

9. **Profil Client Aktif & Alur Pelepasan Terapi (`/admin-schedule/clients/:id`)**:
   * Profil lengkap anak: riwayat medis, daftar paket berjalan, rekap kehadiran seluruh sesi.
   * **Discharge Flow (Alur Kelulusan / Terminasi Terapi)**:
     * Formulir resmi pelepasan client dari status aktif dengan pencatatan alasan terstandarisasi:
       1. *Goal Achieved / Graduated* (Target tercapai / Anak lulus terapi).
       2. *Moving / Relocation* (Keluarga pindah domisili/kota).
       3. *Financial Reason* (Pertimbangan anggaran orang tua).
       4. *Schedule Conflict* (Bentrok dengan jam sekolah anak).
       5. *Expectation Not Met* (Ekspektasi belum terpenuhi).
       6. *Other* (Alasan lain dengan catatan khusus).
     * Catatan evaluasi akhir sebelum status client diarsipkan menjadi alumni.

---

### MODULE FINANCE
> **Fokus Utama**: Pengelolaan pintu kasir dan penagihan digital, antrean verifikasi bukti transfer perbankan orang tua dengan inspektur dokumen interaktif, renewal paket kredit sesi, audit trail mutasi kredit, dan master katalog harga paket.
* **Target Pengguna**: Staf Finance, Kasir Klinik, Akuntan.
* **Route URL**: `/finance`
* **Komponen Frontend**: `FinancePortal.js`, `PaymentProofViewerModal.js`

#### Rincian Fitur Detail (5 Tab Operasional):
1. **Tab 1 - Antrean Verifikasi Bukti Transfer (`verification`)**:
   * Antrean khusus untuk memeriksa slip transfer pembayaran bank yang diunggah orang tua dari Parent Portal.
   * **Interactive Payment Proof Viewer Modal (`PaymentProofViewerModal.js`)**:
     * Fitur inspeksi dokumen mutakhir beresolusi tinggi untuk format gambar (JPG/PNG) dan dokumen PDF.
     * Kontrol navigasi interaktif: *Zoom-In, Zoom-Out, Pan/Geser Bukti Transfer, Rotate 90 Derajat, Fit to Screen*, dan tombol reset tampilan.
     * Menampilkan data pembanding: Nama anak, nama rekening pengirim, bank tujuan, nominal pembayaran, dan tanggal transaksi.
   * **Eksekusi Validasi Keuangan**:
     * *Approve (Setujui)*: Invoice resmi berstatus *Paid* (Lunas) dan saldo kredit sesi anak **otomatis bertambah di sistem** sesuai jumlah kuota paket yang dibeli.
     * *Reject (Tolak)*: Menolak bukti bayar yang buram, nominal tidak sesuai, atau palsu, disertai pencatatan alasan penolakan yang otomatis tertera di portal orang tua.

2. **Tab 2 - Invoicing & Penerbitan Tagihan Digital (`billing`)**:
   * Formulir penerbitan invoice tagihan digital baru (pilih nama client, pilih paket layanan terapi, dan nominal tagihan).
   * Indikator warna status tagihan (Merah: *Belum Lunas / Unpaid*, Hijau: *Lunas Terverifikasi / Paid*).
   * Tabel audit trail seluruh invoice dengan filter cabang, tanggal transaksi, kolom pencarian, dan paginasi rapi.

3. **Tab 3 - Renewal Paket Kredit Sesi (`renewal`)**:
   * Menu khusus finance untuk memproses perpanjangan kuota kredit sesi bagi client yang kuotanya telah menipis (1-2 sesi) atau telah berstatus *Frozen* (0 sesi).
   * Otomatis membuka status *Frozen* pada kalender jadwal setelah pembayaran divalidasi lunas.

4. **Tab 4 - History Logs & Audit Trail Mutasi Kredit (`history`)**:
   * Buku besar mutasi kredit sesi anak (*Credit Ledger Audit Trail*).
   * Rekam jejak transparan: tanggal transaksi, jenis mutasi (Penambahan kredit via verifikasi invoice finance vs Pengurangan kredit via sesi terapi selesai di kalender), sisa saldo akhir, serta identitas staf operator pencatat.

5. **Tab 5 - Master Paket Layanan & Tarif Klinik (`packages`)**:
   * Pengaturan master katalog tarif dan kuota kredit klinik:
     * Paket Regular Therapist (10 Sesi Kredit)
     * Paket Senior Therapist (10 Sesi Kredit)
     * Paket Asesmen & Konsultasi (1 Sesi Kredit)
     * Pembuatan paket promosi atau kustom baru (nama paket, jumlah sesi kredit, masa berlaku, dan harga dasar).

---

### [🌟 CORE HIGHLIGHT MODULE 3] MODULE MASTER
> **Fokus Utama**: Panel eksekutif untuk Direksi, Owner, dan General Manager guna memantau performa finansial dan operasional konsolidasi di 3 cabang Surabaya, analitik corong intake antar-cabang, manajemen akun staf, dan konfigurasi matriks hak akses keamanan (RBAC) dinamis.
* **Target Pengguna**: Owner, Direktur Klinik, General Manager, Branch Manager.
* **Route URL**: `/master`, `/manager`
* **Komponen Frontend**: `DashboardRevenue.js`, `BranchPerformance.js`, `UserManagement.js`, `RoleModuleAccess.js`, `AppLayout.js`

#### Rincian Fitur Detail:
1. **Executive Multi-Branch Revenue Analytics (`/master/revenue`)**:
   * **Kartu Metrik Pendapatan Konsolidasi**:
     * *Total Invoiced* (Total Nilai Omzet Tagihan yang Diterbitkan).
     * *Cash-In Collected* (Total Penerimaan Kas Riil Masuk yang Telah Diverifikasi).
     * *Pending Receivables* (Total Piutang Tagihan Tertunda yang Belum Lunas).
   * **Quick Operational KPIs**: Total Client Terdaftar, Client Aktif Berjalan, Jumlah Terapis Berdinas, Sesi Terjadwal, dan Sesi Selesai.
   * **Penyaringan Data Fleksibel**:
     * Filter periode: *This Week* (Mingguan), *This Month* (Bulanan), *Quarter* (Triwulan), dan *Custom Date Range*.
     * *Multi-Branch Selector*: Menampilkan data gabungan seluruh cabang (*All Branches*) atau filter spesifik per cabang (Rungkut Megah Raya, Citraland, Lagoon Avenue Sungkono Mall).
   * **Visualisasi Grafik Data**:
     * Grafik batang komparasi pendapatan antar-cabang (*Bar Chart*).
     * Grafik lingkaran sebaran metode pembayaran dan paket terapi terlaris (*Pie Chart*).

2. **Cross-Branch Inquiry & Intake Performance Analytics (`/master/branch-performance`)**:
   * **Matriks Perbandingan Corong Intake Antar-Cabang**: Komparasi data Total Inquiry Masuk, Admitted to Active, In-Progress Asesmen, dan Discontinued (Batal).
   * **Indikator Rasio Otomatis**: Kalkulasi otomatis Rasio Konversi (*Conversion Rate %*) dan Rasio Pembatalan (*Drop Rate %*).
   * **Badge Cabang Berkinerja Terbaik (*Best Performing Branch*)**: Memberikan penanda visual cabang dengan efektivitas konversi tertinggi.
   * **Grafik Tren Pendaftaran 6 Bulan (*6-Month Intake Trend Line Chart*)**: Membaca tren pertumbuhan calon client baru dari bulan ke bulan untuk perencanaan ekspansi bisnis klinik.

3. **Staff & User Management System (`/master/users`)**:
   * Pengelolaan master data akun staf di seluruh cabang (Role: Branch Manager, Admin Inquiry, Admin Schedule, Role Finance, Therapist).
   * **Penugasan Cabang Staf (*Branch Assignment*)**: Mengunci wilayah operasional staf hanya pada cabang dinasnya (misal staf Rungkut hanya dapat mengelola data di Rungkut).
   * Fitur pencarian instan nama/email/role, filter cabang, paginasi data, penambahan user staf baru, dan penonaktifan akun staf.

4. **Dynamic RBAC Module Permissions Matrix (`/master/rbac`)**:
   * Matriks konfigurasi hak akses modul secara dinamis menggunakan antarmuka sakelar (*toggle switch*).
   * Mengatur kewenangan akses terhadap **8 modul operasional** untuk **6 peran pengguna**:
     * *Master / Owner / General Manager*
     * *Branch Manager*
     * *Admin Inquiry*
     * *Admin Schedule*
     * *Role Finance*
     * *Therapist*
   * **Proteksi Privasi & Keamanan**: Mencegah staf resepsionis atau terapis mengakses data omzet keuangan klinik, serta mengunci privasi rekam medis anak hanya untuk terapis dan pimpinan yang berwenang.

5. **Branch Operations Scope (`/manager`)**:
   * Mode antarmuka khusus Manajer Cabang yang otomatis membatasi ruang lingkup data hanya pada cabang yang dipimpinnya.
   * Akses cepat ke monitoring omzet cabang, kalender jadwal cabang, intake pipeline cabang, dan evaluasi utilisasi terapis cabang.

---

### MODULE THERAPIST
> **Fokus Utama**: Antarmuka kerja para praktisi terapis okupasi untuk melihat jadwal dinas pribadi, melengkapi rekam medis evaluasi klinis 3-bagian (*Aktivitas, SOAP, dan Latihan Rumah*), memantau sesi yang belum didokumentasikan, dan mencetak laporan perkembangan terapi.
* **Target Pengguna**: Terapis Okupasi, Terapis Wicara, Fisioterapis Pediatrik.
* **Route URL**: `/therapist`, `/therapist/summary`, `/therapist/clients/:id`
* **Komponen Frontend**: `MySchedule.js`, `TherapistSummary.js`, `TherapistClientDetail.js`, `SessionReportModal.js`, `ClientReportHistoryDrawer.js`, `PrintClientReport.js`

#### Rincian Fitur Detail:
1. **Jadwal Klinis Saya (My Clinical Schedule - `/therapist`)**:
   * Kalender interaktif jadwal sesi harian dan mingguan khusus terapis yang sedang login secara *real-time*.
   * Navigasi tanggal, filter status sesi, dan tombol cepat untuk membuka form rekam catatan sesi.

2. **Therapist Summary & Monitoring Dokumentasi Sesi (`/therapist/summary`)**:
   * Dashboard rekapitulasi seluruh sesi yang telah dijalani oleh terapis bersangkutan.
   * **Filter Status Dokumentasi**:
     * *Pending Documentation*: Menyorot sesi yang telah selesai namun catatannya belum diisi oleh terapis (mencegah kelalaian pendataan rekam medis).
     * *Fully Documented*: Sesi yang telah lengkap didokumentasikan.

3. **Standarisasi Rekam Sesi Klinis 3 Bagian (3-Part Clinical Session Notes)**:
   * Formulir evaluasi klinis wajib pasca-terapi terbagi ke dalam 3 bagian terstruktur:
     1. **Bagian 1: Aktivitas Sesi (*Activity Section*)**:
        * Pendataan jenis stimulasi sensori, latihan motorik kasar/halus, atau aktivitas intervensi okupasi yang dijalankan anak selama sesi berlangsung.
     2. **Bagian 2: Catatan Evaluasi & SOAP (*Note Section*)**:
        * Catatan observasi klinis terapis mengenai regulasi sensori, tingkat fokus, respon emosional anak, serta catatan SOAP (*Subjective, Objective, Assessment, Plan*).
     3. **Bagian 3: Latihan Mandiri di Rumah (*Homework / Home Program Section*)**:
        * Panduan instruksi latihan terstruktur yang dirancang terapis untuk dilanjutkan oleh orang tua di rumah.
        * Bagian ini **secara otomatis langsung tampil di Parent Portal** orang tua bersangkutan demi menjaga konsistensi terapi anak di rumah.

4. **Laci Riwayat Terapi & Cetak Laporan (`ClientReportHistoryDrawer.js` & `PrintClientReport.js`)**:
   * *Client Report History Drawer*: Panel laci yang menampilkan kronologi seluruh sesi yang pernah dijalani anak bersama terapis, memudahkan evaluasi perkembangan terapi berkala.
   * *Print Client Report*: Format cetak laporan sesi terapis yang rapi dan profesional untuk diserahkan ke orang tua atau dokter spesialis anak rujukan.

5. **Detail Klinis Client Terapis (`/therapist/clients/:id`)**:
   * Berkas profil sensori anak, diagnosa rujukan medis, riwayat kehadiran sesi, dan akses langsung untuk membaca lembar jawaban kuesioner asesmen orang tua (`ParentAssessmentView`).

---

### [🌟 CORE HIGHLIGHT MODULE 4] MODULE PARENT PORTAL
> **Fokus Utama**: Portal mandiri keluarga client yang responsif smartphone untuk memantau saldo sesi terapi, melihat jadwal mendatang, mengunggah bukti transfer bank, membaca program latihan di rumah (*home program*), serta dilengkapi pusat otomatisasi komunikasi WhatsApp klinik tanpa biaya langganan pihak ketiga.
* **Target Pengguna**: Orang Tua / Wali Client Anak, Guru Pendamping Sekolah.
* **Route URL**: `/client`, `/assessment`
* **Komponen Frontend**: `ClientDashboard.js`, `AssessmentFill.js`, `WhatsAppAutomationModal.js`

#### Rincian Fitur Detail:
1. **Akses Masuk Cepat Tanpa Password (Passwordless Child Code Login - `/client`)**:
   * Orang tua masuk ke portal cukup dengan memasukkan **Kode Client Anak (misal `TDC-0023`)**.
   * Menghilangkan kerumitan pendaftaran email atau lupa password, sangat praktis diakses dari layar smartphone kapan saja.

2. **Monitoring Saldo Kredit Sesi Terapi (Real-Time Credits Tracker)**:
   * Tampilan kartu saldo sesi yang transparan dan mudah dipahami orang tua:
     * Jumlah sisa sesi terapi yang dimiliki (*Remaining Credits*).
     * Total akumulasi sesi terapi yang telah selesai dijalani anak.
     * Indikator peringatan visual yang jelas saat kuota sesi anak menipis (tersisa 1–2 sesi).

3. **Kartu Tagihan & Upload Bukti Transfer Mandiri (Billing & Proof Upload)**:
   * Menampilkan informasi tagihan invoice yang diterbitkan klinik.
   * Indikator status pembayaran berwarna tegas (Merah: *Belum Dibayar*, Hijau: *Lunas Terverifikasi*).
   * Formulir pengunggahan slip transfer pembayaran bank langsung dari kamera/galeri smartphone atau dokumen PDF.
   * Pratinjau bukti transfer yang telah terkirim dan status validasi oleh tim finance.

4. **Jadwal Sesi Mendatang & Profil Terapis (Upcoming Appointments)**:
   * Informasi jadwal sesi terapi anak berikutnya: Hari, Tanggal, Jam, Lokasi Cabang (Rungkut, Citraland, atau Lagoon Avenue), dan Nama Terapis pendamping.

5. **Riwayat Terapi & Program Latihan di Rumah (Completed History & Home Program)**:
   * Orang tua dapat membuka arsip sesi yang telah selesai.
   * Membaca panduan latihan mandiri di rumah (*Homework / Home Program*) yang dituliskan terapis setelah sesi selesai, sehingga orang tua dapat mengulang stimulasi yang tepat di rumah.

6. **Tautan Langsung Kuesioner Asesmen Publik (`/assessment`)**:
   * Tombol pintas untuk membuka formulir pengisian kuesioner asesmen anak berbasis kode unik tanpa perlu berganti aplikasi.

7. **WhatsApp Communication Hub & Otomatisasi 6 Skenario Pesan (`WhatsAppAutomationModal.js`)**:
   * Terintegrasi di seluruh antarmuka sistem (Header, Detail Client Inquiry, Kalender Jadwal, Roster Client Aktif, dan Birthday Radar).
   * **Bebas Biaya Berlangganan (Zero Vendor Subscription)**: Memanfaatkan protokol tautan pintar *Smart WhatsApp Dispatch (`wa.me`)* yang langsung membuka aplikasi WhatsApp Web/Mobile dengan pesan dan nomor tujuan terformat rapi **tanpa biaya langganan bulanan dari vendor pihak ketiga**.
   * **6 Template Skenario Pesan Otomatis**:
     1. *Undangan & Kode Kuesioner Asesmen (Assessment Appointment & Questionnaire Code)*: Konfirmasi tanggal sesi asesmen, nama terapis, serta link dan kode akses kuesioner ortu/sekolah.
     2. *Pengingat Sesi Terapi H-1 (Therapy Session Reminder Day-Before)*: Pengingat sopan jadwal terapi esok hari dan panduan persiapan fisik anak sebelum sesi.
     3. *Pemberitahuan Saldo Paket Menipis & Renewal (Package Balance & Renewal Notice)*: Notifikasi santun saat saldo sesi tersisa 1–2 sesi disertai informasi paket perpanjangan terapi.
     4. *Pemberitahuan Laporan Evaluasi Klinis Siap (Clinical Evaluation Report Ready)*: Informasi bahwa dokumen laporan hasil evaluasi klinis anak telah selesai dan siap didiskusikan.
     5. *Penawaran Slot Kosong / Waiting List (Open Therapy Slot Offer)*: Konfirmasi penawaran kilat slot jadwal yang mendadak kosong akibat pembatalan client lain kepada keluarga di antrean tunggu.
     6. *Ucapan Ulang Tahun Client Anak (Pediatric Birthday Greeting)*: Pesan selamat ulang tahun ramah anak yang hangat dari keluarga besar Therapedia Center.

---

## 4. ARSITEKTUR TEKNOLOGI & INFRASTRUKTUR SISTEM

* **Frontend Layer**: **React.js (Single Page Application)**
  * Styling Framework: Tailwind CSS (desain modern, responsif, dan konsisten).
  * Komponen Ikon: Lucide React Icons.
  * Visualisasi Grafik Data: Recharts (Bar, Pie, dan Line Charts).
  * Notifikasi Sistem: Sonner Toaster.
  * Kompatibilitas Multi-Perangkat: Desktop (Front-Desk & Office), Tablet (Terapis & Resepsionis), dan Mobile Smartphone (Parent Portal).
* **Backend Layer**: **Laravel 11.x RESTful API (PHP 8.2+)**
  * Autentikasi Keamanan: Laravel Sanctum Token Authentication.
  * Validasi Data: Form Request Validation.
  * Arsitektur Bisnis: Service-Repository Pattern (Scheduling Engine, Credit Engine, Winnie Dunn Scoring Engine).
  * Keamanan Hak Akses: Role-Based Access Control (RBAC) Policy Middleware.
* **Database Layer**: **MySQL Relational Database Engine**
  * Struktur relasional terintegrasi: Relasi cabang (*branches*), staf (*users*), client (*clients*), jadwal (*schedules*), kuota kredit (*credits & credit_logs*), tagihan (*invoices*), dan hasil asesmen sensori (*assessments*).
* **Penyimpanan Berkas (Storage)**:
  * Bukti transfer pembayaran bank disimpan aman di direktori lokal server yang terproteksi.
  * Video observasi klinis dan dokumen rujukan medis diintegrasikan menggunakan tautan Google Drive client (*offloaded storage*).
* **Deployment & Server**:
  * Cloud VPS Ubuntu Server LTS (spesifikasi minimum: 2 vCPU, 4GB RAM).
  * Nginx Reverse Proxy Web Server.
  * Keamanan Jaringan: Sertifikat SSL / HTTPS (Let's Encrypt), CORS protection, sanitasi input XSS/SQL Injection, dan backup database otomatis harian.

---

## 5. RENCANA KERJA & TIMELINE (SPRINT SCHEDULE 6 MINGGU)

| Fase & Sprint | Durasi | Target Capaian (Key Milestones) |
| :--- | :---: | :--- |
| **Fase 1: Inisiasi & Arsitektur Database**<br>• Sprint 1 (System Setup & DB Design) | **Minggu 1** | • Finalisasi struktur database relasional MySQL One Gate System.<br>• Setup environment staging Laravel API & React.<br>• Implementasi sistem autentikasi Sanctum & skema user roles multi-cabang. |
| **Fase 2: Core Backend & Asesmen Sensori**<br>• Sprint 2 (Intake Pipeline & Assessment Engine) | **Minggu 2** | • REST API New Intake & 8-Tahap Pipeline non-sekuensial.<br>• Engine Asesmen Klinis (6 tipe pertanyaan & kalkulasi kuadran Winnie Dunn AV/SN/RG/SK).<br>• Integrasi halaman publik pengisian kuesioner ortu (`/assessment`). |
| **Fase 2: Penjadwalan & Credit per Client**<br>• Sprint 3 (Timetable, Conflict & Credit Engine) | **Minggu 3** | • API Kalender mingguan & generator jadwal berulang (12 minggu).<br>• Real-time conflict detection engine terapis & ruangan.<br>• Credit per client: pemotongan kredit otomatis per sesi selesai, kuota cuti/izin, & proteksi slot Frozen 0-kredit.<br>• Operasi massal: bulk reschedule & bulk cancel, serta Active Clients Roster & Birthday Radar. |
| **Fase 2: Finance Hub, Portals & WA Integration**<br>• Sprint 4 (Finance, Therapist/Parent Portals & WA) | **Minggu 4** | • Modul Finance: Invoicing tagihan, antrean verifikasi bukti transfer dengan interactive proof viewer, renewal kredit, & history logs mutasi.<br>• Portal Terapis: My Schedule, standarisasi 3-Part Clinical Session Notes (Aktivitas, SOAP, Homework), client history drawer, & cetak laporan sesi.<br>• Portal Ortu: Login kode unik anak, status tagihan, upload bukti transfer, tracking sisa kredit, & homework.<br>• Integrasi WhatsApp Communication Hub (6 skenario pesan). |
| **Fase 3: Executive Analytics & QA**<br>• Sprint 5 (HQ Dashboard & System Testing) | **Minggu 5** | • Dashboard Revenue Multi-Cabang & Analitik Komparasi Performa Intake Antar-Cabang.<br>• User Management & RBAC Module Access matrix.<br>• Full integration frontend React dengan backend Laravel API.<br>• Stress testing, validasi integritas data medis & audit trail keuangan. |
| **Fase 3: UAT, Deployment & Go-Live**<br>• Sprint 6 (Peluncuran & Handover) | **Minggu 6** | • Pelaksanaan UAT bersama tim staf Therapedia (Direksi, Finance, Front-Desk, Terapis).<br>• Konfigurasi server produksi VPS, Nginx, domain resmi, & SSL HTTPS.<br>• Pelatihan staf, serah terima source code, buku panduan manual, dan sistem resmi Go-Live. |

---

## 6. PENAWARAN HARGA (INVESTASI PENGEMBANGAN SISTEM)

Mengingat **seluruh rancang bangun antarmuka, arsitektur alur kerja klinis, dan prototype interaktif frontend telah selesai divalidasi**, fokus pengerjaan utama adalah **membangun backend Laravel REST API, arsitektur database relasional MySQL, logika bisnis kredit & penjadwalan, serta integrasi penuh ke frontend React**.

Total nilai investasi pengembangan sistem adalah **Rp 18.000.000,- (Delapan Belas Juta Rupiah)** dengan rincian:

| No | Ruang Lingkup / Modul Sistem | Estimasi Nilai |
| :---: | :--- | :---: |
| 1 | **Analisis Kebutuhan, Perancangan Arsitektur One Gate & Database Relasional (MySQL)**<br>*(Konfigurasi environment repository, skema migrasi database relasi 3 cabang Surabaya, model data client, terapis, jadwal, kredit, & audit trail keuangan)* | Rp 2.000.000 |
| 2 | **Development Backend Core REST API (Laravel Framework)**<br>*(Autentikasi Sanctum, RBAC multi-role 6 peran, API Client Intake, Pipeline 8 tahap non-sekuensial, Active Clients Roster, & CRUD Master)* | Rp 4.500.000 |
| 3 | **Development Core Engine (Penjadwalan, Credit per Client & Asesmen Sensori)**<br>*(Conflict detection engine, recurring 12 minggu, pemotongan saldo kredit otomatis per sesi selesai, proteksi slot frozen 0 kredit, serta engine kuesioner dinamis & kalkulasi 4 kuadran sensori Winnie Dunn)* | Rp 3.500.000 |
| 4 | **Development Modul Finance, Invoicing, & Verifikasi Bukti Pembayaran**<br>*(Sistem pembuatan invoice tagihan, upload bukti transfer ortu, antrean validasi slip pembayaran dengan interactive proof viewer, & renewal paket kredit)* | Rp 2.500.000 |
| 5 | **Integrasi Antarmuka Frontend React.js ke Backend API, 3-Part Clinical Notes, & WhatsApp Hub**<br>*(Sinkronisasi state kalender & portal, form rekam sesi 3 bagian: aktivitas, SOAP, homework, toast notification, serta aktivasi modul 6 template otomatisasi pesan WhatsApp)* | Rp 3.500.000 |
| 6 | **Quality Assurance (Testing), Security Hardening, Deployment VPS & Go-Live**<br>*(UAT testing bersama tim staf Therapedia, konfigurasi Nginx web server, instalasi SSL HTTPS, buku panduan operasional manual, & serah terima sistem)* | Rp 2.000.000 |
| **TOTAL** | **NILAI INVESTASI PENGEMBANGAN SISTEM** | **Rp 18.000.000** |

---

## 7. DELIVERABLES, GARANSI & KETENTUAN KERJASAMA

1. **Hasil Serah Terima (*Deliverables*)**:
   * *Full Source Code*: Frontend React.js & Backend Laravel 11 API lengkap tanpa enkripsi.
   * *Database System*: Skema database MySQL, migration scripts, dan seeders data master.
   * *Dokumentasi Teknis*: Dokumentasi endpoint RESTful API lengkap (Postman Collection).
   * *Buku Panduan (*User Manual*)**: Panduan operasional praktis untuk Direksi, Front-Desk/Admin, Finance, dan Terapis.
2. **Garansi & SLA (*Service Level Agreement*)**:
   * Garansi pemeliharaan dan perbaikan bug/error gratis selama **3 (tiga) bulan** terhitung sejak sistem resmi Go-Live.
   * Pendampingan teknis dan pelatihan penggunaan (*onboarding*) untuk seluruh staf klinik.
3. **Kepemilikan Hak Cipta (*Full Ownership*)**:
   * Seluruh hak kekayaan intelektual (*IP Rights*) source code dan database sepenuhnya menjadi milik **Therapedia Center** setelah pelunasan proyek.
4. **Kerahasiaan Data Medis (*Confidentiality / NDA*)**:
   * Jaminan kepatuhan terhadap kerahasiaan data medis anak, profil keluarga, dan laporan finansial klinik.
