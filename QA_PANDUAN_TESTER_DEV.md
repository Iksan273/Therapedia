# Panduan QA & Tester — Therapedia One Gate Integrated Clinic System

**Untuk:** tim tester / QA
**Pasangan dokumen:** `QA_PANDUAN_UAT_KLIEN.md` (panduan untuk penguji klien), `TIMELINE_UAT_KLIEN.md` (jadwal UAT)
**Dibuat:** 11 Okt 2026 · **Status:** draf untuk review

Dokumen ini memuat: **(1)** penjelasan lengkap cara kerja aplikasi supaya Anda paham yang diuji, **(2)** persiapan tester per minggu, **(3)** daftar test case dengan hasil yang diharapkan, dan **(4)** cara melaporkan bug. Dokumen ini hanya berisi hal yang dikerjakan **tester**; pekerjaan teknis developer tidak dimuat di sini.

---

## Daftar isi
1. Tujuan dan ruang lingkup
2. **Memahami aplikasi (alur lengkap)**
3. Lingkungan, akun, dan data uji
4. Strategi uji
5. Persiapan tester per minggu
6. Siklus mingguan: Jumat → Sabtu → Senin
7. Katalog test case
8. Aturan yang harus selalu benar (konsistensi angka)
9. Uji non-fungsional (keamanan, mobile, tampilan)
10. Manajemen bug
11. Kriteria masuk dan keluar tiap sesi UAT
12. Regresi dan smoke test go-live
13. Lampiran: template dan checklist

---

## 1. Tujuan dan ruang lingkup

**Tujuan.** Menemukan masalah **sebelum** klien menguji pada hari Sabtu, sehingga waktu UAT (±3 jam) dipakai untuk validasi kebutuhan bisnis, bukan mencari bug dasar.

**Di dalam scope:** inquiry & asesmen, penjadwalan & kredit sesi, finance, portal terapis, portal orang tua, kuesioner publik (`/assessment`), dashboard, master data, user & hak akses, landing page (ID/EN), tampilan HP (375px) dan mode gelap halaman staf.

**Di luar scope:** integrasi Google Calendar (setelah go-live), WhatsApp otomatis, satu akun ortu untuk banyak anak, upload dokumen ke server (dokumen = link Google Drive), klasifikasi skor asesmen otomatis.

**Sumber kebenaran perilaku sistem:** dokumen ini (§2 dan §7) dan keputusan klien yang dirujuk. Bila yang Anda lihat berbeda dari dokumen ini, **laporkan sebagai bug** dan tulis rujukan bagian dokumennya; developer akan menjawab "bug", "sesuai requirement", atau "dokumen perlu diperbarui".

---

## 2. Memahami aplikasi (alur lengkap)

### 2.1 Apa itu Therapedia
Sistem operasional klinik tumbuh kembang anak **Therapedia Developmental Center** (cabang Surabaya: East, Citraland, West). Satu sistem untuk semua kegiatan klinik, dari calon pasien menghubungi klinik sampai laporan terapi dan keuangan.

Istilah dasar:
- **Client** = anak yang diterapi. Satu client = satu orang tua. Kode client contoh `KO-00001`.
- **Inquiry** = calon client yang baru menghubungi.
- **Sesi** = satu pertemuan (terapi atau asesmen) di kalender.
- **Kredit** = jumlah sesi terapi yang sudah dibayar dan belum terpakai.
- **Paket** = produk yang dibeli (mis. 10 sesi); tiap pembelian membuat satu paket kredit.

### 2.2 Gambaran besar: perjalanan satu client

```
 ORANG TUA                    KLINIK (STAF)                                   SISTEM
 ─────────                    ─────────────                                   ──────
 Menghubungi klinik  ─────▶   [Admin Inquiry] Intake baru                     Status: INQUIRY
 (WA/telepon)                    + kode client otomatis (KO-00001)
                              [Admin Inquiry] Pilih layanan                   Status: SERVICE SELECTED
                              [Admin Inquiry] Buat KODE KUESIONER             Status: ASSESSMENT SCHEDULED
                                 atau jadwalkan sesi asesmen
                                 (invoice assessment terbit otomatis bila diaktifkan)
 Isi kuesioner      ─────▶   (di /assessment, HP, sekali isi, wajib consent)
 (+ unggah bukti transfer                                                      Skor kuadran dihitung
  bila ada invoice)
                              [Terapis/Admin] Baca jawaban & skor              Status: ASSESSMENT DONE
                                                                               (setelah sesi asesmen selesai /
                                                                                diubah manual)
                              [Admin Inquiry] Putuskan hasil:
                                 Admit / Done Consult / Done Assessment / Discontinue
                              ── bila ADMIT ──
                              [Finance] Terbitkan invoice paket ─▶ Tandai Lunas ─▶ KREDIT bertambah
                              [Admin Schedule] Buat jadwal (tunggal / berulang)
                              [Terapis] Menjalankan sesi, isi laporan
                              [Admin Schedule] Tandai sesi Selesai ─────────▶ Kredit −1
 Melihat tagihan,    ◀─────   [Portal Orang Tua]
 kredit, laporan
                              Kredit < 3 ─▶ [Finance] Renewal ─▶ paket baru
                              ... (berulang) ...
                              [Admin] Discharge (alasan wajib)                Status: DISCHARGED
                                                                               (jadwal aktif dihapus, sisa sesi hangus)
```

### 2.3 Role (peran) dan tugasnya
| Role | Tugas utama | Menu utama | Catatan |
|---|---|---|---|
| **Master** (Direksi) | Mengatur semua; melihat semua cabang | Revenue & performa cabang, Master Cabang, User, Hak Akses, Master Data, semua modul | Satu-satunya yang melihat semua cabang secara default |
| **Manager** (Branch Manager) | Memantau satu cabang | Revenue cabang, Schedule Dashboard, kalender | Terkunci ke 1 cabang; boleh semua aksi di modul yang diizinkan |
| **Admin Inquiry** | Intake, pipeline, kuesioner | Pipeline client, Detail client, Kode kuesioner | Tidak mengurus tagihan (hanya melihat invoice) |
| **Admin Schedule** | Jadwal & sesi | Kalender, Active Client, Hari Libur, Monitoring Laporan, Utilization | Cancel/Off, reschedule, revert, aksi massal |
| **Finance** | Tagihan, kredit, cuti | Tab: Menunggu Pembayaran, Perlu Renewal, Semua Tagihan, Riwayat, Log Kredit & Saldo, Saldo Lebihan, Cuti, Paket | Void, Refund, Konversi, Reset Cuti Tahunan |
| **Terapis** | Menjalankan sesi | Jadwal saya, Summary & Laporan Sesi, Kalender Tim (baca saja) | Hanya data client/sesinya sendiri |
| **Orang Tua** | Memantau anaknya | Portal: tagihan, kredit, riwayat sesi & laporan, kuesioner | Login: kode client + tanggal lahir anak; tanpa kata sandi |
| **Role kustom** | Gabungan modul tertentu | Sesuai pengaturan Master | Contoh: "Admin Gabungan" |

**Aturan akses penting**
- Punya akses modul = boleh **semua aksi di modul itu kecuali hapus**.
- Tombol **hapus** hanya muncul untuk role dengan izin hapus **dan** akses modul.
- Staf selain Master **terikat satu cabang**; bisa diberi cabang "Semua cabang" (cabang kosong).
- Master dapat melihat semua modul; role lain sesuai pengaturan.

### 2.4 Pipeline status client
Tahapan (nama di layar bisa sedikit berbeda): **Inquiry → Service Selected → Assessment Scheduled → Assessment Done → Admitted**; hasil akhir lain: **Done Consult**, **Done Assessment**, **Discontinued**; setelah terapi: **Discharged**.

Aturan:
- Perubahan **otomatis** hanya **maju**, dan urutan langkah tidak dikunci (mis. langsung menjadwalkan asesmen dari Inquiry boleh).
- Perubahan **manual** boleh ke **tahap mana pun** (maju atau mundur), untuk koreksi atau mengaktifkan kembali client.
- **Discontinue** dan **Discharge** wajib alasan; Discontinue mencatat tanggal discontinue.
- **Discharge** menghapus semua jadwal aktif client dan menghanguskan sisa sesi; riwayat tetap.
- Client discharged/discontinued bisa **diaktifkan kembali** (menjadi Admitted).
- Client boleh di-Admit dengan kredit 0 (**Frozen**) sampai Finance menambah paket.

### 2.5 Kuesioner orang tua (`/assessment`)
1. Admin Inquiry membuat **kode kuesioner** (kategori asesmen, **layanan** yang dipilih, masa berlaku opsional: tanpa/7/14/30 hari, dan pilihan **dengan atau tanpa invoice**). Contoh kode: `SP2-K7M4QX`.
2. Bila dengan invoice: **invoice Assessment terbit otomatis** (nominal = harga layanan yang dipilih).
3. Admin mengirim **kode atau tautan** (`/assessment?code=...`) ke orang tua; dengan tautan, kode terisi otomatis.
4. Orang tua membuka di HP. Bila ada invoice: wajib **mengunggah bukti transfer** (JPG/PNG/PDF ≤ 5 MB). Cukup terunggah; tidak perlu menunggu lunas.
5. Orang tua mengisi **semua** pertanyaan, mencentang **persetujuan (consent)**, lalu kirim.
6. Aturan: **hanya sekali isi**; kode **kedaluwarsa** ditolak; orang tua **tidak melihat hasil**; semua staf internal boleh melihat jawaban dan skor kuadran (tanpa klasifikasi otomatis).
7. Kode yang **belum diisi** boleh dihapus (invoice belum lunas ikut terhapus); yang sudah diisi tidak bisa.

### 2.6 Penjadwalan dan status sesi
Kalender mingguan per terapis. Admin Schedule membuat jadwal **tunggal** atau **berulang** (pilih hari, tiap hari punya jam/terapis/paket sendiri, N minggu). Layanan **diambil dari client** (tidak ada pilihan layanan di form).

