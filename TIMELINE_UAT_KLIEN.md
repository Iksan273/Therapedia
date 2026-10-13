# Timeline Pengerjaan & Jadwal UAT — Therapedia One Gate Integrated Clinic System

**Untuk:** Manajemen dan tim Therapedia Developmental Center
**Dibuat:** 10 Oktober 2026 (setelah requirement final disepakati)
**Status:** Usulan jadwal, menunggu konfirmasi PIC (lihat §6)

Dokumen ini menjawab tiga pertanyaan: **kapan** tiap bagian sistem siap, **kapan Anda ikut menguji** (UAT), dan **kapan pembayaran Termin 2** jatuh tempo.

## 1. Gambaran singkat

| Hal | Jadwal |
|---|---|
| Mulai pengerjaan sistem | Senin 12 Oktober 2026 |
| UAT (uji oleh tim Therapedia) | **Setiap Sabtu**, kisaran pukul 10.00–13.00 WIB (jam pasti disepakati bersama per sesi), mulai 24 Oktober |
| Jumlah sesi UAT | 6 sesi (24 Okt – 28 Nov) + 1 sesi cadangan (5 Des) |
| **Checkpoint progres 50% (dasar Termin 2)** | **Sabtu 7 November 2026** |
| Persetujuan UAT (sign-off) | Sabtu 28 November 2026 |
| **Go-live (sistem dipakai resmi)** | **Senin 7 Desember 2026** |
| Pendampingan setelah go-live | 7–11 Desember 2026 (lalu garansi 3 bulan sesuai proposal) |

Tampilan (frontend) sudah selesai dan sudah bisa Anda lihat dalam mode demo. Yang dikerjakan 8 minggu ke depan adalah **sistem di balik layar** (server, database, aturan bisnis, keamanan) dan menyambungkannya ke tampilan itu.

## 2. Gambaran progres per minggu

Progres dihitung dari rencana kerja total 40 hari. Setiap Jumat saya kirim catatan rilis berisi progres aktual.

```
Mulai   12 Okt  [░░░░░░░░░░░░░░░░░░░░]   0%
Mgg 1   16 Okt  [███░░░░░░░░░░░░░░░░░]  12,5%  Fondasi, login, hak akses
Mgg 2   23 Okt  [█████░░░░░░░░░░░░░░░]  25%    Cabang, intake, kuesioner
Mgg 3   30 Okt  [███████░░░░░░░░░░░░░]  37,5%  Penjadwalan & aksi sesi
Mgg 4    6 Nov  [██████████░░░░░░░░░░]  50%    Penjadwalan lengkap + Finance inti  ← TERMIN 2
Mgg 5   13 Nov  [████████████░░░░░░░░]  62,5%  Finance lengkap (void, refund, konversi, cuti)
Mgg 6   20 Nov  [███████████████░░░░░]  75%    Portal, dashboard, siap UAT menyeluruh
Mgg 7   27 Nov  [█████████████████░░░]  87,5%  Perbaikan, regresi, sign-off
Mgg 8    4 Des  [████████████████████]  100%   Training, migrasi data, siap go-live
```

| Minggu | Tanggal | Yang selesai di minggu ini | Yang bisa Anda lihat/coba Sabtu |
|---|---|---|---|
| 1 | 12–16 Okt | Server dan database, sistem login, hak akses per role | Belum ada UAT (prototipe sudah Anda review; fokus pembangunan server) |
| 2 | 19–23 Okt | Login asli semua role, Master Cabang, hari libur, data client, kuesioner | Sabtu 24 Okt: **login asli**, master data, cabang |
| 3 | 26–30 Okt | Pendaftaran/intake, asesmen, jadwal dasar | Sabtu 31 Okt: **intake sampai kuesioner diisi orang tua** |
| 4 | 2–6 Nov | Penjadwalan lengkap (cancel/off, revert, massal, cuti) dan alur tagihan dasar | Sabtu 7 Nov: **jadwal terapi lengkap** + pratinjau tagihan |
| 5 | 9–13 Nov | Void, invoice pengganti, refund, konversi paket, cuti Finance | Sabtu 14 Nov: **tagihan, kredit, dan keuangan** |
| 6 | 16–20 Nov | Portal terapis, portal orang tua, dashboard, laporan | Sabtu 21 Nov: **uji menyeluruh semua role** |
| 7 | 23–27 Nov | Keamanan, perbaikan hasil uji, skrip pindah data lama | Sabtu 28 Nov: **uji ulang + persetujuan** |
| 8 | 30 Nov–4 Des | Training staf, pindah data, pembekuan perubahan | Sabtu 5 Des: cadangan (bila ada perbaikan penting) |

