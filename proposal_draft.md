# PROPOSAL PENGEMBANGAN
# ONE GATE INTEGRATED CLINIC SYSTEM
### Sistem Informasi Terpadu Satu Pintu Operasional Klinik & Rekam Medis Digital

```text
Prepared by  : Jupiter Cosmic (IT Solutions)
Prepared for : Manajemen Therapedia (Therapedia Developmental Center)
Periode      : Maret 2026
```

---

## DAFTAR ISI (TABLE OF CONTENTS)
* **01 Executive Summary**
* **02 Profile Perusahaan & Portofolio**
* **03 Pemahaman Kebutuhan Proyek & Rincian Fitur One Gate System**
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

Klinik Tumbuh Kembang Anak (*Pediatric Developmental Center*) memiliki dinamika operasional yang sangat kompleks dan spesifik. Sebagai institusi yang menangani berbagai layanan terapi multidisiplin (Okupasi Terapi, Sensori Integrasi, Terapi Wicara, Fisioterapi Pediatrik, Remedial, hingga Pendamping Sekolah/School Companion), **Therapedia** dihadapkan pada tantangan pengelolaan operasional hulu ke hilir yang menuntut akurasi tinggi:
1. **Koordinasi Multi-Cabang**: Memantau perkembangan operasional cabang (Surabaya Timur, Citraland, Surabaya Barat) secara terpusat tanpa jeda data (*real-time consolidated data*).
2. **Penjadwalan & Utilisasi Ruang**: Mengatur jadwal terapis berulang (*recurring schedule*), ketersediaan ruangan, dan waktu pasien tanpa ada risiko jadwal ganda (*conflict schedule*).
3. **Pencegahan Kebocoran Sesi Terapi**: Memastikan tidak ada pasien yang diterapi ketika kuota sesi sudah habis atau pembayaran belum divalidasi oleh bagian keuangan.
4. **Digitalisasi Asesmen Klinis**: Mengotomatisasi kuesioner psikologi anak (seperti *Sensory Profile 2 Winnie Dunn*) dari yang semula berbasis kertas menjadi sistem digital dengan kalkulasi skor kuadran sensori instan.
5. **Verifikasi Keuangan & Billing Terpadu**: Mengintegrasikan antrean validasi slip bukti transfer bank dari orang tua langsung dengan saldo sesi terapi anak di kalender operasional.
6. **Efisiensi Komunikasi Keluarga**: Mengotomatisasi pengingat sesi (H-1), pemberitahuan perpanjangan paket, dan pengiriman kode asesmen tanpa admin harus mengetik manual satu per satu.

Untuk menjawab kebutuhan tersebut, **Jupiter Cosmic** merancang dan menawarkan pengembangan **One Gate Integrated Clinic System**: sebuah platform web modern satu pintu yang menghandle keseluruhan ekosistem operasional **Therapedia**—mulai dari pendaftaran calon pasien baru (*intake*), asesmen psikologis, penjadwalan terapis, pencatatan SOAP rekam medis, verifikasi pembayaran kasir, hingga portal mandiri keluarga pasien dan otomatisasi WhatsApp.

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

Sistem *One Gate* untuk **Therapedia** dirancang mencakup **9 modul utama** yang saling terhubung dalam satu basis data terpusat:

### 1. Executive Multi-Branch & HQ Control (Pintu Direksi & Manajemen Pusat)
* **Multi-Branch Consolidated Monitoring**: Memantau operasional seluruh cabang Therapedia (Surabaya Timur, Citraland, Surabaya Barat) dalam satu tampilan komprehensif.
* **Executive Revenue Analytics Dashboard**:
  * Visualisasi Omzet Bruto (*Total Invoiced*), Penerimaan Kas Masuk (*Cash-In Collected*), dan Tagihan Tertunda (*Outstanding/Pending Receivables*).
  * Filter rentang waktu fleksibel: Mingguan, Bulanan, Triwulan, hingga *Custom Date Range*.
  * Grafik perbandingan pendapatan dan performa antar cabang.
* **Branch Utilization & Capacity KPI**:
  * Matriks persentase keterisian ruang terapi klinik per cabang (indikator kapasitas 80% - 100%).
  * Analitik retensi pasien aktif vs pasien lulus/selesai (*discharged*).
* **Staff Management & User Roster**:
  * Manajemen akun staf (Admin Intake, Admin Jadwal, Tim Finance, Manajer Cabang, dan Terapis).
* **Role-Based Access Control (RBAC) Matrix**:
  * Pengaturan hak akses granular per peran guna menjaga kerahasiaan data omzet keuangan dan privasi rekam medis anak.