| Dari | Aksi | Ke | Efek kredit |
|---|---|---|---|
| Scheduled | **Selesai (Complete)** | Completed | Sesi terapi **−1 kredit**; sesi asesmen tanpa kredit dan memajukan status client |
| Scheduled | **Cancel / Off** | Cancelled | Admin **wajib memilih**: *Potong* atau *Jangan potong* |
| Scheduled | **Reschedule** (pindah slot) | Rescheduled | Netral |
| Scheduled | **Tandai menunggu jadwal pengganti** | Reschedule Pending | Netral |
| Reschedule Pending | Tetapkan jadwal baru | Rescheduled | Netral |
| Reschedule Pending | **Drop** | Cancelled | Admin **wajib memilih** potong atau tidak |
| Completed / Cancelled / Rescheduled / Pending | **Revert** (alasan wajib) | Kembali ke keadaan sebelumnya | Kredit dikoreksi; **hanya 1x** per aksi |

Aturan penting:
- **Cancel dan Off adalah satu aksi** dengan **satu daftar alasan**. Setiap alasan punya **KODE** (mis. S, OL, SCA, MCU, FM, TI, H); yang tampil di riwayat adalah KODE (nama panjang muncul sebagai petunjuk).
- Pilihan **Potong**: pakai **credit leave paket** dulu (kredit sesi tetap utuh). Credit leave habis → memotong **1 kredit sesi**. Pilihan **Jangan potong**: tidak memotong apa pun.
- **Bentrok** = terapis yang sama sudah menangani client lain di jam yang sama. Sistem memberi peringatan, admin boleh melanjutkan ("Schedule Anyway"). Reschedule yang bentrok **diblokir**.
- **Hari libur** tidak bisa dipilih dan **dilewati** oleh jadwal berulang. Hari libur boleh diinput **berentang tanggal**.
- Client **Frozen** (kredit 0) tetap bisa dijadwalkan; tampil dengan penanda khusus.
- Client yang sedang **cuti** tidak bisa ditambah jadwal aktif di tanggal cuti.
- Sesi **Completed** yang laporannya belum diisi muncul di **Monitoring Laporan**.
- **Ganti jadwal rutin** hanya mengganti sesi `Scheduled` mendatang pada pola itu; riwayat tidak diubah.
- **Aksi massal**: selesai, cancel, reschedule, revert untuk banyak sesi. Reschedule massal **atomik** (satu bermasalah = tidak ada yang tersimpan).

### 2.7 Kredit: cara kerjanya
- Setiap pembelian paket = **satu paket kredit** baru (bukan menambah ke paket lama). Total kredit = jumlah semua paket.
- Sesi dipotong dari paket yang dipilih saat penjadwalan, atau paket aktif tertua.
- **Frozen** = total kredit 0. Ini dihitung otomatis, bukan status yang diatur manual.
- Tidak ada saldo kredit negatif.
- **Log Kredit & Saldo** (Finance): satu baris = satu paket milik satu client, menampilkan sisa sesi, saldo rupiah, dan riwayat mutasi (pemakaian, cancel, revert, renewal, konversi, refund, discharge).

**Contoh hitungan (angka ilustrasi)** — dipakai sebagai pembanding saat menguji:
| Langkah | Kejadian | Kredit sesi | Credit leave |
|---|---|---|---|
| 0 | Paket Regular 10 sesi, credit leave 3 dilunaskan | 10 | 3 |
| 1 | 3 sesi Selesai | 7 | 3 |
| 2 | 1 sesi Cancel, pilih **Potong** | 7 | **2** |
| 3 | 1 sesi Cancel, pilih **Jangan potong** | 7 | 2 |
| 4 | 2 sesi Cancel lagi, **Potong** | 7 | **0** |
| 5 | 1 sesi Cancel, **Potong** (credit leave habis) | **6** | 0 |
| 6 | Revert cancel langkah 5 | 7 | 0 |
| 7 | Revert cancel langkah 5 lagi | **ditolak** (1x) | — |
| 8 | Sesi Reschedule / Pending | tidak berubah | tidak berubah |

### 2.8 Finance: tagihan sampai kredit
**Jenis invoice:** Paket Sesi, Assessment, dan Cuti (oleh Finance). Tidak ada diskon, DP, cicilan, atau jatuh tempo.
**Nomor invoice:** `INV-{KODE}-{YYYYMMDD}-{NNN}` (mis. `INV-REG-20261107-001`); KODE = kode paket, `ASM` untuk assessment, `CUT` untuk cuti; urutan reset tiap hari per kode.
**Snapshot:** harga, jumlah sesi, dan nama paket dikunci saat invoice terbit; mengubah master paket tidak mengubah invoice lama.

Alur utama:
```
Finance terbitkan invoice (Belum Lunas) ──▶ muncul di "Menunggu Pembayaran"
        │                                         │
        │ (pembayaran diterima)                   ▼
        └──────────────▶ Finance klik "Tandai Lunas" ──▶ Paket kredit BARU aktif (+N kredit)
                                                          Sesi mendatang pindah ke paket aktif
```
- **Orang tua tidak mengunggah bukti untuk invoice paket**; mereka hanya melihat status (Lunas / Menunggu Pembayaran).
- Satu-satunya kewajiban unggah bukti oleh orang tua: **invoice Assessment** sebelum mengisi kuesioner.
- Finance boleh **mengunggah/mengganti bukti manual** pada invoice (tidak mengubah status).
- **Langsung lunas**: pada Buat Tagihan (paket pertama) atau Renewal, pembayaran yang sudah diterima langsung dicatat lunas + paket aktif.
- **Renewal**: dua jalur (invoice baru, atau langsung lunas). Tab **Perlu Renewal** menampilkan client aktif dengan **total** sisa kredit **kurang dari 3**; tombol **Add Renewal** menerbitkan invoice dengan paket yang sama.
- **Hapus invoice**: hanya yang **belum lunas** (permanen). Invoice lunas tidak bisa dihapus.
- **Void**: hanya untuk invoice lunas yang **kreditnya belum dipakai** (alasan wajib; kredit dipertahankan). Bila kredit sudah dipakai → gunakan **Refund**.
- **Invoice pengganti**: saat membuat tagihan/renewal untuk client yang punya invoice void, wajib memilih "menggantikan INV-…" (paket lama dipakai ulang, **tanpa kredit ganda**) atau "paket baru".
- **Refund**: invoice lunas yang masih punya sisa kredit. Nominal otomatis = sisa kredit × harga per sesi, boleh diubah Finance (maksimal nilai invoice), alasan wajib. Sisa kredit menjadi 0; sesi mendatang pindah ke paket lain atau menjadi Frozen.
- **Revenue:** **Verified Revenue** = lunas − refund; **Gross** tetap memuat refund; invoice **void** tidak masuk angka mana pun.
- **Konversi paket** (mis. Senior → Regular): nilai sisa = sisa sesi × (harga paket ÷ total sesi); sesi baru = nilai sisa ÷ harga per sesi paket tujuan (dibulatkan **ke bawah**); **lebihan** menjadi **saldo** yang memotong invoice paket berikutnya. Semua jadwal terapi mendatang client **dihapus** (untuk dijadwalkan ulang); catatan Finance wajib; hanya sekali per invoice; tidak boleh ada kekurangan bayar.
  *Contoh:* Senior Rp 2.000.000 / 10 sesi, sisa 4 → nilai sisa Rp 800.000. Regular Rp 150.000/sesi → 5 sesi (Rp 750.000), lebihan **Rp 50.000**.
- **Log invoice**: setiap invoice punya riwayatnya sendiri (terbit, lunas, bukti, konversi, void, refund, pemakaian saldo).

### 2.9 Cuti dan credit leave (dua jatah berbeda!)
| | **Cuti 30 hari/tahun** | **Credit leave per paket** |
|---|---|---|
| Per apa | Per client, per tahun | Per paket |
| Yang mengatur | **Hanya Finance** (catat cuti, reset tahunan) | Master paket; terpakai saat Cancel/Off "Potong" |
| Memotong kredit sesi? | **Tidak** | Memotong lebih dulu sebelum kredit sesi |
| Sisa di akhir tahun | Hangus lewat **Reset Cuti Tahunan** (semua client kembali 30) | Paket reguler: tiap paket baru = jatah baru. Paket **satuan**: melanjutkan sisa, kecuali **Reset credit leave** dipilih saat renewal |

Aturan cuti (Finance):
- Cuti dicatat sebagai **rentang tanggal**; **hanya bisa bila client punya sesi terapi di rentang itu**.
- Hari cuti dihitung dari **sesi pertama sampai sesi terakhir** di rentang. *Contoh:* rentang 7–14 Okt, sesi 8 dan 12 Okt → **5 hari**.
- Sesi di rentang menjadi **Cancelled dengan kode OL** tanpa memotong kredit apa pun.
- Melewati 30 hari hanya **peringatan** (tidak diblokir).
- **Akhiri Lebih Awal** (isi tanggal anak masuk lagi): sesi sejak tanggal itu kembali Scheduled, hari kembali ke saldo. **Void**: seluruh cuti dibatalkan. **Tidak ada tombol Hapus** log cuti.
- Paket satuan: maksimal 1x cuti per bulan kalender.
- Finance dapat menerbitkan **invoice cuti** (nominal manual, tidak menambah kredit), opsional ditautkan ke log cuti.

### 2.10 Portal Terapis
Jadwal sendiri; **Summary & Laporan Sesi** (termasuk **Rekap Harian** dengan filter periode, mis. "Kamis 25 Okt · 3 Hours · daftar client"); isi **laporan sesi** (Activity, Note, Homework); detail client; hasil asesmen; cetak laporan; **Kalender Tim** (baca saja: tampilan Hari = semua terapis, Minggu = per terapis).

### 2.11 Portal Orang Tua
Login dengan **kode client + tanggal lahir anak**. Menampilkan: status tagihan (invoice void tidak ditampilkan; **tidak ada Riwayat Invoice**), sisa kredit, riwayat sesi completed dan laporan (tombol **View Report nonaktif** bila laporan kosong), **export laporan harian**, dan daftar kuesioner yang belum diisi (wajib unggah bukti invoice assessment dulu). **Kode kuesioner tidak ditampilkan** di portal.

