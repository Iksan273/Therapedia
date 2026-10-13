# Panduan Penguji & Persiapan UAT (Versi Klien) — Therapedia

**Untuk:** tim Therapedia Developmental Center yang akan menguji sistem (UAT)
**Pasangan dokumen:** `TIMELINE_UAT_KLIEN.md` (jadwal & pembayaran Termin)
**Dibuat:** 10 Oktober 2026 · **Status:** draf untuk review

Dokumen ini membantu Anda **menyiapkan diri sejak sekarang**, selama sistem dikerjakan, supaya setiap Sabtu UAT berjalan lancar. Anda tidak perlu paham teknis; cukup mengikuti langkah dan mencatat hasilnya.

---

## Daftar isi
1. Apa itu UAT dan peran Anda
2. Ringkasan: siapa, kapan, apa
3. Tim penguji yang perlu disiapkan
4. Persiapan per minggu (checklist untuk Therapedia)
5. Data yang perlu Anda siapkan (dengan contoh)
6. Skenario uji per sesi UAT (langkah + hasil yang diharapkan)
7. Cara menguji dengan baik (dos & don'ts)
8. Cara melaporkan temuan
9. Aturan bisnis penting yang perlu diketahui penguji
10. Hari UAT: sebelum, saat, sesudah
11. Sign-off (persetujuan) dan menuju go-live
12. Pertanyaan yang sering muncul
13. Lampiran: lembar skenario kosong, lembar temuan, formulir sign-off

---

## 1. Apa itu UAT dan peran Anda

**UAT (User Acceptance Test)** adalah uji oleh calon pengguna sebenarnya untuk memastikan sistem **sesuai cara kerja klinik Anda** dan sesuai requirement final yang sudah disepakati.

**Peran Anda:** menjalankan pekerjaan sehari-hari di sistem (membuat client, menjadwalkan sesi, menagih, mengisi laporan) dan memberi tahu kami bila hasilnya **tidak sesuai harapan**.

**Yang bukan tugas Anda:** memikirkan cara kerja teknis, atau meminta fitur baru. Permintaan di luar requirement final dicatat sebagai *saran* (change request), dibahas terpisah.

**Prinsip:** lebih baik menemukan masalah di UAT daripada setelah go-live. **Temuan bukan kegagalan, itu tujuan UAT.**

---

## 2. Ringkasan: siapa, kapan, apa

| Sesi | Sabtu | Fokus | Penguji utama |
|---|---|---|---|
| UAT #1 | **24 Okt** | Login, hak akses, master data, cabang | Master, Manager, wakil tiap role |
| UAT #2 | **31 Okt** | Intake client, kuesioner orang tua | Admin Inquiry, Manager, 1 orang tua |
| UAT #3 | **7 Nov** ★ | Penjadwalan lengkap + pratinjau tagihan | Admin Schedule, Terapis, Finance, Manager |
| UAT #4 | **14 Nov** | Tagihan, kredit, keuangan | Finance, Manager, Admin Schedule |
| UAT #5 | **21 Nov** | Ronde 1 menyeluruh, semua role | Semua PIC + 1 orang tua |
| UAT #6 | **28 Nov** | Uji ulang + sign-off | Semua PIC |
| Cadangan | 5 Des | Uji ulang bila ada perbaikan penting | PIC terkait |

Jam: **kisaran 10.00–13.00 WIB, fleksibel**; jam pasti disepakati bersama paling lambat Kamis sebelum sesi. Durasi ±3 jam.
★ UAT #3 menentukan Checkpoint 50% (Termin 2).

Setiap **Jumat sore** Anda menerima: (1) catatan rilis, (2) lembar skenario untuk Sabtu, (3) tautan dan akun UAT.

---

## 3. Tim penguji yang perlu disiapkan

Mohon tetapkan **satu penguji utama dan satu cadangan** per role, **paling lambat Kamis 22 Okt**.

| Role | Siapa yang cocok | Sesi paling berperan | Nama | Cadangan | Kontak |
|---|---|---|---|---|---|
| Master / Direksi | Pemilik akses penuh | #1, #5, #6 | | | |
| Manager Cabang | Satu per cabang bila bisa | #1, #3, #5 | | | |
| Admin Inquiry | Petugas intake & front-desk | #2, #5 | | | |
| Admin Schedule | Petugas jadwal | #3, #4, #5 | | | |
| Finance | Petugas keuangan | #3, #4, #5 | | | |
| Terapis | 1–2 terapis yang paham alur laporan | #3, #5 | | | |
| Orang tua uji | 1 orang tua (akun uji, anak fiktif atau izin tertulis) | #2, #5 | | | |
| **Koordinator UAT** | 1 orang yang mengumpulkan temuan & jadi kontak kami | semua | | | |

**Catatan penting**
- Satu orang boleh memegang beberapa role bila perlu, tetapi sebaiknya **orang yang benar-benar memakai role itu** sehari-hari.
- Penguji sebaiknya hadir di semua sesi sesuai perannya; bila tidak bisa, kabari **Kamis** agar kami menyesuaikan.
- Untuk portal orang tua, siapkan **HP sungguhan** (Android/iPhone).

---

## 4. Persiapan per minggu (checklist untuk Therapedia)

Centang saat selesai. Tenggat mengikuti `TIMELINE_UAT_KLIEN.md` §6.

### Minggu 1 — 12–16 Okt (belum ada UAT; kami membangun fondasi)
- [ ] **Senin 12 Okt:** konfirmasi status pembayaran Termin 1 (DP).
- [ ] **Jumat 16 Okt:** kirim **daftar email staf aktif** (nama, role, cabang, email). Email ini dipakai untuk akun dan kode OTP lupa password.
- [ ] **Jumat 16 Okt:** kirim **harga paket dan daftar layanan final** (lihat §5.1).
- [ ] Mulai menyusun **daftar alasan Cancel/Off dengan KODE** (lihat §5.3).
- [ ] Tunjuk **koordinator UAT**.
- [ ] Baca §9 (aturan bisnis) bersama tim.

### Minggu 2 — 19–23 Okt (persiapan UAT #1, Sabtu 24 Okt)
- [ ] **Kamis 22 Okt:** kirim **daftar PIC penguji** (tabel §3) dan konfirmasi **tanggal Sabtu** yang bisa; cek **libur/cuti bersama** Okt–Des.
- [ ] Siapkan **hari libur klinik 2026** (lihat §5.4) untuk diinput saat UAT #1.
- [ ] Siapkan **daftar cabang** dan struktur akses (siapa boleh apa; lihat §5.2).
- [ ] Siapkan laptop/HP penguji, pastikan internet stabil dan browser **Chrome** terbaru.
- [ ] **Jumat 24 Okt sore:** baca catatan rilis dan lembar skenario UAT #1; pastikan akun bisa login (kami kirim akun).
- [ ] **Sabtu 24 Okt: UAT #1.**
- [ ] **Setelah UAT #1:** kirim sisa temuan di lembar bersama paling lambat Minggu malam.

### Minggu 3 — 26–30 Okt (persiapan UAT #2, Sabtu 31 Okt)
- [ ] Siapkan **3–5 contoh calon client** fiktif untuk intake (lihat §5.5): nama anak, tanggal lahir, nama orang tua, WA, email, keluhan.
- [ ] Siapkan **data kategori kuesioner/asesmen**: kategori, kode jenis, daftar pertanyaan final (atau konfirmasi memakai contoh yang kami sediakan).
- [ ] Siapkan **1 orang tua uji** dan HP-nya untuk mengisi kuesioner.
- [ ] Siapkan **layanan & harga assessment** yang akan dipilih saat membuat kode kuesioner.
- [ ] **Jumat 30 Okt sore:** baca catatan rilis dan skenario UAT #2.
- [ ] **Sabtu 31 Okt: UAT #2.** Kami mengirim **template CSV data lama**.

### Minggu 4 — 2–6 Nov (persiapan UAT #3, Sabtu 7 Nov, Checkpoint 50%)
- [ ] Mulai **mengisi template CSV data lama** (lihat §5.6): client aktif, paket, saldo kredit.
- [ ] Siapkan **contoh jadwal nyata** (terapis × hari × jam × client) untuk dicoba (lihat §5.7).
- [ ] Siapkan **contoh kasus cancel/reschedule** yang sering terjadi di klinik (untuk menguji aturan potong/tidak potong kredit).
- [ ] Siapkan **contoh kasus cuti** (rentang tanggal, client yang punya jadwal).
- [ ] **Jumat 6 Nov sore:** baca catatan rilis dan skenario UAT #3.
- [ ] **Sabtu 7 Nov: UAT #3.** Hasilnya memengaruhi **Termin 2** (invoice terbit Senin 9 Nov bila Checkpoint terpenuhi).

### Minggu 5 — 9–13 Nov (persiapan UAT #4, Sabtu 14 Nov)
- [ ] **Jumat 13 Nov:** putuskan **retensi data dan backup arsip** (6 bulan atau 1 tahun).
- [ ] Siapkan **contoh kasus keuangan** (lihat §5.8): renewal, invoice cuti, void, refund, konversi paket Senior → Regular.
- [ ] Siapkan **angka hitung manual** untuk konversi dan refund agar bisa dibandingkan dengan hasil sistem.
- [ ] Lanjutkan pengisian **CSV data lama**.
- [ ] **Jumat 13 Nov sore:** baca catatan rilis dan skenario UAT #4.
- [ ] **Sabtu 14 Nov: UAT #4.**

### Minggu 6 — 16–20 Nov (persiapan UAT #5, Sabtu 21 Nov — ronde 1 menyeluruh)
- [ ] **Jumat 20 Nov:** kirim **data lama final (CSV yang sudah dibersihkan)**.
- [ ] **Jumat 20 Nov:** tentukan **jadwal training staf** (30 Nov–4 Des).
- [ ] Susun **cerita uji lengkap** per role (dari awal sampai akhir) bersama koordinator: contoh satu client dari intake sampai renewal dan laporan.
- [ ] Pastikan **semua penguji** dan 1 orang tua uji bisa hadir.
- [ ] **Jumat 20 Nov sore:** baca catatan rilis dan skenario menyeluruh.
- [ ] **Sabtu 21 Nov: UAT #5 (ronde 1).**

### Minggu 7 — 23–27 Nov (persiapan UAT #6, Sabtu 28 Nov — uji ulang + sign-off)
- [ ] Review **daftar temuan ronde 1** bersama koordinator: tandai yang Anda anggap paling penting.
- [ ] Siapkan **keputusan sign-off**: siapa yang berwenang menandatangani (Direksi?), dan pastikan hadir.
- [ ] **Cek hasil uji coba migrasi data** (kami kirim contoh hasil): periksa 20 client acak (nama, tanggal lahir, saldo kredit, paket aktif).
- [ ] **Jumat 27 Nov sore:** baca catatan rilis dan skenario uji ulang.
- [ ] **Sabtu 28 Nov: UAT #6 + sign-off.**

### Minggu 8 — 30 Nov–4 Des (training dan persiapan go-live)
- [ ] **Senin–Rabu:** ikuti training sesuai role; semua staf yang akan memakai sistem hadir.
- [ ] **Rabu 2 Des:** cek akhir hasil pindah data.
- [ ] **Kamis–Jumat 3–4 Des:** **pembekuan perubahan**: jangan meminta perubahan baru; hindari menginput data di sistem lama setelah tanggal yang kita sepakati.
- [ ] **Jumat 4 Des:** pembayaran Termin 3 (target) bila sign-off sudah ditandatangani.
- [ ] **Sabtu 5 Des:** cadangan UAT.
- [ ] **Senin 7 Des:** go-live. Siapkan staf dan kontak kami selama 7–11 Des.

---

## 5. Data yang perlu Anda siapkan (dengan contoh)

### 5.1 Layanan dan paket (Minggu 1)
| Kolom | Contoh | Catatan |
|---|---|---|
| Nama paket | Regular Therapist 10 sesi | Nama yang tampil di invoice |
| Jumlah sesi | 10 | |
| Harga | Rp ... | Harga total paket |
| **Kode paket** (untuk nomor invoice) | `REG`, `SEN` | Unik. `ASM` dan `CUT` sudah dipakai sistem |
| **Credit leave per paket** | 3 | Jumlah pembatalan yang boleh "ditanggung" dulu sebelum kredit sesi terpotong |
| Paket satuan? | Ya / Tidak | Paket per sesi; credit leave **tidak reset otomatis** |
| Paket asesmen? | Ya / Tidak | Dipakai untuk invoice assessment |

Daftar layanan klinik: OT, ST, dan lainnya (sebutkan semua).

### 5.2 Cabang dan akun staf (Minggu 1–2)
| Nama | Role | Cabang | Email aktif | Semua cabang? |
|---|---|---|---|---|
| | Manager | East | | Tidak |

Ingat: staf selain Master **terikat satu cabang**; pilih "Semua cabang" pada Penugasan Cabang bila memang perlu.

### 5.3 Alasan Cancel/Off dengan KODE (Minggu 1–2)
Satu daftar saja (Cancel dan Off digabung). Contoh format:

| KODE | Nama panjang | Therapist Off? |
|---|---|---|
| S | Sakit | Tidak |
| OL | Cuti / Out of Leave | Tidak |
| SCA | ... | Tidak |
| MCU | Medical Check Up | Tidak |
| FM | Family Matter | Tidak |
| TI | ... | Tidak |
| H | Holiday | Tidak |
| TO | Terapis berhalangan | **Ya** |

Yang tampil di riwayat sesi adalah **KODE**-nya (nama panjang muncul sebagai petunjuk). Kolom "Therapist Off" menentukan perhitungan *Therapist Off Rate* di dashboard.

### 5.4 Hari libur 2026 (Minggu 2)
Tanggal atau rentang tanggal (Dari – Sampai), keterangan, dan apakah berlaku semua cabang atau cabang tertentu. Jadwal berulang akan **melewati** hari libur otomatis.

### 5.5 Contoh calon client untuk UAT #2 (Minggu 3)
| Nama anak (fiktif) | Tgl lahir | Orang tua | WA | Email | Keluhan | Layanan |
|---|---|---|---|---|---|---|
| (isi 3–5 baris; sertakan nama dengan awal huruf berbeda: A–E, F–J, K–O, P–T, U–Z) | | | | | | |

Sertakan **satu pasang yang mirip** (nama dan tanggal lahir sama) untuk menguji peringatan duplikat.

### 5.6 Data lama untuk migrasi (Minggu 4–6)
Template CSV kami kirim 31 Okt. Minimal: nama anak, tanggal lahir, orang tua, kontak, cabang, status (aktif/discharged/discontinue), paket aktif, sisa kredit, terapis utama, tanggal bergabung. **Bersihkan** dulu: tidak ada duplikat, tanggal konsisten, nomor WA benar, saldo kredit sudah dicek.

### 5.7 Contoh jadwal untuk UAT #3 (Minggu 4)
Daftar 5–10 client dengan pola mingguan (hari, jam, terapis, paket). Sertakan:
- 1 kasus **bentrok** (dua client dengan terapis sama di jam sama),
- 1 kasus **jadwal jatuh di hari libur**,
- 1 client yang **kreditnya habis**,
- 1 client yang akan **cuti** (rentang tanggal, ada jadwalnya).

### 5.8 Contoh kasus keuangan untuk UAT #4 (Minggu 5)
| Kasus | Yang disiapkan |
|---|---|
| Renewal | Client dengan sisa kredit < 3 |
| Invoice paket baru | Client baru yang akan membeli paket |
| Void | Invoice lunas yang **kreditnya belum terpakai**, dan penggantinya |
| Refund | Invoice lunas yang sebagian kreditnya sudah terpakai |
| Konversi | Paket Senior (sisa sesi) → Regular, **hitung manual dulu** (lihat contoh di bawah) |
| Cuti | Rentang cuti + invoice cuti dengan nominal |
| Reset Cuti Tahunan | Pahami dulu: hanguskan semua sisa cuti, reset jadi 30 hari |

**Contoh hitung konversi (angka ilustrasi):** paket Senior Rp 2.000.000 / 10 sesi = Rp 200.000 per sesi. Sisa 4 sesi → nilai sisa Rp 800.000. Paket tujuan Regular Rp 150.000 per sesi → sesi baru = 800.000 ÷ 150.000 = 5 sesi (dibulatkan ke bawah, = Rp 750.000), **lebihan Rp 50.000** menjadi saldo yang memotong invoice paket berikutnya.

---

## 6. Skenario uji per sesi UAT

**Cara membaca:** kerjakan **berurutan**. Kolom **Hasil yang diharapkan** adalah pembanding. Tulis ✔ bila sesuai, ✘ bila tidak, dan catat di lembar temuan (§8). Kode skenario (mis. `U1-03`) dipakai saat melapor.

> Lembar langkah lengkap per sesi dikirim Jumat sore; berikut gambaran isinya agar Anda bisa bersiap.

### UAT #1 — Sabtu 24 Okt: Login, hak akses, master data, cabang
| Kode | Peran | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| U1-01 | Semua | Login dengan akun dan password sementara | Diminta ganti password; setelah ganti baru bisa masuk |
| U1-02 | Semua | Login dengan password salah | Pesan umum; tidak disebutkan mana yang salah |
| U1-03 | Staf | Klik "Lupa password" → minta kode OTP via email | Email masuk, kode dipakai untuk reset; kode kedaluwarsa ±10 menit |
| U1-04 | Master | Reset password seorang staf | Staf mendapat password sementara dan wajib menggantinya |
| U1-05 | Semua | Lihat menu | Hanya menu yang sesuai role Anda |
| U1-06 | Manager/Admin | Coba buka halaman yang bukan hak Anda (ketik alamatnya) | Ditolak |
| U1-07 | Master | Atur matriks hak akses role kustom; atur "boleh menghapus" | Perubahan berlaku; role tanpa hak hapus **tidak melihat tombol hapus** |
| U1-08 | Master | Tambah staf, nonaktifkan staf | Staf nonaktif tidak bisa login; riwayat tetap |
| U1-09 | Master | Master Cabang: tambah, ubah, nonaktifkan cabang | Sesuai; kode dan nama cabang unik |
| U1-10 | Master | Hapus cabang percobaan ("UAT-Hapus") | Muncul ringkasan dampak; harus **ketik kode cabang**; setelah hapus semua isi cabang hilang |
| U1-11 | Finance/Master | Master paket: tambah/ubah (kode paket, credit leave, satuan/asesmen) | Tersimpan; ubah harga **tidak** mengubah invoice lama |
| U1-12 | Admin | Master layanan, alasan Cancel/Off (KODE), alasan discharge | Tersimpan dan muncul di pilihan |
| U1-13 | Admin Schedule | Input hari libur satu tanggal dan **rentang tanggal** | Tersimpan; satu entri per tanggal |
| U1-14 | Semua | Daftar panjang (staf, libur, paket) | Per halaman 10 data, ada pagination |
| U1-15 | Semua | Buka dari HP (375px) | Tampilan rapi, mudah disentuh |

### UAT #2 — Sabtu 31 Okt: Intake sampai kuesioner
| Kode | Peran | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| U2-01 | Admin Inquiry | Buat intake baru | Status "Inquiry"; **kode client otomatis** (mis. `KO-00001`) |
| U2-02 | Admin Inquiry | Cek kode untuk nama berawalan A, F, K, P, U | Grup kode: AE, FJ, KO, PT, UZ; nomor naik berurutan |
| U2-03 | Admin Inquiry | Ubah nama client | Kode client **tidak berubah** |
| U2-04 | Admin Inquiry | Intake dengan nama + tgl lahir sama dengan client lain | Muncul **peringatan** (tidak diblokir) |
| U2-05 | Admin Inquiry | Cari: awal nama anak, awal nama orang tua, kode | Hasil benar; email tidak dicari |
| U2-06 | Admin Inquiry | Pilih layanan client | Status maju ke "Service Selected" |
| U2-07 | Admin Inquiry | Isi link dokumen Google Drive | Tersimpan sebagai tautan |
| U2-08 | Admin Inquiry | Generate kode kuesioner: pilih kategori, **layanan**, masa berlaku, dengan invoice | Kode `{jenis}-{acak}`; invoice assessment terbit **otomatis** dengan nominal layanan; status "Assessment Scheduled" |
| U2-09 | Admin Inquiry | Generate kode **tanpa invoice** (mis. School Companion) | Tidak ada invoice; orang tua tidak diminta bukti bayar |
| U2-10 | Admin Inquiry | Salin tautan kuesioner | Tautan berisi kode |
| U2-11 | Orang tua (HP) | Buka tautan | Kode terisi otomatis |
| U2-12 | Orang tua | Kuesioner ber-invoice: unggah bukti transfer (JPG/PNG/PDF ≤ 5 MB) | Setelah terunggah bisa lanjut mengisi (tidak perlu menunggu lunas) |
| U2-13 | Orang tua | Unggah file > 5 MB atau format lain | Ditolak dengan pesan jelas |
| U2-14 | Orang tua | Isi semua pertanyaan; coba kirim tanpa centang persetujuan | Tidak bisa kirim sebelum **semua** terisi dan **persetujuan** dicentang |
| U2-15 | Orang tua | Kirim kuesioner | Berhasil; **orang tua tidak melihat hasil** |
| U2-16 | Orang tua | Buka kode yang sama lagi | Ditolak (**hanya sekali isi**) |
| U2-17 | Orang tua | Buka kode kedaluwarsa | Ditolak dengan pesan |
| U2-18 | Admin Inquiry | Lihat jawaban & skor kuadran | Terlihat oleh staf internal; skor mentah, tanpa klasifikasi otomatis |
| U2-19 | Admin Inquiry | Hapus kode yang **belum diisi** | Terhapus (invoice belum lunas ikut); kode yang sudah diisi tidak bisa dihapus |
| U2-20 | Admin Inquiry | Daftar "Menunggu Kuesioner" + pencarian, log drop-off | Sesuai |
| U2-21 | Admin Inquiry | Outcome: Admit; Done Consult; Done Assessment; Discontinue (alasan wajib) | Status sesuai; tanggal tercatat |
| U2-22 | Admin Inquiry | **Ubah status manual** ke tahap mana pun | Berhasil; tercatat di riwayat status |
| U2-23 | Admin Inquiry/Master | Hapus client percobaan | Konfirmasi; semua data terkait ikut terhapus; hanya role yang berhak |

### UAT #3 — Sabtu 7 Nov: Penjadwalan lengkap + pratinjau tagihan ★
| Kode | Peran | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| U3-01 | Admin Schedule | Buat jadwal terapi tunggal | Tersimpan; tidak ada pilihan layanan (diambil dari client) |
| U3-02 | Admin Schedule | Buat jadwal **berulang** beberapa hari (tiap hari jam/terapis beda) | Semua sesi terbentuk; hari libur **dilewati** |
| U3-03 | Admin Schedule | Buat jadwal yang bentrok (terapis sama, jam sama) | Peringatan bentrok; bisa lanjut "Schedule Anyway" |
| U3-04 | Admin Schedule | Buat jadwal di hari libur | Ditolak |
| U3-05 | Admin Schedule | Buat jadwal untuk client kredit habis | Boleh, ditandai **Frozen** |
| U3-06 | Admin Schedule | Jadwalkan **asesmen/re-assessment** dari kalender | Tanpa potong kredit; status client maju |
| U3-07 | Admin Schedule | Tandai sesi **Selesai** | Kredit −1; klik ganda tidak memotong dua kali |
| U3-08 | Admin Schedule | **Cancel/Off** tanpa memilih potong/tidak | Tidak bisa lanjut: pilihan **wajib** |
| U3-09 | Admin Schedule | Cancel/Off pilih **Potong** pada paket yang masih punya credit leave | Credit leave berkurang 1; **kredit sesi utuh** |
| U3-10 | Admin Schedule | Cancel/Off pilih **Potong** saat credit leave habis | Kredit sesi berkurang 1 |
| U3-11 | Admin Schedule | Cancel/Off pilih **Jangan potong** | Tidak ada pengurangan |
| U3-12 | Admin Schedule | Alasan Cancel/Off | Dipilih dari satu daftar; riwayat menampilkan **KODE** |
| U3-13 | Admin Schedule | **Reschedule** langsung; tandai **menunggu jadwal pengganti**; lalu tetapkan jadwal atau **drop** | Kredit netral; drop = cancel (pilih potong/tidak) |
| U3-14 | Admin Schedule | **Revert** sesi (selesai/cancel/reschedule/pending) dengan alasan | Kembali ke keadaan sebelumnya; kredit dikoreksi |
| U3-15 | Admin Schedule | Revert **kedua kali** pada sesi yang sama | Ditolak (**hanya 1x**) |
| U3-16 | Admin Schedule | Revert reschedule yang sudah dipindah 2x | Kembali ke jadwal tersimpan terakhir |
| U3-17 | Admin Schedule | **Aksi massal**: selesai, cancel, reschedule, revert | Yang tidak valid dilewati & dilaporkan; reschedule massal **batal semua** bila ada satu yang bermasalah |
| U3-18 | Admin Schedule | Ganti **jadwal rutin** (hari/jam/terapis/paket) dari detail client | Hanya sesi terjadwal mendatang yang diganti; riwayat tetap |
| U3-19 | Terapis | Isi **laporan sesi** (Activity, Note, Homework) | Tersimpan |
| U3-20 | Manager/Admin | **Monitoring** sesi selesai tanpa laporan | Daftar muncul; hilang setelah laporan diisi |
| U3-21 | Finance | **Catat cuti** untuk client yang punya jadwal di rentang | Hari cuti = dari sesi pertama sampai terakhir (contoh 07–14 Okt, sesi 08 & 12 = **5 hari**); sesi jadi Cancel kode `OL`, **tidak** memotong kredit |
| U3-22 | Finance | Catat cuti untuk rentang yang **tidak ada jadwal** | Ditolak |
| U3-23 | Admin Schedule | Buat jadwal di tanggal client sedang cuti | **Diblokir**; Finance harus mengakhiri cuti dulu |
| U3-24 | Finance | **Akhiri cuti lebih awal**; **Void** cuti | Sesi kembali terjadwal; hari kembali ke saldo; log tetap ada; **tidak ada tombol hapus** |
| U3-25 | Finance | Terbitkan invoice paket, **Tandai Lunas** | Nomor `INV-{KODE}-{TANGGAL}-{NNN}`; paket kredit baru aktif; sesi mendatang pakai paket baru |
| U3-26 | Orang tua | Lihat tagihan di portal | Hanya status Lunas/Menunggu; **tidak ada upload** untuk invoice paket |
| U3-27 | Semua | Cek tampilan di HP, mode gelap | Rapi, terbaca |

★ **Checkpoint 50%** diverifikasi: skenario U1–U3 berjalan tanpa bug Kritis dan alur tagihan dasar (U3-25) bisa didemokan.

### UAT #4 — Sabtu 14 Nov: Tagihan, kredit, keuangan
| Kode | Peran | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| U4-01 | Finance | Terbitkan invoice **Assessment** manual | Kode `ASM`; tanpa kredit |
| U4-02 | Finance | Terbitkan invoice dengan **Langsung lunas** | Paid dan paket aktif sekaligus |
| U4-03 | Finance | **Renewal** jalur 1 (invoice baru) dan jalur 2 (langsung lunas) | Badge "Renewal"; kredit bertambah setelah lunas |
| U4-04 | Finance | Tab **Perlu Renewal** | Client dengan **total** sisa kredit < 3; tombol Add Renewal menerbitkan invoice paket sama |
| U4-05 | Finance | Upload/ganti **bukti manual** pada invoice | Tersimpan; status invoice tidak berubah; tercatat di log |
| U4-06 | Finance | Hapus invoice **belum lunas** | Terhapus permanen (hanya role berhak); invoice **lunas** tidak bisa dihapus |
| U4-07 | Finance | **Void** invoice lunas yang kreditnya belum dipakai (alasan wajib) | Kredit dipertahankan; tidak masuk revenue |
| U4-08 | Finance | Void invoice yang kreditnya **sudah dipakai** | Ditolak; arahkan ke Refund |
| U4-09 | Finance | Buat **invoice pengganti** untuk invoice void | Wajib pilih "menggantikan" atau "paket baru"; menggantikan = paket lama dipakai ulang **tanpa kredit ganda** |
| U4-10 | Finance | **Refund** invoice lunas dengan sisa kredit | Nominal otomatis (sisa × harga/sesi), bisa diubah; alasan wajib; sisa kredit jadi 0 |
| U4-11 | Manager/Master | Dashboard revenue setelah refund | **Verified = lunas − refund**; **Gross tetap memuat refund**; invoice void tidak masuk |
| U4-12 | Finance | **Konversi paket** otomatis (Senior → Regular) | Hasil sesuai hitung manual (§5.8); lebihan jadi saldo; jadwal mendatang client dihapus; badge "Dikonversi" |
| U4-13 | Finance | Konversi **manual** | Tidak boleh melebihi hasil otomatis; alasan wajib |
| U4-14 | Finance | Terbitkan invoice paket berikutnya | Nominal **terpotong saldo lebihan**; ada di log |
| U4-15 | Finance | Tab **Saldo Lebihan** | Sumber dan pemakaian jelas |
| U4-16 | Finance | **Log Kredit & Saldo**: 1 baris per paket + client; Lihat Log | Saldo berjalan benar; kolom Oleh, Detail (KODE), Catatan; bisa edit catatan |
| U4-17 | Finance | Ekspor log ke PDF/Excel | File terbuka, angka sama |
| U4-18 | Finance | **Log invoice** per invoice | Riwayat lengkap (terbit, lunas, konversi, void, refund, saldo) |
| U4-19 | Finance | Cuti 30 hari/tahun: lihat saldo, **Detail** log cuti | Riwayat pengajuan jelas |
| U4-20 | Finance | **Reset Cuti Tahunan** (di client uji / pahami dampaknya dulu) | Pratinjau jumlah client & hari yang hangus; setelah reset semua jadi 30 |
| U4-21 | Finance | **Invoice cuti** (nominal manual), tautkan ke log cuti | Tidak menambah kredit |
| U4-22 | Finance | **Credit leave per paket**; paket satuan + **Reset credit leave** saat renewal | Paket reguler: baru tiap paket; satuan: melanjutkan kecuali di-reset |
| U4-23 | Role lain | Coba aksi Finance (void, refund, konversi) | Ditolak |

### UAT #5 — Sabtu 21 Nov: Ronde 1 menyeluruh
Kerjakan **satu cerita utuh** untuk satu client fiktif (kami siapkan lembar langkahnya):
1. Admin Inquiry: intake → layanan → kode kuesioner → orang tua isi → admit.
2. Finance: invoice paket → Tandai Lunas.
3. Admin Schedule: jadwal berulang → beberapa sesi selesai → satu cancel (potong) → satu reschedule → satu revert.
4. Terapis: laporan sesi; rekap harian.
5. Orang tua (HP): lihat tagihan, sisa kredit, riwayat sesi, **View Report** (nonaktif bila laporan kosong), export laporan harian.
6. Finance: kredit < 3 → Add Renewal → lunas.
7. Manager/Master: dashboard (revenue, inquiry, schedule, cabang, utilization) dengan filter periode, termasuk **rentang kustom**.
8. Admin Schedule: Active Client (roster, detail, analitik, birthday, re-assessment, discharge & reaktivasi).

Tambahan khusus ronde 1:
| Kode | Peran | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| U5-01 | Terapis | **Rekap Harian** dengan filter periode | Tampil: hari, total jam, daftar client sesi completed |
| U5-02 | Terapis | Kalender tim (baca saja) | Tampilan Hari = semua terapis; Minggu = per terapis |
| U5-03 | Admin Schedule | **Availability & Utilization** per terapis/cabang | Utilisasi = sesi terjadwal ÷ maksimal sesi per bulan |
| U5-04 | Manager | Cancellation Rate dan **Therapist Off Rate** | Cancel Therapist Off ikut di rate keseluruhan |
| U5-05 | Inquiry | Dashboard: Total Discharge + report per alasan | Sesuai |
| U5-06 | Orang tua | Portal tidak menampilkan kode kuesioner & **Riwayat Invoice** | Memang tidak ada |
| U5-07 | Orang tua | Kuesioner belum diisi | Wajib bayar/unggah bukti invoice assessment dulu |
| U5-08 | Semua | Seluruh halaman di **HP 375px** dan mode gelap | Rapi |
| U5-09 | Master | Hapus client dan cabang percobaan | Seluruh data terkait ikut hilang |

### UAT #6 — Sabtu 28 Nov: Uji ulang + sign-off
- Jalankan ulang **semua temuan ronde 1** yang ditandai "diperbaiki" (kami menyediakan daftarnya).
- Jalankan ulang **skenario inti end-to-end** tiap role (lembar singkat).
- Periksa **hasil migrasi data** (20 client acak).
- Tinjau daftar temuan yang masih terbuka: tidak boleh ada Kritis/Mayor.
- Tanda tangan **formulir sign-off** bila memenuhi kriteria (lampiran C).

---

## 7. Cara menguji dengan baik

**Lakukan**
- Gunakan **akun UAT** dan data fiktif/uji. Jangan memasukkan data client sungguhan di UAT.
- Ikuti skenario **berurutan**, lalu coba juga **kebiasaan nyata** Anda (salah ketik, klik dua kali, kembali ke halaman sebelumnya).
- Uji yang **tidak boleh** bisa dilakukan (mis. role Finance menghapus client) — sistem seharusnya menolak.
- Catat **jam** kejadian dan **screenshot**; semakin jelas, semakin cepat diperbaiki.
- Coba di **HP** untuk portal orang tua dan kuesioner.

**Hindari**
- Memakai akun orang lain.
- Meminta perubahan fitur di tengah sesi (catat sebagai "Saran").
- Menghapus data uji milik penguji lain tanpa koordinasi.
- Menekan **Reset Cuti Tahunan**, **Hapus Cabang**, atau **Hapus Client** pada data yang bukan data uji.

**Catatan data:** lingkungan UAT dipakai bersama oleh developer, tim tester, dan Anda. Data tim tester diberi akhiran **(QA)**; **jangan mengubah atau menghapusnya**. Data uji Anda tidak di-reset tiap minggu, tetapi bisa dipulihkan ke kondisi awal sewaktu-waktu dengan pemberitahuan lebih dulu. Jangan menyimpan data penting di UAT.

---

## 8. Cara melaporkan temuan

Satu **lembar bersama** (spreadsheet; tautan dikirim sebelum UAT #1). Isi satu baris per temuan:

| Kolom | Contoh |
|---|---|
| Kode skenario | U3-09 |
| Role / akun | Admin Schedule, cabang East |
| Langkah yang Anda lakukan | Cancel sesi, pilih Potong |
| Hasil yang terjadi | Kredit sesi berkurang, credit leave tetap 3 |
| Hasil yang diharapkan | Credit leave berkurang 1, kredit utuh |
| Screenshot | tautan/lampiran |
| Tingkat | Kritis / Mayor / Minor / Saran |

| Tingkat | Arti | Kami perbaiki |
|---|---|---|
| **Kritis** | Sistem tidak bisa dipakai atau angka/data salah (kredit, tagihan, keamanan) | Maks 1 hari kerja |
| **Mayor** | Fitur tidak sesuai requirement tetapi ada jalan lain | Minggu yang sama |
| **Minor** | Tampilan/teks/kenyamanan | Bertahap |
| **Saran** | Ide baru di luar requirement final | Dibahas sebagai change request (fase 2 kecuali kritis) |

Kami membalas **paling lambat Senin**; perbaikan tercantum di catatan rilis Jumat berikutnya. Anda diminta **memverifikasi ulang** di sesi Sabtu berikutnya.

---

## 9. Aturan bisnis penting untuk penguji

Ringkasan aturan yang sudah disepakati; gunakan sebagai pembanding.

**Client dan kuesioner**
- Kode client `AE-00001`: dua huruf grup (A–E = AE, F–J = FJ, K–O = KO, P–T = PT, U–Z = UZ) + 5 digit urut per grup; tidak berubah walau nama diedit; dipakai sebagai login orang tua bersama tanggal lahir anak.
- Satu client = satu orang tua.
- Status client otomatis hanya **maju**; perubahan manual boleh ke tahap mana pun.
- Kuesioner: **sekali isi**, masa berlaku opsional, persetujuan data **wajib**, orang tua **tidak melihat hasil**, semua staf internal boleh melihat.
- Kuesioner ber-invoice: orang tua **wajib mengunggah bukti** (cukup terunggah); Finance yang menandai lunas.
- Dokumen client = tautan Google Drive.

**Jadwal dan kredit**
- Sesi terapi selesai = **−1 kredit**. Kredit 0 = **Frozen** (jadwal tetap bisa dibuat).
- **Cancel/Off adalah satu aksi**; admin **wajib memilih** potong atau tidak.
- Pilihan "potong" memakai **credit leave paket** lebih dulu; bila habis, memotong **kredit sesi**. Pilihan "jangan potong" tidak memotong apa pun.
- Reschedule dan "menunggu jadwal pengganti" **tidak** memengaruhi kredit.
- **Revert hanya 1x** per aksi.
- Hari libur dilewati oleh jadwal berulang dan tidak bisa dipilih di kalender.
- Bentrok = terapis yang sama di jam yang sama dengan client lain (peringatan, bisa dilanjutkan).

**Dua jatah yang berbeda — jangan tertukar**
| | Cuti 30 hari/tahun | Credit leave per paket |
|---|---|---|
| Per apa | Per client, per tahun | Per paket |
| Siapa yang mengatur | **Hanya Finance** (catat cuti, reset tahunan) | Master paket; terpakai saat Cancel/Off "potong" |
| Efek ke kredit sesi | **Tidak** memotong kredit sesi | Memotong lebih dulu sebelum kredit sesi |
| Sisa di akhir tahun | Hangus (lewat Reset Cuti Tahunan) | Paket reguler: paket baru = jatah baru; paket satuan: lanjut kecuali di-reset |

**Keuangan**
- Jenis invoice: Paket Sesi, Assessment (dan Cuti oleh Finance). Tanpa jatuh tempo, diskon, DP, atau cicilan.
- Nomor invoice `INV-{KODE}-{YYYYMMDD}-{NNN}`; harga dan jumlah sesi adalah **snapshot** saat terbit.
- Paket sesi: **orang tua tidak mengunggah bukti**; Finance **Tandai Lunas**. Paket tanpa masa berlaku.
- **Void:** hanya invoice lunas yang kreditnya belum dipakai; kredit dipertahankan. **Refund** untuk kredit yang sudah berjalan.
- **Verified Revenue = lunas − refund**; **Gross** tetap memuat refund; invoice void tidak masuk angka mana pun.
- Konversi paket (mis. Senior → Regular): sisa nilai ÷ harga per sesi tujuan; lebihan jadi saldo pemotong invoice berikutnya; jadwal mendatang dihapus untuk dijadwalkan ulang.
- Hapus invoice hanya untuk yang **belum lunas**.

**Hapus data**
- Tombol hapus hanya untuk role dengan izin hapus.
- **Hapus permanen**: hapus client/invoice/cabang menghapus semua data terkait dan tidak bisa dipulihkan (kecuali dari backup). Data master yang pernah dipakai tidak bisa dihapus.

**Tampilan**
- Semua daftar: **10 data per halaman**.
- Bahasa Indonesia (istilah klinik boleh English); landing page tersedia ID/EN.

---

## 10. Hari UAT: sebelum, saat, sesudah

**Kamis (H-2)**
- [ ] Koordinator mengonfirmasi kehadiran penguji dan **jam pasti** Sabtu kepada kami.
- [ ] Penguji memeriksa perangkat dan koneksi internet.

**Jumat sore (H-1)**
- [ ] Terima catatan rilis, lembar skenario, tautan, dan akun.
- [ ] Coba login (sebelum Sabtu) agar masalah akun bisa kami selesaikan lebih awal.
- [ ] Baca lembar skenario dan siapkan data (§5).

**Sabtu — saat UAT**
- 0–15 menit: pembukaan dan cek akun.
- 15–135 menit: menjalankan skenario.
- 135–165 menit: mencatat/membahas temuan.
- 165–180 menit: rekap hasil dan tindak lanjut.
- Kami hadir untuk menjawab pertanyaan, tetapi **tidak mengubah sistem** di tengah sesi kecuali masalah Kritis yang menghalangi.

**Sabtu sore – Minggu**
- [ ] Koordinator melengkapi lembar temuan (maks Minggu malam).
- [ ] Menandai prioritas versi Anda bila ada.

**Senin**
- Kami membalas semua temuan (diterima / bukan bug / butuh info / saran).

---

## 11. Sign-off (persetujuan) dan menuju go-live

**Syarat sign-off (Sabtu 28 Nov):**
1. Semua skenario per role lolos.
2. Tidak ada temuan **Kritis** atau **Mayor** yang terbuka.
3. Hasil migrasi data lama sudah dicek.
4. Penandatangan berwenang (mis. Direksi) menyetujui secara tertulis.

**Setelah sign-off:**
| Tanggal | Kegiatan |
|---|---|
| 30 Nov | Invoice Termin 3 terbit |
| 30 Nov–2 Des | Training staf per role |
| 3–4 Des | Pembekuan perubahan, backup, pindah data produksi |
| 5 Des | Cadangan UAT |
| **7 Des** | **Go-live** |
| 7–11 Des | Pendampingan intensif (bug Kritis direspons ≤ 4 jam kerja) |

---

## 12. Pertanyaan yang sering muncul

**Apa yang terjadi jika saya tidak bisa hadir di satu Sabtu?** Kabari paling lambat Kamis; kami menyesuaikan atau menjadwalkan ulang penguji cadangan. Sesi cadangan 5 Des hanya untuk hal penting.

**Apakah jam 10.00–13.00 wajib?** Tidak, itu kisaran. Jam pasti disepakati bersama sebelum tiap sesi.

**Boleh menguji di luar Sabtu?** Boleh. Lingkungan UAT tersedia sepanjang minggu, tetapi dipakai bersama tim tester dan developer, dan versi (build) bisa berganti Senin–Kamis. Build dibekukan Jumat 14.00 sampai sesi Sabtu selesai. Temuan tetap dicatat di lembar bersama.

**Ada temuan di luar skenario?** Catat saja. Temuan bebas sangat berharga.

**Fitur yang saya inginkan belum ada.** Cek `requirement final`; bila di luar itu, catat sebagai *Saran*. Fitur Google Calendar memang dijadwalkan setelah go-live.

**Bagaimana jika saya tidak yakin ini bug atau memang aturannya?** Cocokkan dengan §9; bila ragu, catat dan tandai "ragu", kami akan menjelaskan.

**Data uji saya hilang atau berubah.** Kemungkinan data dipulihkan oleh developer (dengan pemberitahuan) atau diubah pengguna lain. Beri tahu koordinator; kami cek riwayatnya. Data nyata baru masuk saat go-live.

---

## 13. Lampiran

### A. Lembar skenario kosong (salin per sesi)
| Kode | Peran | Langkah | Hasil yang diharapkan | Hasil Anda (✔/✘) | Catatan / kode temuan |
|---|---|---|---|---|---|
| | | | | | |

### B. Lembar temuan
| No | Tanggal-jam | Kode skenario | Role/akun | Langkah | Yang terjadi | Yang diharapkan | Screenshot | Tingkat | Status (diisi developer) |
|---|---|---|---|---|---|---|---|---|---|

### C. Formulir sign-off UAT
```
PERSETUJUAN HASIL UAT — THERAPEDIA ONE GATE INTEGRATED CLINIC SYSTEM

Tanggal: ____ Nov 2026    Build/tag: ______________

Dengan ini Therapedia Developmental Center menyatakan:
[ ] Semua skenario per role telah dijalankan dan lolos
[ ] Tidak ada temuan Kritis atau Mayor yang terbuka
[ ] Hasil migrasi data lama telah diperiksa dan disetujui
[ ] Sistem disetujui untuk go-live pada 7 Desember 2026

Catatan / temuan Minor-Saran yang disepakati diperbaiki setelah go-live:
____________________________________________________________

Penyetujui (Therapedia)                      Pengembang
Nama   : ______________                     Nama   : Muhammad Ikhsan
Jabatan: ______________                     Tanda tangan: ______________
Tanda tangan: __________
```

### D. Kontak
| Peran | Nama | Kontak |
|---|---|---|
| Developer (PIC teknis) | Muhammad Ikhsan | [isi: WhatsApp/email] |
| Koordinator UAT Therapedia | [isi] | [isi] |
| Jalur bug Kritis di luar jam | [isi] | respons awal ≤ 4 jam kerja |