### 2. Branch Operations Dashboard (Pintu Branch Manager)
* **Pusat Kontrol Cabang Mandiri**: Switcher cabang bagi manajer untuk memantau performa cabang spesifik yang dikelolanya.
* **Caseload Terapis & Jadwal Cabang**: Evaluasi beban sesi harian terapis per cabang dan pemantauan pasien baru.

### 3. Finance & Billing Gateway (Pintu Keuangan & Kasir)
* **Penerbitan Invoice Tagihan (*Invoice Issuance*)**:
  * Pembuatan tagihan digital untuk registrasi intake, sesi asesmen klinis, dan paket sesi terapi (Paket 10, 20, 30 sesi, atau paket kustom).
* **Antrean Verifikasi Bukti Transfer (*Payment Proof Verification Queue*)**:
  * Antrean khusus untuk memeriksa slip transfer yang diunggah orang tua.
  * **Interactive Proof Viewer**: Fitur modal untuk *zoom-in*, *zoom-out*, rotasi, dan pratinjau resolusi tinggi slip transfer.
  * Aksi validasi: **Approve (Lunas)** atau **Reject (Tolak)** disertai pencatatan alasan penolakan.
* **Otomatisasi Top-Up Saldo Kredit Sesi**:
  * Saldo kredit sesi anak (*remaining credits*) otomatis bertambah di kalender begitu invoice diverifikasi lunas oleh Finance.
* **Master Paket Layanan & Tarif**:
  * Pengaturan master harga paket, jumlah kuota kredit sesi, diskon, dan deskripsi program terapi.
* **Audit Trail Transaksi**:
  * Riwayat invoice lengkap dengan pencarian nomor invoice, filter cabang, tanggal, dan status verifikasi.

### 4. Intake Pipeline & Registrasi Pasien (Pintu Admin Inquiry)
* **Formulir New Intake Digital**:
  * Registrasi data anak, tanggal lahir, hitung usia otomatis, kontak orang tua, WhatsApp, email, dan pemilihan cabang tujuan.
* **Alur Pipeline 8 Tahap Non-Sekuensial**:
  1. *Data Profil Anak & Ortu*: Identitas lengkap dan kontak darurat.
  2. *Pilihan Layanan Klinis Multi-Disiplin*: Memilih lebih dari 1 layanan sekaligus (BOT-A, FOT-A, OT, SI, TW, FT, School Companion).
  3. *Questionnaire Code Generator*: Pembuatan kode akses unik kuesioner asesmen ortu dan guru pendamping sekolah.
  4. *Schedule Assessment Booking*: Menjadwalkan 1 atau lebih sesi asesmen langsung ke terapis terkait.
  5. *Review Jawaban Kuesioner*: Membuka hasil isian kuesioner ortu sebelum sesi evaluasi.
  6. *Google Drive Client Integration*: Tautan langsung ke folder arsip video observasi klinis dan dokumen rujukan medis anak.
  7. *Invoice Tagihan Asesmen & Status Bukti Transfer*: Memastikan pembayaran intake terpantau.
  8. *Final Decision Outcomes (Keputusan Akhir)*:
     * **Admit to Active Client** (Resmi menjadi klien aktif, dapat dijadwalkan meskipun kredit awal masih 0).
     * **Done Consult** (Selesai konsultasi evaluasi awal).
     * **Done Assessment** (Laporan selesai tanpa lanjut sesi terapi rutin).
     * **Discontinue** (Batal intake dengan dokumentasi alasan).

### 5. Mesin Kuesioner Asesmen Psikologi Klinis (Clinical Assessment Engine)
* **Master Data Kategori & Domain Sensori**:
  * Kategori klinis baku (Sensory Profile 2 Winnie Dunn, School Companion, Motorik Kasar & Halus, Wicara).
  * Pengelompokan domain: *Auditory, Visual, Touch, Movement, Body Position, Oral, Behavioral*.
* **Dynamic Clinical Question Builder (Mendukung 6 Tipe Pertanyaan)**:
  1. *Skala 0–5 Standar Winnie Dunn* (5: Hampir Selalu s/d 0: Tidak Berlaku).
  2. *Range Angka Kustom* (1–5, 1–10).
  3. *Pilihan Ganda (Single Choice)*.
  4. *Pilihan Jamak (Multi-Centang)*.
  5. *Teks Bebas / Esai Observasi Kualitatif*.
  6. *Pilihan Biner Ya / Tidak*.
* **Portal Pengisian Publik (`/assessment`)**:
  * Halaman pengisian kuesioner berbasis kode akses unik tanpa login rumit, ramah layar smartphone orang tua.