## 3. Jadwal UAT

**Waktu:** setiap Sabtu, dengan kisaran 10.00–13.00 WIB. Jam ini bersifat **opsional/fleksibel**: jam mulai dan selesai pasti disepakati bersama PIC Therapedia paling lambat Kamis sebelum sesi, selama masih di hari Sabtu. **Cara:** lewat tautan UAT (internet), laptop untuk staf dan HP untuk portal orang tua. Developer hadir (online/offline sesuai kesepakatan).

### Agenda standar tiap sesi (±3 jam, menyesuaikan jam yang disepakati)
| Waktu | Kegiatan |
|---|---|
| Menit 0–15 | Pembukaan, penjelasan fitur yang diuji hari ini, cek akun masuk |
| Menit 15–135 | Penguji menjalankan skenario per role (lihat §5) |
| Menit 135–165 | Catat temuan di lembar bug (§7), dibahas bersama |
| Menit 165–180 | Rekap: apa yang lolos, apa yang diperbaiki, apa yang jadi usulan baru |

### Daftar sesi
| # | Sabtu | Modul yang diuji | Penguji (role) | Hasil yang diharapkan |
|---|---|---|---|---|
| 1 | **24 Okt** | Login staf dan orang tua, ganti/lupa password (OTP email), hak akses per role, master data (layanan, paket, alasan Cancel/Off, hari libur), Master Cabang, akun staf | Master, Manager, wakil tiap role | Semua role bisa masuk dan hanya melihat menu yang sesuai |
| 2 | **31 Okt** | Intake client, kode client (AE-00001), status pipeline, pencarian, kode kuesioner, orang tua mengisi kuesioner (dari HP), drop-off | Admin Inquiry, Manager, **1 orang tua uji** | Dari intake sampai kuesioner terisi dan client masuk (admit) berjalan |
| 3 | **7 Nov** ★ | Kalender jadwal, jadwal berulang, bentrok, hari libur, selesai/cancel/off (pilihan potong kredit), reschedule, revert 1x, aksi massal, laporan sesi, cuti; **pratinjau tagihan** (invoice → tandai lunas) | Admin Schedule, Terapis, Finance, Manager | Penjadwalan lengkap; **Checkpoint 50% diverifikasi** |
| 4 | **14 Nov** | Invoice paket dan assessment, tandai lunas, bukti manual, renewal, void dan invoice pengganti, refund, konversi paket, Log Kredit & Saldo, cuti 30 hari + Reset Cuti Tahunan, invoice cuti | Finance, Manager, Admin Schedule | Alur bayar → kredit aktif akurat; saldo selalu cocok dengan riwayat |
| 5 | **21 Nov** | **UAT ronde 1 menyeluruh**: semua role dari awal sampai akhir, portal terapis, portal orang tua (HP), semua dashboard, Active Client | Seluruh PIC + 1 orang tua | Daftar temuan lengkap untuk diperbaiki minggu depan |
| 6 | **28 Nov** | **UAT ronde 2 (uji ulang)** semua temuan ronde 1 + skenario inti end-to-end | Seluruh PIC | **Sign-off UAT tertulis** (syarat Termin 3 dan go-live) |
| — | 5 Des | **Cadangan**: uji ulang bila ada bug Kritis atau cek hasil pindah data | PIC terkait | Aman untuk go-live |

★ = sesi yang menentukan **Checkpoint 50% / Termin 2**.

Developer tidak mengubah build di tengah sesi kecuali bug Kritis yang menghalangi penguji.

## 4. Pembayaran: kapan Termin 2?

Pembayaran mengikuti termin 30% / 30% / 40%. Nilai dan rinciannya ada di dokumen invoice terpisah.