### 2.12 Dashboard dan laporan
- **Revenue** (Master/Manager): Gross, Verified, Pending; filter rentang termasuk kustom.
- **Inquiry:** funnel, **Total Discharge** + report per alasan, log drop-off, daftar menunggu kuesioner (ada pencarian).
- **Schedule:** **Cancellation Rate** keseluruhan, **Therapist Off Rate** (alasan yang ditandai Therapist Off tetap dihitung di rate keseluruhan).
- **Availability & Utilization** per terapis/cabang: sesi terjadwal ÷ maksimal sesi per bulan (1 sesi = 1 jam); kapasitas menyesuaikan filter periode.
- **Active Client:** roster (Active/Discharged/Discontinued), detail, analitik kehadiran (tidak hadir = hanya cancel yang memotong kredit), birthday, re-assessment.
- **Branch performance:** perbandingan antar cabang.

### 2.13 Hapus data (penting!)
- **Hapus bersifat permanen dan berantai (cascade).**
  - Hapus **client** → ikut terhapus sesi, invoice, kredit, kuesioner, dan log client itu; invoice lunas keluar dari revenue.
  - Hapus **invoice** → hanya yang belum lunas.
  - Hapus **cabang** → semua isi cabang terhapus; wajib mengetik kode cabang.
  - Hapus **master** yang sudah pernah dipakai → **ditolak**.
- Tombol hapus hanya untuk role berizin hapus. Staf tidak dihapus, hanya **dinonaktifkan**.

### 2.14 Aturan tampilan umum
- Semua daftar: **10 data per halaman** dengan pagination.
- Bahasa Indonesia (istilah klinik boleh English); landing page ID/EN.
- Mode gelap tersedia di halaman staf; halaman publik (landing, `/assessment`) selalu terang.
- Uang tampil dalam rupiah; tanggal dalam format Indonesia; jam format 24 jam.

### 2.15 Peta menu singkat per role
| Role | Menu |
|---|---|
| Master | Revenue · Performa Cabang · Cabang · User · Hak Akses · Master Data · modul lain |
| Manager | Revenue cabang · Schedule Dashboard · Kalender · Active Client |
| Admin Inquiry | Pipeline · Detail Client · Kode Kuesioner · Master Asesmen |
| Admin Schedule | Kalender · Active Client · Hari Libur · Monitoring Laporan · Utilization |
| Finance | Menunggu Pembayaran · Perlu Renewal · Semua Tagihan/Buat Tagihan · Riwayat · Log Kredit & Saldo · Saldo Lebihan · Cuti · Paket |
| Terapis | Jadwal Saya · Summary & Laporan · Kalender Tim |
| Orang Tua | Beranda portal (tagihan, kredit, sesi, laporan, kuesioner) |

### 2.16 Cerita uji utuh (satu client dari awal sampai akhir)
Pakai cerita ini sebagai kerangka UAT ronde 1 dan sebagai kerangka uji end-to-end Anda sendiri.

1. **Admin Inquiry** membuat intake "Kenzo" → kode `KO-00001`, status Inquiry.
2. Memilih layanan → Service Selected. Membuat kode kuesioner (dengan invoice) → invoice assessment terbit otomatis, status Assessment Scheduled.
3. **Orang tua** (HP) membuka tautan → unggah bukti → isi → consent → kirim. Coba buka kode yang sama lagi → ditolak.
4. **Finance** menandai invoice assessment lunas.
5. **Admin Inquiry** membaca skor, memilih **Admit**.
6. **Finance** menerbitkan invoice paket Regular 10 sesi → **Tandai Lunas** → 10 kredit.
7. **Admin Schedule** membuat jadwal berulang 2×/minggu, 12 minggu (melewati hari libur).
8. **Terapis** menjalankan 3 sesi, mengisi laporan; **Admin Schedule** menandai Selesai → sisa 7.
9. **Admin Schedule** meng-Cancel 1 sesi dengan Potong → credit leave berkurang, kredit tetap 7; reschedule 1 sesi; revert 1 aksi.
10. **Orang tua** membuka portal: tagihan lunas, sisa kredit 7, riwayat 3 sesi, View Report aktif untuk sesi yang laporannya terisi.
11. Setelah kredit < 3: **Finance** → Perlu Renewal → Add Renewal → lunas.
12. **Finance** mencatat cuti 1 minggu → sesi jadi Cancelled kode OL; akhiri lebih awal.
13. **Manager/Master** membuka dashboard: revenue, utilization, rate.
14. **Admin Schedule** melakukan Discharge (alasan) → jadwal aktif hilang.
15. **Master** menghapus client uji → semua data terkait hilang.

### 2.17 Glosarium
| Istilah | Arti |
|---|---|
| Admit | Client diterima menjadi client aktif |
| Frozen | Kredit total 0; jadwal tetap bisa dibuat |
| Credit leave | Jatah per paket yang dipotong lebih dulu saat Cancel/Off "Potong" |
| Cuti 30 hari | Jatah tahunan per client, hanya Finance |
| Void | Membatalkan invoice lunas yang kreditnya belum dipakai |
| Refund | Pengembalian dana untuk sisa kredit yang sudah berjalan |
| Konversi | Mengubah sisa sesi paket ke paket lain |
| Saldo lebihan | Sisa nilai konversi yang memotong invoice berikutnya |
| Snapshot | Nilai (harga, sesi) yang dikunci saat invoice terbit |
| Re-assessment | Asesmen ulang untuk client aktif |
| Verified Revenue | Revenue lunas dikurangi refund |
| Gross | Total invoice termasuk nominal refund |
| Sign-off | Persetujuan tertulis klien atas hasil UAT |

---

## 3. Lingkungan, akun, dan data uji

### 3.1 Lingkungan: hanya satu (UAT), dipakai bersama
Tidak ada lingkungan staging. **Satu lingkungan UAT** dipakai oleh **developer** (memasang build), **tester** (menguji Selasa–Kamis dan Jumat), dan **klien** (UAT Sabtu). Setelah go-live ada lingkungan **Produksi** untuk data nyata.

| Env | Dipakai oleh | Data |
|---|---|---|
| **UAT** | Developer, tester, klien | Data seed awal + data hasil uji; **tidak di-reset tiap minggu** |
| Produksi | Klien setelah go-live | Data nyata; **jangan uji destruktif** |

Alamat dan akun dikirim developer.

**Aturan pemakaian bersama (wajib dipatuhi tester)**
1. **Pisahkan data tester dari data klien.** Setiap data yang Anda buat (client, staf, paket, invoice, kode kuesioner) diberi akhiran **` (QA)`** pada namanya, mis. `Kenzo (QA)`. Data klien memakai awalan/penanda sendiri dari mereka. Jangan mengubah atau menghapus data tanpa akhiran `(QA)`.
2. **Client khusus (§3.4) punya dua set**: `QA-…` untuk tester dan `UAT-…` untuk klien. Tester hanya memakai set `QA-…`; set `UAT-…` dibiarkan utuh sampai Sabtu. Bila satu client `QA-…` sudah terpakai (mis. sudah di-void), minta developer memulihkannya atau gunakan cadangannya.
3. **Build bisa berganti kapan saja Senin–Kamis.** Developer mengumumkan setiap pemasangan build (nomor/tanggal). Sebelum mulai menguji, **cek nomor build**; catat di lembar bug.
4. **Jumat 14.00 build dibekukan.** Dari Jumat 14.00 sampai UAT Sabtu selesai tidak ada pemasangan build, kecuali perbaikan masalah Kritis yang diumumkan ke semua pihak.
5. **Uji yang bersifat massal atau merusak ⚠** (Reset Cuti Tahunan, hapus cabang, hapus banyak data) memengaruhi **semua pengguna**. Lakukan hanya pada data/cabang khusus uji (cabang `UAT-Hapus`, client `QA-HAPUS`) dan **setelah memberi tahu developer**. Reset Cuti Tahunan mengubah saldo cuti **seluruh client**, jadi jadwalkan hanya di waktu yang disepakati (mis. Kamis sore, setelah klien selesai memakai data cuti, dan sebelum Jumat 14.00), lalu beri tahu developer agar saldo uji dipulihkan.
6. **Reset/pemulihan data** hanya oleh developer dan hanya pada waktu yang diumumkan (setelah backup). Jangan mengandalkan data uji bertahan lebih dari seminggu.
7. **Jangan menguji di jam UAT klien** (Sabtu) selain mendampingi dan mencatat; tester tidak membuat atau mengubah data selama sesi klien berlangsung kecuali demi mereproduksi temuan.

### 3.2 Perangkat uji
Chrome dan Edge terbaru (utama); Firefox dan Safari (smoke); **Android Chrome** dan **iPhone Safari** untuk portal ortu dan `/assessment`. Ukuran layar: **375px** (HP), 768px (tablet), 1280px (desktop). Uji mode terang dan gelap untuk halaman staf.

### 3.3 Akun uji
Satu akun per role per cabang yang relevan. Password sementara dikirim developer; wajib diganti saat login pertama.

| Role | Cabang | Hal khusus yang diuji |
|---|---|---|
| Master | semua | hapus cabang, reset password, hak akses |
| Manager | 1 | semua aksi di modul yang diizinkan |
| Admin Inquiry | 1 | intake, kuesioner, outcome |
| Admin Schedule | 1 | cancel/off, revert, bulk |
| Finance | 1 | void, refund, konversi, cuti |
| Terapis | 1 | hanya data sendiri |
| Orang Tua | — | login kode client + tanggal lahir |
| Role kustom | 1 | sebagian modul, tanpa izin hapus |

### 3.4 Data uji yang tersedia
Tersedia ±40 client di berbagai tahap pipeline, 3 cabang + 1 cabang kosong "UAT-Hapus" untuk uji hapus, ±14 staf, hari libur 2026, dan beberapa **client khusus** untuk kasus tertentu. Tiap kode ada **dua set**: awalan `QA-` (untuk tester) dan `UAT-` (untuk klien); isinya sama. Tabel memakai awalan `UAT-`; tester membaca sebagai `QA-` (mis. `QA-VOID`).