* **Kalkulasi Skor Kuadran Otomatis**:
  * Perhitungan skor kuadran sensori (*Low Registration, Sensation Seeking, Sensory Sensitivity, Sensation Avoiding*) dan format ringkasan evaluasi siap cetak.

### 6. Timetable & Penjadwalan Kalender (Pintu Admin Schedule & Front-Desk)
* **Weekly Timetable Grid & Day Agenda**:
  * Kalender mingguan interaktif (hari × jam operasional), filter terapis, ruangan, dan cabang.
* **Recurring Schedule Generator (Otomatisasi 12 Minggu)**:
  * Pembuatan jadwal rutin berulang untuk hari dan jam tertentu selama 12 minggu sekaligus.
* **Real-Time Conflict Detection Engine**:
  * Deteksi dini otomatis bentrok jadwal antara terapis, ruangan, dan waktu pasien, dengan opsi otorisasi *force schedule* bila darurat.
* **Proteksi Slot Frozen (❄️ Zero-Credit Protection)**:
  * Pasien aktif dengan sisa saldo **0 kredit sesi** tetap dapat memiliki slot jadwal di kalender namun berstatus **Frozen (Beku)**, sehingga terapis dan front-desk mengetahui sesi belum dapat dijalankan sebelum ada perpanjangan paket dari finance.
* **Session Lifecycle & Credit Rules**:
  * *Sesi Selesai (Completed)*: Otomatis memotong 1 saldo kredit sesi dan mencatat log kehadiran.
  * *Sesi Izin/Reschedule*: Tracking kuota cuti/izin (*leave quota*) tanpa memotong kredit sesi jika memenuhi SOP klinik.
* **Active Clients Directory & Birthday Radar**:
  * Manajemen pasien aktif, kartu riwayat terapi, dan tab pengingat ulang tahun anak untuk hubungan baik dengan keluarga pasien.
* **Discharge Flow**:
  * Alur kelulusan/terminasi terapi dengan pencatatan alasan (*Goal Achieved, Relocated, Financial, dll*) dan catatan evaluasi akhir.

### 7. Portal Terapis (Therapist Portal)
* **Personal Schedule**: Jadwal harian & mingguan terapis secara *real-time*.
* **Profil Pasien & Berkas Klinis**: Akses riwayat intervensi, diagnosa, jawaban kuesioner ortu, dan tautan GDrive video observasi.
* **Catatan Rekam Sesi & SOAP**:
  * Input catatan klinis: *Subjective, Objective, Assessment, Plan*.
  * Catatan latihan di rumah (*Home Program / Homework*) yang dapat diakses orang tua.

### 8. Portal Keluarga Pasien (Parent / Family Portal)
* **Akses Simpel Berbasis Kode Unik**:
  * Login cepat menggunakan kode pasien anak (tanpa perlu mendaftar email & password baru).
* **Kartu Status Tagihan & Upload Bukti Bayar**:
  * Indikator warna status tagihan (Merah: *Belum Dibayar*, Hijau: *Lunas Terverifikasi*) dan fitur upload bukti transfer langsung dari handphone.
* **Monitoring Saldo Kredit Sesi Terapi**:
  * Tampilan transparan jumlah sesi yang telah dijalani dan sisa sesi dari paket yang aktif.
* **Riwayat & Jadwal Terapi Anak**:
  * Memantau jadwal mendatang, nama terapis pendamping, dan riwayat kehadiran anak.