| Termin | Porsi | **Kapan** |
|---|---|---|
| **1 — DP** | 30% | Di awal pekerjaan, **12 Okt 2026** *(mohon konfirmasi bila sudah dibayar)* |
| **2 — Progres 50%** | 30% | **Checkpoint tercapai Jumat 6 Nov**, diverifikasi bersama di **UAT #3 Sabtu 7 Nov**, **invoice terbit Senin 9 Nov 2026** |
| **3 — Pelunasan** | 40% | Setelah UAT disetujui (**sign-off Sabtu 28 Nov**), invoice Senin 30 Nov, pembayaran **sebelum go-live Senin 7 Des** (target paling lambat Jumat 4 Des) |

Termin 2 jatuh tempo **bila semua hal berikut terpenuhi** (bukan sekadar tanggal):
1. Progres rencana kerja mencapai **20 dari 40 hari** (akhir minggu ke-4, 6 Nov).
2. Bagian ini sudah berjalan dan Anda uji di UAT #1–#3: **login dan hak akses, master data dan cabang, intake/client/kuesioner, penjadwalan**.
3. Bagian **keuangan inti** (buat tagihan → tandai lunas → kredit aktif → renewal) sudah bisa diperlihatkan di UAT #3.
4. Tidak ada bug Kritis yang terbuka.
5. Catatan rilis minggu 1–4 sudah Anda terima.

Bila UAT #3 batal karena penguji berhalangan, progres tetap dihitung berdasarkan butir 1, 3, dan 4, dan demo diulang paling lambat Sabtu 14 Nov dengan pemberitahuan tertulis.

## 5. Skenario uji per role (ringkas)

Lembar langkah lengkap dikirim **Jumat sore sebelum tiap sesi**. Intinya:

| Role | Skenario utama |
|---|---|
| **Admin Inquiry** | Input intake → pilih layanan → terbitkan kode kuesioner (masa berlaku, dengan/tanpa invoice) → orang tua isi → atur status (admit/outcome/discontinue) → pencarian client → hapus client uji |
| **Admin Schedule** | Jadwal sekali dan berulang → bentrok → hari libur → selesai → **Cancel/Off** (potong kredit atau tidak, credit leave) → reschedule/pending/drop → **revert 1x** → aksi massal → jadwal asesmen dari kalender → cuti → monitoring laporan kosong |
| **Finance** | Terbitkan invoice → tandai lunas → renewal (invoice baru / langsung lunas) → **void + invoice pengganti** → refund → konversi paket → Log Kredit & Saldo → cuti 30 hari dan reset tahunan → invoice cuti |
| **Terapis** | Jadwal sendiri → isi laporan sesi → rekap harian (filter periode) → lihat kalender terapis lain (baca saja) → cetak |
| **Orang tua (HP)** | Login kode client + tanggal lahir anak → lihat status tagihan → sisa kredit → riwayat sesi dan laporan → isi kuesioner → export laporan harian |
| **Manager/Master** | Dashboard (revenue, inquiry, schedule, cabang, utilization) dengan filter periode → akun dan hak akses (hapus per role) → Master Cabang → master data |

## 6. Yang kami perlukan dari Therapedia (dengan batas waktu)

| # | Kebutuhan | Batas waktu |
|---|---|---|
| 1 | **Daftar PIC penguji per role** (Admin Inquiry, Admin Schedule, Finance, Terapis, Manager, Master) **+ 1 orang tua uji + cadangan tiap role** | **Kamis 22 Okt** |
| 2 | Konfirmasi tanggal UAT Sabtu (apakah ada Sabtu yang tidak bisa) dan cek libur/cuti bersama Okt–Des | **Kamis 22 Okt** |
| 3 | Konfirmasi status pembayaran **Termin 1** | **Senin 12 Okt** |
| 4 | Daftar email staf aktif (untuk akun dan OTP lupa password) | **Jumat 16 Okt** |
| 5 | Harga paket dan daftar layanan final (untuk master data) | **Jumat 16 Okt** |
| 6 | **Data lama** (client, paket, saldo kredit) dalam template CSV yang kami kirim **31 Okt**; data sudah dibersihkan | **Jumat 20 Nov** |
| 7 | Keputusan retensi data dan backup arsip (6 bulan atau 1 tahun) | **Jumat 13 Nov** |
| 8 | Jadwal training staf (minggu 30 Nov–4 Des) | **Jumat 20 Nov** |
| 9 | Persetujuan tertulis hasil UAT | **Sabtu 28 Nov** |