| Kode | Kondisi | Dipakai untuk |
|---|---|---|
| `UAT-FROZEN` | Admitted, kredit 0, ada sesi mendatang | Frozen; aktivasi paket |
| `UAT-LOW` | Total sisa kredit 2 | Perlu Renewal, Add Renewal |
| `UAT-CANCEL` | Paket reguler, credit leave 3 belum terpakai | Cancel/Off, credit leave habis |
| `UAT-SATUAN` | Paket satuan dengan credit leave tersisa | Credit leave tidak reset |
| `UAT-CUTI` | Sesi 2×/minggu mulai besok | Cuti, akhiri lebih awal, void cuti |
| `UAT-VOID` | Invoice lunas, kredit belum dipakai | Void + invoice pengganti |
| `UAT-REFUND` | Invoice lunas, sebagian kredit terpakai | Refund |
| `UAT-KONVERSI` | Paket Senior lunas, sisa 4 sesi | Konversi Senior → Regular |
| `UAT-DUP` | Nama + tanggal lahir sama dengan client lain | Peringatan duplikat |
| `UAT-HAPUS` | Punya sesi, invoice, kuesioner terisi | Hapus permanen |

Client khusus bisa **habis terpakai** (mis. invoice sudah di-void atau dihapus). Bila set `QA-…` yang Anda butuhkan sudah habis, minta developer memulihkannya. Set `UAT-…` jangan disentuh.

---

## 4. Strategi uji

### 4.1 Jenis pengujian yang Anda lakukan
| Jenis | Isi | Kapan |
|---|---|---|
| **Uji fungsi** | Menjalankan test case (§7) per modul | Selasa–Kamis tiap minggu |
| **Uji alur lengkap** | Cerita uji utuh (§2.16) lintas role | Mulai D4, penuh D6 |
| **Regresi** | Mengulang test case P0 dan bug yang pernah ditemukan (§12) | Kamis tiap minggu |
| **Smoke** | 15 menit per role pada build yang dibekukan | Jumat sore |
| **Non-fungsional** | Keamanan dasar, mobile, tampilan (§9) | D6–D7 |
| **Retest bug** | Memastikan bug yang diperbaiki benar-benar beres | Setelah developer menandai diperbaiki |
| **Pendampingan UAT** | Hadir Sabtu, mencatat temuan klien | Sabtu |

### 4.2 Prioritas test case
- **P0** (wajib sebelum tiap build dibekukan): login, hak akses, kredit dan saldo, invoice dan lunas, hapus berantai, bentrok jadwal.
- **P1**: alur utama tiap role, laporan, dashboard.
- **P2**: tampilan, teks, ekspor, kenyamanan.

### 4.3 Teknik
Jalur normal + salah input + nilai batas + klik ganda + dua pengguna bersamaan + bolak-balik (selesai → revert → selesai lagi) + data lintas cabang (tidak boleh bocor).

---

## 5. Persiapan tester per minggu

Format: **Sebelum minggu** → **Selama minggu** → **Jumat** → **Sabtu**. Tanggal mengikuti timeline.

### Minggu 1 — 12–16 Okt (belum ada UAT)
**Sebelum (10–11 Okt)**
- [ ] Baca dokumen ini sampai §2 selesai; tanyakan bagian yang belum jelas.
- [ ] Siapkan lembar pelacak test case (spreadsheet: ID TC, minggu, hasil, build, bug terkait).
- [ ] Siapkan lembar bug (§13 B) dan folder screenshot per minggu.
- [ ] Siapkan perangkat: laptop, Android, iPhone; install Chrome/Edge.

**Selama**
- [ ] Pelajari alur dari demo prototipe (akun demo dari developer) dengan mengikuti cerita uji §2.16.
- [ ] Tulis daftar **pertanyaan** tentang aturan yang meragukan; kirim ke developer sebelum Jumat.
- [ ] Pecah §7 per modul menjadi lembar uji per minggu.

**Jumat:** serahkan daftar pertanyaan dan lembar pelacak. **Sabtu:** tidak ada UAT.

### Minggu 2 — 19–23 Okt (UAT #1 Sabtu 24 Okt: login, hak akses, master data, cabang)
**Sebelum**
- [ ] Terima akun UAT; coba login semua role.
- [ ] Siapkan data uji: 2 staf fiktif, 1 cabang fiktif, 1 paket fiktif, 2 alasan Cancel/Off.

**Selama**
- [ ] Jalankan TC: **AUTH, RBAC, MST, BRN, HOL** (§7.1–7.5).
- [ ] Mulai **CLI** (intake).
- [ ] Uji dari HP: login dan halaman utama.

**Jumat:** smoke 15 menit per role di UAT; laporkan bug. **Sabtu:** hadir, catat temuan klien; rekap 30 menit sesudahnya.

### Minggu 3 — 26–30 Okt (UAT #2 Sabtu 31 Okt: intake dan kuesioner)
**Sebelum**
- [ ] Triase bug UAT #1 bersama developer.
- [ ] Siapkan 1 orang tua uji (HP) dan 5 kode kuesioner: 1 valid dengan invoice, 1 valid tanpa invoice, 1 kedaluwarsa, 1 sudah terisi, 1 untuk dihapus.

**Selama**
- [ ] TC: **CLI, STA, ASM, QST** lengkap (§7.6–7.8), termasuk dari HP sungguhan.
- [ ] Uji **hapus client** (`QA-HAPUS`, bukan `UAT-HAPUS`): pastikan data terkait hilang.
- [ ] Mulai **SCH** (jadwal dasar).

**Jumat:** smoke; **Sabtu:** UAT #2.

### Minggu 4 — 2–6 Nov (UAT #3 Sabtu 7 Nov, Checkpoint 50%: jadwal lengkap + pratinjau tagihan)
**Sebelum**
- [ ] Triase bug UAT #2.
- [ ] Siapkan skenario bulk: 8 sesi lintas terapis, 1 di antaranya bentrok.
- [ ] Siapkan lembar hitung manual kredit (§2.7) untuk membandingkan hasil sistem.

**Selama**
- [ ] TC: **SCH, SES, REV, BLK, LVE** (§7.9–7.13) dan **FIN-01…FIN-14** (invoice, tandai lunas, renewal).
- [ ] Setelah **setiap** skenario kredit, cek konsistensi (§8): angka di Log Kredit & Saldo sama dengan hitungan manual.
- [ ] Uji klik ganda pada Selesai dan Tandai Lunas.

**Jumat:** smoke + regresi P0; **Sabtu:** UAT #3 (menentukan Termin 2).

### Minggu 5 — 9–13 Nov (UAT #4 Sabtu 14 Nov: tagihan, kredit, keuangan)
**Sebelum**
- [ ] Triase bug UAT #3.
- [ ] Siapkan lembar hitung manual untuk **konversi, refund, Verified vs Gross** (contoh §2.8).

**Selama**
- [ ] TC: **FIN-15…FIN-31**, **LVE** (cuti Finance, reset tahunan, invoice cuti).
- [ ] Uji hak: role selain Finance/Master tidak bisa void/refund/konversi.
- [ ] Verifikasi angka dashboard revenue terhadap hitungan manual (selisih harus Rp 0).

**Jumat:** smoke + regresi; **Sabtu:** UAT #4.

### Minggu 6 — 16–20 Nov (UAT #5 Sabtu 21 Nov: ronde 1 menyeluruh)
**Sebelum**
- [ ] Triase bug UAT #4.
- [ ] Siapkan skrip uji utuh lintas role (§2.16) untuk ronde 1.

**Selama**
- [ ] TC: **ACT, PRT, PAR, DSH** (§7.15–7.18).
- [ ] Uji **mobile 375px** seluruh portal ortu dan `/assessment`; uji **mode gelap**; uji **ekspor** PDF/Excel.
- [ ] Jalankan **seluruh cerita uji §2.16** minimal dua kali dengan data berbeda.
- [ ] Regresi penuh.

**Jumat:** smoke; **Sabtu:** UAT #5 (ronde 1).

### Minggu 7 — 23–27 Nov (UAT #6 Sabtu 28 Nov: uji ulang + sign-off)
**Sebelum**
- [ ] Kategorikan semua bug ronde 1 (Kritis/Mayor/Minor/Saran) bersama developer; buat **daftar retest**.

**Selama**
- [ ] **Retest** semua bug yang ditandai diperbaiki; centang di lembar bug.
- [ ] TC **NFR** (§9): keamanan dasar, lintas cabang, mobile, tampilan.
- [ ] Regresi penuh; siapkan formulir sign-off (`QA_PANDUAN_UAT_KLIEN.md` Lampiran C).

**Jumat:** smoke; **Sabtu:** UAT #6 + sign-off.

### Minggu 8 — 30 Nov–4 Des (training dan go-live)
- [ ] Dukung training: skrip demo per role, data latih.
- [ ] Rabu: bantu klien memeriksa sampel 20 client hasil pindah data (nama, tanggal lahir, saldo kredit, paket aktif).
- [ ] Kamis–Jumat: smoke test (§12.2) setelah build akhir; konfirmasi ke developer.
- [ ] Sabtu 5 Des: cadangan retest.

---

## 6. Siklus mingguan: Jumat → Sabtu → Senin

| Waktu | Kegiatan | Siapa |
|---|---|---|
| Senin–Kamis | Developer memasang build dan mengumumkannya; tester mengecek nomor build lalu menguji pada data `(QA)` | Developer + Tester |
| Kamis | Regresi mingguan; daftar TC gagal dikirim ke developer | Tester |
| **Jumat 14.00** | Build UAT dibekukan dan dipasang oleh developer | Developer |
| Jumat 14.00–15.30 | Smoke 15 menit per role di build beku; pastikan data klien (`UAT-…`) utuh | Tester |
| Jumat 16.00 | Catatan rilis + lembar skenario Sabtu dikirim ke klien | Developer/Tester |
| Sabtu (jam disepakati) | UAT: tester mencatat semua temuan klien secara langsung | Tester + Developer |
| Sabtu +30 menit | Rekap cepat: skenario lulus/gagal, bug per tingkat | Tester |
| Sabtu sore/Minggu | Triase bug, tentukan prioritas minggu depan | Tester + Developer |
| Senin pagi | Semua temuan dibalas; bug baru masuk lembar bug | Developer |

---

## 7. Katalog test case