### 9. WhatsApp Automation & Communication Hub (6 Smart Scenarios)
Pusat komunikasi instan sekali klik (*one-click launch via wa.me*) dengan format pesan terstruktur:
1. *Undangan & Kode Kuesioner Asesmen*: Konfirmasi tanggal asesmen + kode akses formulir ortu.
2. *Pengingat Sesi Terapi (H-1)*: Reminder otomatis jadwal besok dan panduan persiapan fisik anak.
3. *Pemberitahuan Saldo Paket Menipis*: Reminder santun saat kuota terapi tersisa 1–2 sesi + info paket renewal.
4. *Pemberitahuan Laporan Evaluasi Siap*: Notifikasi bahwa laporan klinis anak telah selesai disusun.
5. *Penawaran Slot Kosong (Waiting List)*: Konfirmasi cepat penawaran slot batal kepada pasien antrean.
6. *Ucapan Ulang Tahun Pasien*: Pesan selamat ulang tahun ramah anak dari keluarga besar Therapedia.

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
| **Fase 1: Inisiasi & Arsitektur Database**<br>• Sprint 1 (System Setup & DB Design) | **Minggu 1** | • Finalisasi struktur database relasional MySQL One Gate System.<br>• Setup environment staging Laravel API & React.<br>• Implementasi sistem autentikasi (Sanctum) & skema user roles. |
| **Fase 2: Core Backend Development**<br>• Sprint 2 (Intake Pipeline & Assessment Engine) | **Minggu 2** | • REST API New Intake & 8-Tahap Pipeline non-sekuensial.<br>• Engine Asesmen Psikologi (6 tipe pertanyaan & kalkulasi kuadran).<br>• Integrasi halaman publik pengisian kuesioner ortu (`/assessment`). |
| **Fase 2: Penjadwalan & Logika Kredit**<br>• Sprint 3 (Timetable, Conflict & Credit Engine) | **Minggu 3** | • API Kalender mingguan & generator jadwal berulang (12 minggu).<br>• Engine deteksi jadwal bentrok terapis/ruangan.<br>• Otomatisasi pemotongan kredit sesi & penandaan slot Frozen 0 kredit. |
| **Fase 2: Finance & Portals Integration**<br>• Sprint 4 (Billing, Portals & WA Hub) | **Minggu 4** | • Modul Finance: Pembuatan invoice, antrean verifikasi bukti transfer, & approval modal.<br>• Portal Terapis (My Schedule & SOAP) & Portal Ortu (Akses Kode Pasien).<br>• Integrasi WhatsApp Communication Hub (6 skenario template pesan). |
| **Fase 3: Executive Analytics & QA**<br>• Sprint 5 (HQ Dashboard & System Testing) | **Minggu 5** | • Dashboard Revenue Multi-Cabang & Matriks Utilisasi Ruangan.<br>• Full integration frontend React dengan backend Laravel API.<br>• Stress testing, validasi integritas data, dan perbaikan bug. |
| **Fase 3: UAT, Deployment & Go-Live**<br>• Sprint 6 (Peluncuran & Handover) | **Minggu 6** | • Pelaksanaan UAT bersama tim staf Therapedia.<br>• Konfigurasi server produksi VPS, Nginx, domain resmi, & SSL HTTPS.<br>• Pelatihan staf, serah terima source code, dan sistem resmi Go-Live. |

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
| 1 | **Analisis Kebutuhan, Perancangan Arsitektur One Gate & Database Relasional (MySQL)**<br>*(Konfigurasi environment repository, skema migrasi database relasi multi-cabang, model data pasien, terapis, jadwal, & keuangan)* | Rp 2.000.000 |
| 2 | **Development Backend Core REST API (Laravel Framework)**<br>*(Autentikasi Sanctum, RBAC multi-role, API Client Intake, Pipeline status, Active Clients Roster, & CRUD Master)* | Rp 4.500.000 |
| 3 | **Development Core Engine (Penjadwalan, Kredit & Asesmen Psikologi)**<br>*(Conflict detection engine, recurring 12 minggu, pemotongan saldo kredit otomatis, proteksi slot frozen 0 kredit, serta engine kuesioner dinamis & kalkulasi kuadran sensori)* | Rp 3.500.000 |
| 4 | **Development Modul Finance, Invoicing, & Verifikasi Pembayaran**<br>*(Sistem pembuatan invoice tagihan, upload bukti transfer ortu, antrean validasi slip pembayaran, modal viewer bukti bayar, & renewal paket kredit)* | Rp 2.500.000 |
| 5 | **Integrasi Antarmuka Frontend React.js ke Backend API & WhatsApp Hub**<br>*(Sinkronisasi state, error handling, notifikasi toast, serta aktivasi modul 6 template otomatisasi pesan WhatsApp)* | Rp 3.500.000 |
| 6 | **Quality Assurance (Testing), Security Hardening, Deployment VPS & Go-Live**<br>*(UAT testing, konfigurasi Nginx web server, instalasi SSL HTTPS, panduan operasional manual, & serah terima sistem)* | Rp 2.000.000 |
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

Kami dari **Jupiter Cosmic** berkomitmen penuh untuk mewujudkan **One Gate System** sebagai fondasi digital yang kokoh bagi pertumbuhan dan efisiensi operasional **Therapedia**. Kami meyakini kehadiran sistem terpadu satu pintu ini akan menghapuskan inefisiensi manual, mencegah kebocoran sesi terapi, dan meningkatkan kualitas pelayanan bagi seluruh keluarga pasien Therapedia.

Kami siap untuk mendiskusikan penawaran ini lebih lanjut dan memulai langkah kerjasama yang produktif.

**Hormat kami,**  
**JUPITER COSMIC (IT SOLUTIONS)**  

**Muhammad Ikhsan**  
*Lead Developer & Technical Consultant*  
📞 WhatsApp : +62 812-2266-7763  
✉️ Email    : admin@Jupitercosmic.com  
🌐 Website  : www.JupiterCosmic.com  