## 7. Cara melaporkan temuan

Satu lembar bersama (spreadsheet, tautan dikirim sebelum sesi 1) dengan kolom: **Role · Langkah yang dilakukan · Hasil yang terjadi · Hasil yang diharapkan · Screenshot · Tingkat**.

| Tingkat | Arti | Waktu perbaikan |
|---|---|---|
| **Kritis** | Sistem tidak bisa dipakai / data salah (mis. kredit, tagihan) | Maksimal 1 hari kerja |
| **Mayor** | Fitur tidak berjalan sesuai requirement, ada cara lain | Di minggu yang sama |
| **Minor** | Tampilan/teks/kenyamanan | Dikumpulkan, diperbaiki bertahap |
| **Saran** | Ide baru di luar requirement final | Dibahas sebagai **change request** (fase 2 kecuali kritis) |

Developer membalas temuan paling lambat Senin; perbaikan muncul di catatan rilis Jumat berikutnya.

## 8. Kriteria lolos UAT dan go-live

- Semua skenario per role lolos.
- Tidak ada temuan Kritis atau Mayor yang terbuka.
- Hasil pindah data lama sudah dicek Therapedia.
- Persetujuan tertulis go-live (dasar Termin 3).

### Menuju go-live
| Tanggal | Kegiatan |
|---|---|
| 30 Nov–2 Des | Training staf per role, penyerahan panduan pengguna |
| 3–4 Des | **Pembekuan perubahan** (tidak ada fitur baru), backup penuh, uji restore, pindah data produksi |
| 5 Des (Sab) | Cadangan UAT / cek akhir |
| **7 Des (Sen)** | **Go-live**: domain resmi, mode demo dimatikan |
| 7–11 Des | Pendampingan intensif (respons bug Kritis ≤ 4 jam kerja) |
| 12 Des (Sab) | Review pasca go-live |
| 14 Des dst. | Integrasi Google Calendar (fitur tambahan, sesuai kesepakatan dikerjakan paling akhir) |

## 9. Perubahan permintaan

Requirement dianggap **final dan dibekukan**. Permintaan baru dicatat sebagai *change request*, dibahas Sabtu setelah sesi UAT, dinilai dampaknya terhadap jadwal dan biaya, dan masuk fase 2 kecuali kritis. Perubahan jadwal UAT diinformasikan minimal 3 hari sebelumnya.

## 10. Kontak dan eskalasi

| Peran | Nama | Kontak |
|---|---|---|
| Developer (PIC teknis) | Muhammad Ikhsan | [isi: WhatsApp/email] |
| PIC Therapedia (utama) | [isi] | [isi] |
| Jam standby UAT | Sabtu, mulai 30 menit sebelum sampai selesai sesi (sesuai jam yang disepakati) | |
| Bug Kritis di luar jam | [isi: jalur WA] | Respons awal ≤ 4 jam kerja |

## 11. Risiko jadwal yang perlu Anda ketahui

| Risiko | Dampak | Penanganan |
|---|---|---|
| Penguji tidak hadir di Sabtu tertentu | Sesi tertunda, Termin 2 atau sign-off bergeser | PIC cadangan, konfirmasi Kamis, sesi cadangan 5 Des |
| Data lama terlambat | Pindah data minggu terakhir gagal | Template 31 Okt, batas 20 Nov |
| Permintaan baru di tengah jalan | Go-live mundur | Change request, masuk fase 2 |
| Libur nasional/cuti bersama tidak terduga | Jadwal Senin–Jumat berkurang | Cek di §6 butir 2; bila ada, tanggal diselaraskan ulang |

Jadwal ini mengasumsikan pengerjaan mulai **12 Oktober**. Jika mulai bergeser, semua tanggal di atas ikut bergeser dan akan diinformasikan tertulis.