Kolom: **ID · Prioritas · Langkah · Hasil yang diharapkan**. Catat tiap TC lulus/gagal per build di lembar pelacak.

### 7.1 AUTH — Login dan akun
| ID | P | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| AUTH-01 | P0 | Login staf dengan email + password benar | Masuk ke halaman awal sesuai role |
| AUTH-02 | P0 | Login dengan password salah / email tidak terdaftar | Pesan **umum** (tidak menyebut mana yang salah) |
| AUTH-03 | P0 | Salah password berulang | Dibatasi sementara dengan pesan jelas; setelah jeda bisa coba lagi |
| AUTH-04 | P0 | Login pertama dengan password sementara | **Wajib ganti password**; menu lain tidak bisa dibuka sebelum selesai |
| AUTH-05 | P1 | Lupa password: minta kode OTP via email | Email masuk; kode berlaku ±10 menit |
| AUTH-06 | P1 | Masukkan kode OTP salah 5x | Terkunci/ditolak; kode lama tidak bisa dipakai |
| AUTH-07 | P1 | Master mereset password seorang staf | Password sementara baru; wajib ganti saat login |
| AUTH-08 | P0 | Staf dinonaktifkan lalu mencoba login | Ditolak; riwayat datanya tetap |
| AUTH-09 | P0 | Login ortu: kode client + tanggal lahir anak benar | Masuk portal; hanya data anak itu |
| AUTH-10 | P0 | Login ortu: tanggal lahir salah / kode tidak ada | Pesan umum; percobaan berulang dibatasi |
| AUTH-11 | P0 | Logout lalu tombol Back browser | Tidak bisa melihat halaman terlindungi |
| AUTH-12 | P1 | Sesi lama kedaluwarsa | Diarahkan ke halaman login |

### 7.2 RBAC — Hak akses
| ID | P | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| RBAC-01 | P0 | Tiap role login, periksa menu | Menu **sesuai peran**; modul tanpa akses tidak tampil |
| RBAC-02 | P0 | Ketik alamat halaman yang bukan hak role | Ditolak / diarahkan, bukan halaman kosong |
| RBAC-03 | P0 | Role dengan akses modul tapi **tanpa izin hapus** | Semua aksi non-hapus bisa; **tidak ada tombol hapus** |
| RBAC-04 | P0 | Role dengan izin hapus tapi tanpa akses modul | Tetap tidak bisa menghapus di modul itu |
| RBAC-05 | P0 | Non-master mengakses data cabang lain (ubah ID di alamat) | Ditolak / kosong |
| RBAC-06 | P1 | Akun cabang "Semua cabang" | Bisa berpindah cabang; data sesuai |
| RBAC-07 | P1 | Master mengubah matriks role kustom | Berlaku setelah login ulang/refresh |
| RBAC-08 | P1 | Hapus role yang masih dipakai | Ditolak (masih dipakai) |
| RBAC-09 | P0 | Terapis membuka data terapis/client lain | Ditolak (kecuali Kalender Tim baca saja) |
| RBAC-10 | P0 | Ortu mencoba membuka halaman staf / data anak lain | Ditolak |
| RBAC-11 | P1 | Manager mengubah status sesi | Diizinkan (akses modul); hapus tidak, bila izin hapus mati |

### 7.3 MST — Master data
| ID | P | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| MST-01 | P1 | Tambah/ubah layanan, kuadran, alasan discharge | Tersimpan; muncul di pilihan di modul lain |
| MST-02 | P0 | Alasan Cancel/Off: tambah dengan **KODE** | Kode wajib dan unik; satu daftar untuk cancel dan off; ada penanda Therapist Off |
| MST-03 | P0 | Master paket: nama, jumlah sesi, harga, kode paket, credit leave, satuan/asesmen | Kode paket unik; `ASM` dan `CUT` ditolak (dicadangkan); mengubah paket **tidak mengubah invoice lama** |
| MST-04 | P0 | Hapus master yang sudah dipakai | Ditolak dengan pesan "masih dipakai" |
| MST-05 | P1 | Master asesmen: kategori + kode jenis, section, soal semua tipe (termasuk tanggal lahir) | Tampil benar di form kuesioner; soal yang sudah dipakai tidak bisa dihapus |
| MST-06 | P1 | Daftar master panjang | 10 per halaman, urutan stabil |

### 7.4 BRN — Master Cabang
| ID | P | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| BRN-01 | P0 | Tambah cabang (kode dan nama) | Muncul di pilihan; kode/nama ganda ditolak |
| BRN-02 | P1 | Nonaktifkan cabang | Tidak muncul di pilihan baru; riwayat tetap |
| BRN-03 | P0 | Lihat ringkasan dampak hapus cabang | Menampilkan jumlah staf, client, sesi, invoice yang akan hilang |
| BRN-04 | P0 | Hapus cabang: **ketik kode cabang** | Salah ketik → tombol nonaktif; benar → terhapus |
| BRN-05 | P0 | Setelah hapus cabang, cari data cabang itu di semua modul | Tidak ada client, sesi, invoice, libur, staf dari cabang itu; cabang lain utuh |
| BRN-06 | P1 | Non-master membuka Master Cabang | Ditolak |

### 7.5 HOL — Hari libur
| ID | P | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| HOL-01 | P0 | Tambah libur satu tanggal | Tersimpan; tanggal ganda tidak menggandakan |
| HOL-02 | P0 | Tambah libur **rentang** (Dari–Sampai) | Semua tanggal dalam rentang terisi |
| HOL-03 | P0 | Buat jadwal tunggal di hari libur | Ditolak dengan pesan jelas |
| HOL-04 | P0 | Jadwal berulang yang melewati hari libur | Tanggal libur **dilewati**; ada pemberitahuan jumlah yang dilewati |
| HOL-05 | P1 | Ubah/hapus libur | Hanya yang berhak |
| HOL-06 | P1 | Kalender pada tanggal libur | Ditandai dan tidak bisa dipilih |

### 7.6 CLI — Client dan pipeline
| ID | P | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| CLI-01 | P0 | Intake baru lengkap | Status Inquiry; **kode client** terbentuk |
| CLI-02 | P0 | Kode untuk nama berawalan A, F, K, P, U | Grup **AE, FJ, KO, PT, UZ**; 5 digit berurutan per grup; tidak ada kode ganda; **tidak berubah saat nama diedit** |
| CLI-03 | P0 | Dua petugas membuat intake bersamaan | Kode tidak ganda |
| CLI-04 | P1 | Kosongkan field wajib (nama, tanggal lahir, orang tua, WA, email) | Pesan per field dalam bahasa Indonesia |
| CLI-05 | P1 | Intake dengan nama + tanggal lahir sama client lain | **Peringatan duplikat**, tidak memblokir |
| CLI-06 | P1 | Pencarian: awal nama anak, awal nama orang tua, kode | Hasil benar; **email tidak dicari**; 10 per halaman |
| CLI-07 | P1 | Filter cabang dan status | Sesuai; cabang lain tidak bocor |
| CLI-08 | P1 | Edit biodata dan catatan intake | Tersimpan; bila dua orang mengedit bersamaan, yang kedua mendapat pesan data sudah berubah |
| CLI-09 | P1 | Pilih beberapa layanan | Tersimpan; status maju ke Service Selected bila masih Inquiry |
| CLI-10 | P1 | Isi link Google Drive | Tersimpan sebagai tautan |
| CLI-20 | P0 | **Hapus client** (role berizin hapus) | Client dan semua data terkait (sesi, invoice, kredit, kuesioner) hilang dari semua modul; revenue tidak lagi memuat invoice client itu |
| CLI-21 | P0 | Hapus client oleh role tanpa izin hapus | Tombol tidak ada |
| CLI-22 | P1 | Konfirmasi hapus | Ada dialog konfirmasi tegas |

### 7.7 STA — Status pipeline
| ID | P | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| STA-01 | P0 | Langkah otomatis: pilih layanan, buat kode/jadwalkan asesmen, asesmen selesai | Status hanya **maju**; urutan langkah bebas |
| STA-02 | P0 | Langkah otomatis pada client dengan hasil akhir | Status hasil akhir tidak tertimpa |
| STA-03 | P0 | Ubah status **manual** ke tahap mana pun | Berhasil; tercatat di riwayat status |
| STA-04 | P0 | Admit | Admitted; tanggal bergabung terisi; boleh 0 kredit |
| STA-05 | P1 | Done Consult / Done Assessment | Status sesuai |
| STA-06 | P0 | Discontinue | Alasan wajib; tanggal discontinue terisi |
| STA-07 | P0 | Discharge | Alasan wajib; jadwal aktif **hilang**; sisa sesi **hangus**; riwayat sesi tetap |
| STA-08 | P1 | Aktifkan kembali client Discharged/Discontinued | Menjadi Admitted; data keluar dikosongkan |
| STA-09 | P1 | Riwayat status | Urut waktu, nama pelaku terisi |

### 7.8 ASM / QST — Asesmen dan kuesioner
| ID | P | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| ASM-01 | P1 | Buat kategori, section, dan soal semua tipe | Tampil benar di form publik |
| QST-01 | P0 | Buat kode kuesioner (kategori, **layanan wajib**, masa berlaku, dengan invoice) | Format `{jenis}-{acak}`; status client Assessment Scheduled |
| QST-02 | P0 | Kode **dengan** invoice | Invoice assessment terbit otomatis; nominal = harga layanan terpilih; belum lunas |
| QST-03 | P0 | Kode **tanpa** invoice | Tidak ada invoice; tidak ada permintaan bukti ke orang tua |
| QST-04 | P0 | Buka `/assessment?code=XXX` | Kode terisi dan terproses; pesan jelas untuk kode salah/kedaluwarsa/sudah diisi |
| QST-05 | P0 | Kode ber-invoice: sebelum mengisi | Orang tua **wajib unggah bukti**; setelah terunggah bisa lanjut (tidak perlu menunggu lunas) |
| QST-06 | P0 | Unggah file > 5 MB atau format selain JPG/PNG/PDF | Ditolak dengan pesan jelas |
| QST-07 | P0 | Kirim tanpa mencentang persetujuan | Tidak bisa kirim |
| QST-08 | P0 | Kirim dengan pertanyaan yang kosong | Tidak bisa kirim; ada tombol lompat ke pertanyaan yang belum diisi |
| QST-09 | P0 | Kirim kuesioner lengkap | Berhasil; staf melihat jawaban + skor kuadran |
| QST-10 | P0 | Buka lagi kode yang sudah diisi | Ditolak (**sekali isi**) |
| QST-11 | P0 | Buka kode kedaluwarsa | Ditolak |
| QST-12 | P1 | Hapus kode yang **belum diisi** | Terhapus (invoice belum lunas ikut); yang sudah diisi tidak bisa dihapus |
| QST-13 | P1 | Orang tua mencari hasil | **Tidak ada** halaman hasil untuk ortu |
| QST-14 | P1 | Staf internal membuka jawaban | Semua staf internal boleh; tanpa klasifikasi otomatis |
| QST-15 | P1 | Daftar Menunggu Kuesioner + pencarian + log drop-off | Sesuai; tanggal drop-off tercatat |
| QST-16 | P1 | Coba tebak kode berulang kali | Dibatasi |
| QST-17 | P1 | Salin tautan kuesioner | Tautan berisi kode, bisa dibuka |
| QST-18 | P2 | Tampilan HP 375px | Terbaca, tombol mudah disentuh, tidak ada scroll ke samping |

### 7.9 SCH — Jadwal
| ID | P | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| SCH-01 | P0 | Jadwal terapi tunggal | Tersimpan; **tidak ada pilihan layanan** (diambil dari client) |
| SCH-02 | P0 | Jadwal asesmen / re-assessment dari kalender | Tanpa paket kredit; status client maju |
| SCH-03 | P0 | Jadwal berulang multi-hari, N minggu | Semua sesi terbentuk; libur dan cuti **dilewati** |
| SCH-04 | P0 | Bentrok: terapis sama, jam tumpang tindih, client lain | Peringatan; bisa lanjut "Schedule Anyway"; sesi cancelled/pending tidak dihitung bentrok |
| SCH-05 | P0 | Pilihan paket saat jadwal | Hanya paket yang masih ada sisa; bila tidak ada, paket terakhir (Frozen) |
| SCH-06 | P0 | Jadwalkan client Frozen | Boleh; chip bertanda Frozen |
| SCH-07 | P0 | Jadwal aktif di tanggal client cuti | **Diblokir** dengan peringatan |
| SCH-08 | P1 | Kalender: tampilan minggu/hari, filter terapis, cari client | Sesuai; di HP berupa agenda harian |
| SCH-09 | P1 | Ganti jadwal rutin dari detail client dan roster | Hanya sesi Scheduled mendatang pada pola itu yang berubah; riwayat tetap; bentrok memblokir |
| SCH-10 | P1 | Hapus jadwal rutin (role berizin hapus) | Sesi terjadwal pola itu terhapus |
| SCH-11 | P1 | Kalender Tim (terapis) | Terlihat tapi tidak bisa diubah |
| SCH-12 | P1 | Kalender dengan banyak data | Terbuka dalam waktu wajar (< 2 detik) |

### 7.10 SES — Aksi sesi dan laporan
| ID | P | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| SES-01 | P0 | Selesaikan sesi terapi (dan klik ganda) | Kredit −1 **sekali saja** |
| SES-02 | P0 | Selesaikan sesi client tanpa kredit | Tidak error; tidak ada potongan |
| SES-03 | P0 | Selesaikan sesi asesmen | Status client maju; tanpa kredit |
| SES-04 | P0 | Cancel/Off **tanpa memilih** potong/tidak | **Tidak bisa lanjut**: pilihan wajib |
| SES-05 | P0 | Cancel/Off **Potong**, credit leave masih ada | Credit leave −1; kredit sesi **utuh** |
| SES-06 | P0 | Cancel/Off **Potong**, credit leave habis | Kredit sesi −1 |
| SES-07 | P0 | Cancel/Off **Jangan potong** | Tidak ada pengurangan |
| SES-08 | P0 | Pilih alasan Cancel/Off | Dari satu daftar; riwayat menampilkan **KODE**; teks bebas "Lainnya" boleh |
| SES-09 | P1 | Cancel dengan alasan Therapist Off | Dihitung di Cancellation Rate keseluruhan **dan** Therapist Off Rate |
| SES-10 | P0 | Reschedule langsung | Harus beda slot; tidak boleh bentrok/libur; kredit tidak berubah |
| SES-11 | P0 | Tandai menunggu jadwal pengganti lalu tetapkan jadwal | Kredit tidak berubah |
| SES-12 | P0 | Drop sesi yang menunggu jadwal | Menjadi Cancelled (kode RD); **wajib pilih** potong/tidak |
| SES-13 | P1 | Isi laporan sesi (Activity, Note, Homework) | Tersimpan; tidak ada template isian cepat |
| SES-14 | P1 | Ubah Catatan sesi di riwayat | Tampil sama di detail client, Log Kredit, dan detail sesi kalender |
| SES-15 | P1 | Monitoring laporan kosong | Sesi Completed tanpa laporan muncul; hilang setelah laporan diisi |
| SES-16 | P0 | Hapus sesi (role berizin hapus) | Laporan ikut terhapus; sesi Completed harus di-revert dulu |
| SES-17 | P1 | Sesi di cabang lain | Tidak bisa diakses |

### 7.11 REV — Revert (hanya 1x)
| ID | P | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| REV-01 | P0 | Revert sesi Completed (alasan wajib) | Kembali Scheduled; kredit +1 |
| REV-02 | P0 | Revert sesi yang sama sekali lagi | **Ditolak**; tombol disembunyikan |
| REV-03 | P0 | Revert → Selesai lagi → revert | Aksi Selesai yang baru boleh di-revert 1x lagi |
| REV-04 | P0 | Revert Cancelled yang "Potong" | Credit leave / kredit kembali sesuai jenis potongan |
| REV-05 | P0 | Revert Reschedule 1x | Kembali ke jadwal asal (Scheduled) |
| REV-06 | P0 | Revert Reschedule yang sudah dipindah 2x | Kembali ke jadwal tersimpan terakhir (tetap Rescheduled) |
| REV-07 | P0 | Revert sesi yang menunggu jadwal pengganti | Kembali ke jadwal asal |
| REV-08 | P0 | Revert saat slot lama sudah terisi sesi lain | Ditolak dengan pesan jelas |
| REV-09 | P1 | Revert asesmen Completed | Tahap client dipulihkan |

### 7.12 BLK — Aksi massal
| ID | P | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| BLK-01 | P1 | Selesaikan massal 8 sesi (campur status) | Yang valid selesai; yang tidak valid **dilewati dan dilaporkan** |
| BLK-02 | P1 | Cancel massal | Satu pilihan potong/tidak wajib, berlaku untuk semua |
| BLK-03 | P0 | Reschedule massal dengan satu baris bentrok/libur/tidak berubah | **Tidak ada yang tersimpan**; daftar masalah ditampilkan |
| BLK-04 | P0 | Reschedule massal saling bertukar slot | Diizinkan |
| BLK-05 | P1 | Revert massal | Satu alasan; sesi yang sudah di-revert atau slotnya terisi dilewati dan dilaporkan |

### 7.13 LVE — Cuti dan credit leave
| ID | P | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| LVE-01 | P0 | Finance catat cuti, client punya sesi di rentang | Berhasil; pratinjau hari, saldo, sesi terdampak |
| LVE-02 | P0 | Catat cuti di rentang **tanpa sesi** | **Ditolak** |
| LVE-03 | P0 | Rentang 7–14 Okt, sesi 8 dan 12 Okt | **5 hari** |
| LVE-04 | P0 | Sesi di rentang cuti | Jadi Cancelled kode **OL**, **tidak memotong** kredit/credit leave; tanda Cuti di kalender |
| LVE-05 | P0 | Cuti tumpang tindih cuti aktif | Ditolak |
| LVE-06 | P1 | Melewati 30 hari | Hanya peringatan |
| LVE-07 | P0 | Akhiri lebih awal (isi tanggal masuk) | Sesi sejak tanggal itu kembali Scheduled; hari kembali ke saldo; sesi yang slotnya terisi dilewati dan dilaporkan |
| LVE-08 | P0 | Void cuti (alasan wajib) | Semua sesi kembali Scheduled; seluruh hari kembali; log tetap ada |
| LVE-09 | P0 | Cari tombol hapus log cuti | **Tidak ada** |
| LVE-10 | P1 | Cuti lintas tahun | Hari terpecah mengikuti tanggal sesi per tahun |
| LVE-11 | P1 | Paket satuan: lebih dari 1 cuti sebulan | Ditolak |
| LVE-12 | P0 | **Reset Cuti Tahunan** | Pratinjau jumlah client dan hari yang hangus; semua client jadi 30; log tidak terhapus |
| LVE-13 | P1 | Detail log cuti | Riwayat pengajuan, akhir lebih awal/void, sesi terdampak |
| LVE-14 | P1 | Invoice cuti (nominal manual), tautkan ke log cuti | Tandai lunas **tidak menambah kredit** |
| LVE-15 | P0 | Paket reguler baru | Membawa credit leave sebesar master |
| LVE-16 | P0 | Renewal paket satuan tanpa reset | Credit leave **melanjutkan sisa** |
| LVE-17 | P0 | Renewal paket satuan dengan **Reset credit leave** | Diisi ulang sesuai master; sisa lama hangus |
| LVE-18 | P1 | Cuti vs credit leave | Dua jatah berbeda: cuti tidak memakai credit leave dan sebaliknya |

### 7.14 FIN — Finance
| ID | P | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| FIN-01 | P0 | Terbitkan invoice paket | Nomor `INV-{KODE}-{YYYYMMDD}-{NNN}`; harga/sesi/nama = snapshot |
| FIN-02 | P0 | Invoice assessment manual | Kode `ASM`; nominal bebas; tanpa paket |
| FIN-03 | P0 | Dua invoice kode sama dalam sehari (dua petugas bersamaan) | Nomor urut naik, tidak ada duplikat |
| FIN-04 | P0 | **Tandai Lunas** invoice paket (dan klik ganda) | Paket baru aktif +N kredit **sekali saja**; sesi mendatang pindah ke paket aktif |
| FIN-05 | P0 | Tandai lunas invoice assessment | Hanya lunas, tanpa kredit |
| FIN-06 | P0 | Portal ortu untuk invoice paket | **Tidak ada** tombol unggah bukti; hanya status |
| FIN-07 | P1 | Finance unggah/ganti bukti manual | Status tidak berubah; tercatat di log invoice; invoice void tidak bisa |
| FIN-08 | P1 | Bukti: format dan ukuran | JPG/PNG/PDF ≤ 5 MB |
| FIN-09 | P0 | Buat Tagihan dengan **Langsung lunas** | Lunas + paket aktif sekaligus |
| FIN-10 | P0 | Renewal dengan invoice baru | Belum lunas; badge Renewal; masuk Menunggu Pembayaran |
| FIN-11 | P0 | Renewal langsung lunas | Lunas + paket aktif; catatan opsional tercatat |
| FIN-12 | P1 | Tab Perlu Renewal | Client aktif dengan **total** sisa kredit < 3 (Frozen ikut) |
| FIN-13 | P1 | Add Renewal | Invoice paket sama; tombol berganti "Invoice menunggu pembayaran" |
| FIN-14 | P0 | Hapus invoice **belum lunas** (role berizin) | Terhapus permanen; saldo lebihan yang terpakai kembali |
| FIN-15 | P0 | Hapus invoice **lunas** | **Tidak bisa**; gunakan Void |
| FIN-16 | P0 | Void invoice lunas yang kreditnya belum dipakai | Alasan wajib; kredit dipertahankan; tidak masuk revenue/antrean; badge Void |
| FIN-17 | P0 | Void invoice yang kreditnya sudah dipakai / dikonversi / direfund | **Ditolak** dengan alasan |
| FIN-18 | P0 | Invoice pengganti (Buat Tagihan dan Renewal) | Wajib pilih menggantikan atau paket baru; menggantikan = paket lama dipakai ulang **tanpa kredit ganda**; satu void hanya bisa digantikan sekali |
| FIN-19 | P0 | Refund invoice lunas dengan sisa kredit | Nominal otomatis (sisa × harga/sesi), bisa diubah (maks nilai invoice); alasan wajib; sisa kredit jadi 0; sekali per invoice |
| FIN-20 | P0 | Revenue setelah refund | **Verified = lunas − refund**; **Gross tetap memuat refund**; kolom nominal invoice tidak berubah |
| FIN-21 | P0 | Konversi otomatis Senior → Regular | Sesuai hitung manual (§2.8): nilai sisa, sesi baru dibulatkan ke bawah, lebihan |
| FIN-22 | P0 | Konversi manual | Alasan wajib; sesi tidak boleh melebihi hasil otomatis |
| FIN-23 | P0 | Catatan Finance saat konversi | Wajib; tampil di log invoice |
| FIN-24 | P0 | Setelah konversi | Jadwal terapi **mendatang** terhapus (riwayat dan asesmen tetap); invoice menampilkan paket tujuan + badge Dikonversi; tombol konversi hilang |
| FIN-25 | P0 | Invoice paket berikutnya setelah ada lebihan | Nominal **terpotong saldo**; tercatat di log; hapus invoice mengembalikan saldo |
| FIN-26 | P1 | Tab Saldo Lebihan | Sisa saldo, sumber, invoice yang terpotong; penanda "Tidak sinkron" bila selisih |
| FIN-27 | P0 | Log Kredit & Saldo | **1 baris = 1 paket + 1 client**; saldo berjalan benar; kolom Oleh, Detail (KODE), Catatan bisa diedit |
| FIN-28 | P1 | Ekspor Log Kredit PDF/Excel | File terbuka, angka sama dengan layar |
| FIN-29 | P1 | Log invoice (tombol Log) | Terbaru di atas; lengkap (terbit, lunas, konversi, void, refund, saldo) |
| FIN-30 | P0 | Pencarian Finance (nama, ortu, kode, nomor invoice) | Memfilter semua tab sekaligus |
| FIN-31 | P0 | Role selain Finance/Master mencoba aksi Finance | Ditolak |

### 7.15 ACT — Active Client
| ID | P | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| ACT-01 | P1 | Roster: filter status, cabang, kredit | Sesuai; 10 per halaman |
| ACT-02 | P1 | Detail client | Progres kredit per paket, jadwal rutin, jadwal aktif, monitoring laporan, riwayat sesi (Alasan = KODE) |
| ACT-03 | P1 | Analitik dengan periode **kustom** | Angka cocok dengan hitungan manual |
| ACT-04 | P1 | Kehadiran % | Tidak hadir = hanya cancel yang **memotong kredit** dan belum di-revert |
| ACT-05 | P1 | Birthday | Client ulang tahun di bulan terpilih; tombol WA |
| ACT-06 | P1 | Re-assessment | Terbitkan kode + jadwalkan tanpa potong kredit |
| ACT-07 | P1 | Ekspor riwayat sesi PDF/Excel | File benar |

### 7.16 PRT — Portal terapis
| ID | P | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| PRT-01 | P0 | Jadwal saya | Hanya sesi miliknya |
| PRT-02 | P1 | Summary & Laporan Sesi | Sesuai |
| PRT-03 | P1 | **Rekap Harian** dengan periode kustom | Tampil hari, total jam, daftar client sesi completed; total jam benar |
| PRT-04 | P1 | Detail client terapis + hasil asesmen | Sesuai hak |
| PRT-05 | P1 | Cetak laporan sesi | Dokumen rapi |
| PRT-06 | P1 | Kalender Tim | Hari = semua terapis; Minggu = per terapis; baca saja |

### 7.17 PAR — Portal orang tua
| ID | P | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| PAR-01 | P0 | Login (lihat AUTH-09/10) | Hanya anak sendiri |
| PAR-02 | P0 | Tagihan | Status Lunas/Menunggu; invoice void tidak tampil; **tanpa Riwayat Invoice** |
| PAR-03 | P0 | Sisa kredit | Sama dengan Log Kredit di Finance |
| PAR-04 | P1 | Riwayat sesi + laporan | **View Report nonaktif** bila laporan kosong |
| PAR-05 | P1 | Export laporan harian | Dokumen benar |
| PAR-06 | P1 | Kuesioner belum diisi | Muncul; wajib unggah bukti invoice assessment dulu; kode kuesioner **tidak** ditampilkan |
| PAR-07 | P0 | Semua halaman di HP 375px | Tidak ada scroll ke samping; tombol mudah disentuh |

### 7.18 DSH — Dashboard
| ID | P | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| DSH-01 | P0 | Revenue (Master semua cabang, Manager cabangnya) | Gross, Verified, Pending sesuai §2.8; filter periode termasuk kustom |
| DSH-02 | P0 | Invoice void | Tidak masuk angka mana pun |
| DSH-03 | P1 | Inquiry: funnel, **Total Discharge** + alasan, drop-off | Sesuai |
| DSH-04 | P1 | Schedule: **Cancellation Rate** dan **Therapist Off Rate** | Cancel Therapist Off tetap dihitung di rate keseluruhan |
| DSH-05 | P1 | **Availability & Utilization** | Sesi terjadwal ÷ maks sesi per bulan; kapasitas ikut filter periode |
| DSH-06 | P1 | Branch performance | Perbandingan cabang sesuai filter |
| DSH-07 | P1 | Filter cabang/periode | Konsisten; Manager terkunci ke cabangnya |

---

## 8. Aturan yang harus selalu benar (konsistensi angka)

Setelah **setiap** skenario yang menyentuh kredit atau uang, periksa hal berikut dari layar (tanpa alat teknis):

| # | Aturan | Cara memeriksa |
|---|---|---|
| K1 | Sisa kredit tiap paket = kredit awal + penambahan − pemakaian + koreksi, sesuai baris di **Log Kredit & Saldo** | Hitung ulang dari log; cocok dengan angka di detail client dan portal ortu |
| K2 | Klik ganda atau submit ulang **tidak** menggandakan potongan atau paket | Ulangi aksi cepat 2×; hanya satu efek |
| K3 | Revert menambah baris koreksi; baris lama tidak berubah | Lihat log: ada baris "Dibatalkan/Reversal" |
| K4 | Satu invoice paket lunas = tepat satu paket kredit | Buka client: tidak ada paket ganda untuk satu invoice |
| K5 | **Verified Revenue = lunas − refund**; **Gross** memuat refund; void tidak masuk | Bandingkan dashboard dengan hitungan manual dari Semua Tagihan |
| K6 | Saldo lebihan tidak pernah negatif; angka tab Saldo Lebihan cocok dengan invoice yang terpotong | Hitung manual |
| K7 | Saldo cuti = 30 − hari cuti aktif tahun berjalan | Hitung dari Detail log cuti |
| K8 | Tidak ada saldo kredit negatif; Frozen hanya bila total kredit 0 | Periksa client Frozen |
| K9 | Setelah menghapus client/invoice/cabang, datanya tidak muncul di modul mana pun | Cari di semua modul dan dashboard |
| K10 | Setiap perubahan tercatat pelaku dan waktunya (riwayat status, log invoice, kolom Oleh) | Periksa log |
| K11 | Dua orang mengedit data yang sama: yang kedua mendapat pesan bahwa data sudah berubah | Uji di dua jendela |
| K12 | Format konsisten: tanggal Indonesia, uang rupiah, jam 24 jam | Inspeksi |

---

## 9. Uji non-fungsional

| ID | Area | Uji | Hasil yang diharapkan |
|---|---|---|---|
| NFR-01 | Keamanan | Ubah ID di alamat browser untuk membuka data cabang/role lain | Selalu ditolak |
| NFR-02 | Keamanan | Salah login berulang (staf, ortu), tebak kode kuesioner | Dibatasi sementara |
| NFR-03 | Keamanan | Isi kolom teks dengan karakter khusus / tag HTML (`<b>`, `'`, `"`) | Tampil sebagai teks biasa, tidak merusak halaman |
| NFR-04 | Keamanan | Unggah file bukan gambar/PDF, ukuran besar, nama file aneh | Ditolak; file bukti tidak bisa dibuka tanpa login |
| NFR-05 | Keamanan | Buka alamat internal setelah logout | Diarahkan ke login |
| NFR-06 | Keamanan | Staf dinonaktifkan saat sedang login | Akses terputus pada aksi berikutnya |
| NFR-07 | Kecepatan | Kalender, daftar client, dashboard | Terbuka wajar (< 2–3 detik) pada data uji |
| NFR-08 | Konkurensi | Dua petugas menyelesaikan/cancel sesi yang sama; dua Finance menandai lunas invoice yang sama | Hanya satu yang berhasil; tidak ada kredit ganda |
| NFR-09 | Mobile | 375px: portal ortu, `/assessment`; 768px: halaman staf | Tidak ada scroll ke samping; dialog bisa discroll penuh; tabel bisa digeser; tombol ≥ 40px |
| NFR-10 | Tampilan | Mode gelap halaman staf; halaman publik tetap terang | Teks terbaca, tidak ada elemen hilang |
| NFR-11 | Tampilan | Pagination di semua daftar | 10 per halaman; kembali ke halaman 1 saat filter berubah |
| NFR-12 | Bahasa | Seluruh teks UI dan pesan galat | Bahasa Indonesia konsisten; landing ID/EN berfungsi |
| NFR-13 | Browser | Chrome, Edge, Firefox, Safari | Alur utama jalan |
| NFR-14 | Refresh | Tekan refresh di tengah pengisian/aksi | Tidak ada data ganda; halaman kembali normal |

---

## 10. Manajemen bug

### 10.1 Tingkat keparahan
| Tingkat | Definisi | Contoh | Target perbaikan |
|---|---|---|---|
| **Kritis** | Tidak bisa dipakai atau data/keuangan salah | Saldo tidak cocok, kredit ganda, login gagal, data bocor lintas cabang/ortu | Maks 1 hari kerja |
| **Mayor** | Tidak sesuai requirement, ada jalan memutar | Filter salah, revert 1x tidak ditegakkan di satu jalur | Minggu yang sama |
| **Minor** | Tampilan/teks/kenyamanan | Label salah, spasi, responsif kecil | Dikumpulkan, bertahap |
| **Saran** | Ide baru di luar requirement final | Fitur tambahan | Change request (fase 2 kecuali kritis) |

### 10.2 Alur status bug
`Baru → Dikonfirmasi → Diperbaiki (developer) → Retest (tester) → Tutup`
Status lain: **Bukan bug** (sesuai requirement, dijelaskan), **Duplikat**, **CR** (change request), **Ditunda**.

### 10.3 Aturan menulis bug
1. Satu bug = satu laporan = satu perilaku.
2. Selalu cantumkan: build/tanggal, lingkungan (UAT/Produksi), role/akun, cabang, perangkat+browser, **langkah satu per satu**, hasil yang terjadi, hasil yang diharapkan (+ rujukan bagian dokumen ini), screenshot/rekaman.
3. Bug **Kritis** yang ditemukan setelah build dibekukan: **hubungi developer langsung** (jangan hanya menulis di lembar).
4. Jangan menutup bug sebelum **retest** di lingkungan yang sama dengan tempat bug ditemukan.
5. Bug Kritis/Mayor yang sudah diperbaiki masuk daftar **regresi** (§12).

---

## 11. Kriteria masuk dan keluar tiap sesi UAT

**Masuk (dikonfirmasi Jumat 16.00):**
- [ ] Developer mengonfirmasi build dibekukan dan terpasang di lingkungan UAT; nomor/tanggal build dicatat.
- [ ] Semua TC **P0** untuk modul sesi itu lulus oleh tester di lingkungan UAT.
- [ ] Tidak ada bug **Kritis** terbuka pada modul sesi itu.
- [ ] Smoke 15 menit per role lulus; akun semua role bisa login.
- [ ] Catatan rilis + lembar skenario terkirim ke PIC klien.

**Keluar (Sabtu sore):**
- [ ] Semua skenario sesi dijalankan; lulus/gagal tercatat.
- [ ] Semua temuan klien tercatat dengan tingkat keparahan dan dijawab paling lambat Senin.
- [ ] Bug Kritis punya rencana perbaikan ≤ 1 hari kerja.
- [ ] Laporan sesi UAT (lampiran D) dikirim.

**Khusus UAT #3 (Checkpoint 50%):** lima kriteria di `TIMELINE_UAT_KLIEN.md` §4.
**Khusus UAT #6 (sign-off):** semua skenario per role lulus, nol Kritis/Mayor terbuka, hasil pindah data dicek klien, formulir persetujuan ditandatangani.

---

## 12. Regresi dan smoke test go-live

### 12.1 Suite regresi (Kamis tiap minggu, dan sebelum UAT #5 dan #6)
Semua TC **P0** + TC yang pernah menjadi bug Kritis/Mayor. Minimal: AUTH-01/04/09, RBAC-01/03/05, MST-04, BRN-04/05, HOL-03/04, CLI-02/20, STA-03/07, QST-05/09/10/11, SCH-03/04/07, SES-01/04–07/10/12, REV-01/02/05/06, BLK-03, LVE-03/04/07/12, FIN-04/14–20/21/24/25, DSH-01, NFR-01/08.

### 12.2 Smoke test setelah go-live (Jumat 4 Des dan Senin 7 Des)
| Role | Cek (≤ 5 menit) |
|---|---|
| Master | Login, ganti cabang, buka revenue, Master Cabang |
| Admin Inquiry | Buat intake uji lalu hapus; buat kode kuesioner tanpa invoice |
| Admin Schedule | Buka kalender, buat 1 sesi uji, selesaikan, revert, hapus |
| Finance | Terbitkan invoice uji, tandai lunas, void, buka Log Kredit |
| Terapis | Jadwal saya, isi laporan |
| Orang Tua | Login uji, lihat tagihan dan kredit |

Di data produksi, **gunakan client uji khusus** dan **hapus** semua data uji setelah smoke selesai. Jangan menjalankan uji destruktif (hapus cabang, reset cuti) di produksi.

### 12.3 Hypercare (7–11 Des)
Tester standby jam kerja; setiap laporan dari klien dicek ulang (reproduksi) sebelum diteruskan ke developer; bug Kritis diteruskan langsung.

---

## 13. Lampiran

### A. Catatan rilis (format yang akan Anda terima tiap Jumat)
```
CATATAN RILIS — UAT #N — [tanggal]         Build: [nomor/tanggal]
Progres rencana: XX%

BARU (siap diuji Sabtu)
- [modul] [fitur] — skenario: [kode]

DIPERBAIKI (dari temuan sebelumnya)
- #[ID bug] [ringkas] — mohon diverifikasi ulang

BELUM SIAP / DIKETAHUI (jangan dilaporkan sebagai bug)
- [fitur] — rencana minggu [x]
```

### B. Template laporan bug
```
ID: BUG-###       Tingkat: Kritis / Mayor / Minor / Saran
Build/tanggal:    Lingkungan: UAT / Produksi    Waktu:
Role/akun:        Cabang:       Perangkat + browser:
Modul / TC terkait:
Langkah:
  1.
  2.
Hasil yang terjadi:
Hasil yang diharapkan (+ rujukan bagian dokumen):
Bukti: [screenshot / rekaman]
Status: Baru / Dikonfirmasi / Diperbaiki / Retest / Tutup / Bukan bug / CR
```

### C. Matriks pelacakan kebutuhan (contoh)
| Kebutuhan | TC | Minggu uji | UAT | Status |
|---|---|---|---|---|
| Kode client `AE-00001` per grup huruf | CLI-02, CLI-03 | 2–3 | #2 | ☐ |
| Kuesioner sekali isi + consent | QST-07, QST-09, QST-10 | 3 | #2 | ☐ |
| Cancel/Off wajib pilih potong/tidak | SES-04…SES-08 | 3–4 | #3 | ☐ |
| Revert hanya 1x | REV-01…REV-09 | 3–4 | #3 | ☐ |
| Hapus permanen berantai | CLI-20, BRN-05, FIN-14 | 2–7 | #5–#6 | ☐ |
| Cuti 30 hari/tahun (Finance) | LVE-01…LVE-14 | 4–5 | #3–#4 | ☐ |
| Credit leave per paket | SES-05/06, LVE-15…18 | 4–5 | #3–#4 | ☐ |
| Void hanya kredit belum dipakai | FIN-16, FIN-17 | 5 | #4 | ☐ |
| Refund: Verified vs Gross | FIN-19, FIN-20 | 5 | #4 | ☐ |
| Konversi paket + saldo lebihan | FIN-21…FIN-26 | 5 | #4 | ☐ |
| Utilization & Therapist Off Rate | DSH-04, DSH-05 | 6 | #5 | ☐ |
| Rekap harian terapis | PRT-03 | 6 | #5 | ☐ |
| Hari libur berentang | HOL-02…04 | 2 | #1 | ☐ |
| Kode asesmen tanpa invoice | QST-03 | 3 | #2 | ☐ |
| Alasan Cancel/Off ber-KODE | MST-02, SES-08 | 2–4 | #1, #3 | ☐ |

### D. Laporan sesi UAT (diisi Sabtu +30 menit)
```
UAT #N — [tanggal] — [jam mulai–selesai] — Build: [nomor]
Hadir (nama/role): ...
Skenario dijalankan: X dari Y | Lulus: a | Gagal: b | Tidak dijalankan: c (alasan)
Temuan baru: Kritis n | Mayor n | Minor n | Saran n
Bug lama diverifikasi: x ditutup, y masih terbuka
Keputusan: ...
Tindak lanjut (PIC + tenggat): ...
```

### E. Checklist tester Jumat sore
- [ ] Developer mengonfirmasi build terpasang di UAT
- [ ] Smoke 7 role lulus (15 menit per role)
- [ ] Akun semua role bisa login
- [ ] Data klien (set `UAT-…`) utuh dan siap dipakai Sabtu
- [ ] Catatan rilis + lembar skenario terkirim ke klien
- [ ] Penguji klien terkonfirmasi hadir (Kamis)
- [ ] Lembar bug siap untuk Sabtu
