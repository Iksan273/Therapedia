# Jawaban Klarifikasi Teknis & Aturan Bisnis (Minggu 1)
**Project:** Therapedia One Gate Integrated Clinic System
**Menjawab:** `QA_PERTANYAAN_KLARIFIKASI_DEV_M1.md` (12 Okt 2026)
**Dari:** Developer / PIC Teknis (Muhammad Ikhsan)
**Tanggal:** 13 Oktober 2026

> Catatan: **Demo** = aplikasi frontend dengan data di browser. **Backend** = Laravel + MySQL yang menyusul. Beberapa aturan (lockout, penyimpanan file) baru berlaku penuh di backend, jadi tidak bisa diuji di demo.

---

## 1. Autentikasi, Akun & Keamanan

**1. Toleransi salah password & cooldown (AUTH-03, AUTH-06)**
- Batas: **5 kali gagal berturut-turut**, berlaku untuk login staf dan login orang tua.
- Setelah itu login diblokir sementara. Hitungan gagal **reset otomatis setelah 10 menit**. Tidak permanen, Master tidak perlu membuka manual.
- Master tetap bisa mereset password staf lewat User Management.
- OTP lupa password: maksimal **5 percobaan salah**, setelah itu OTP hangus dan harus minta OTP baru. OTP berlaku ±10 menit.
- Status: aturan ini berlaku di **backend**. Demo belum punya throttle.

**2. Login orang tua (AUTH-09, AUTH-10)**
- Input: **Kode Client + Tanggal Lahir Anak**, memakai **date picker** kalender (tanpa ketik manual, jadi tidak ada ambiguitas format).
- Pesan gagal selalu sama ("Kode client atau tanggal lahir anak tidak sesuai"), tidak menyebut mana yang salah.
- Perlindungan tebak: pembatasan 5 gagal / 10 menit (per IP dan per kode), ditambah rate limit di Cloudflare. **Tidak ada CAPTCHA.**
- Demo sudah memakai kode + tanggal lahir. Tombol "Isi Demo" mengisi keduanya.

**3. Password baru (AUTH-04, AUTH-07)**
- Minimal **8 karakter, wajib mengandung huruf dan angka**. Huruf besar/kecil dan simbol tidak diwajibkan.

---

## 2. Intake & Kodefikasi

**4. Grup huruf kode client (CLI-02)**
- Dasar: **huruf alfabet pertama dari seluruh nama anak** (bukan nama panggilan). "Muhammad Kenzo" → `M` → grup `KO`.
- Tanda baca, angka, dan spasi diabaikan: `'Abdullah` → `A` → `AE`; `Al-Ghazali` → `A` → `AE`. Huruf beraksen dinormalisasi.
- Pembagian: A–E = `AE`, F–J = `FJ`, K–O = `KO`, P–T = `PT`, U–Z = `UZ`.
- Nama tanpa huruf sama sekali masuk grup `AE`.
- Kode tidak berubah walau nama diedit.

**5. Pencarian & duplikat (CLI-05, CLI-06)**
- Pencarian client: **tidak case-sensitive**, spasi di pinggir diabaikan.
- Pencarian cocok dari **awal kata** (starts with), **bukan "contains"**:
  - nama anak dan nama orang tua dicocokkan per kata. "Ken" menemukan "Kenzo Wirawan", dan "Wir" juga cocok. "enz" tidak cocok.
  - kode client dicocokkan dari huruf depan.
- **Duplikat (nama + tanggal lahir sama):** tetap **boleh disimpan** dan tidak diblokir. Kode client tetap unik karena angka counter-nya berbeda (`AE-00001`, `AE-00002`, …), jadi tidak ada tabrakan data.
- **Pesan peringatan duplikat belum tampil di versi sekarang.** Untuk CLI-05, yang bisa diuji: data duplikat tetap tersimpan dengan kode berbeda. Pesan peringatannya sendiri bukan bug, melainkan fitur yang belum ada.

---

## 3. Asesmen & Kuesioner Publik

**6. Bukti transfer (QST-05, QST-06)**
- Disimpan di **private storage Laravel** (backend). **Tidak ada URL publik**; file hanya bisa dibuka staf yang sedang login.
- Di demo, file hanya tersimpan di browser (khusus demo).
- Catatan scope: "dokumen = link Google Drive" berlaku untuk dokumen klinis. Bukti transfer adalah pengecualian dan wajib diunggah (JPG/PNG/PDF, maks 5 MB).

**7. Sesi terputus & masa berlaku kode (QST-08, QST-10)**
- **Ada autosave ke server.** Jawaban, centang persetujuan, dan posisi bagian tersimpan otomatis. Kalau koneksi putus, orang tua membuka link yang sama dan **melanjutkan** dari jawaban terakhir. Tidak perlu mengulang dari awal.
- Jika dua perangkat mengisi bersamaan, akan ada konflik versi (409) dan salah satu harus memuat ulang.
- Masa berlaku dihitung **tepat 24 jam × N hari sejak kode dibuat**, bukan sampai pukul 23:59.
- Dicek saat kode **dibuka**. **Pengecualian:** kode yang sudah mulai diisi (punya draft) sebelum waktu kedaluwarsa **tetap boleh diselesaikan** walau waktunya sudah lewat.
- Kode yang sudah punya draft **tidak bisa dihapus** admin.

---

## 4. Penjadwalan & Sesi

**8. Pemotongan paket saat jadwal dibuat (SCH-05)**
- Ada **dropdown "Paket Kredit yang Digunakan"** di form jadwal (single dan weekly pattern).
- Isinya paket yang masih punya sisa, urut paling lama dulu. Paket 0 sesi disembunyikan.
- Jika tidak memilih, otomatis memakai paket aktif tertua. Pemotongan kredit dan kuota cancel mengikuti paket yang tersimpan di sesi.
- Jika semua paket 0, pilihannya "0 Kredit (Sesi Akan Berstatus Frozen)".

**9. Tampilan jadwal bentrok (SCH-04)**
- Saat membuat jadwal: muncul kotak peringatan kuning "Scheduling conflict detected" (**peringatan saja**). Admin tetap bisa lanjut dengan **Schedule Anyway**.
- Di kalender mingguan: sesi yang bentrok ditandai **chip merah + ikon peringatan**.
- Definisi bentrok: terapis yang sama, tanggal sama, jam beririsan. Sesi `cancelled` dan `reschedule_pending` tidak dihitung.
- **Reschedule** (pindah jadwal) berbeda: **tidak boleh bentrok** dan tidak boleh ke tanggal libur.

**10. Revert (REV-02, REV-03, REV-08)**
- Revert hanya **1× per aksi**. Sistem mengetahuinya dari catatan di ledger kredit: satu baris hanya bisa dibalik sekali.
- Skenario REV-03 benar: Selesai → Revert → Selesai lagi membuat catatan baru, sehingga aksi Selesai yang baru boleh di-revert 1× lagi.
- Jika slot asal sudah terisi sesi lain: revert **ditolak/dilewati dengan pesan**. Sistem **tidak menawarkan rekomendasi slot baru**. Pada Bulk Revert, sesi seperti ini dilewati dan dilaporkan di hasil.
- Bentuk tampilan tombol setelah revert pertama (disembunyikan atau error) silakan dicatat saat UAT sebagai hasil pengamatan.

---

## 5. Keuangan, Kredit & Cuti

**11. Void invoice (FIN-16, FIN-17)**
- Void **boleh selama kredit belum berkurang**.
- Void ditolak jika: ada sesi yang sudah selesai, ada cancel/off yang memotong kredit, paket sudah dikonversi, atau invoice sudah di-refund. Untuk kredit yang sudah terpakai, gunakan **Refund**.
- Sesi yang masih `Scheduled` **tidak memblokir** Void, karena kredit belum terpotong.
- Setelah Void: kredit dipertahankan. Sesi `Scheduled` **tidak dihapus** dan **tidak otomatis menjadi Frozen**. Frozen hanya muncul bila kredit 0.
- Dialog Void menampilkan jumlah sesi mendatang sebagai informasi.

**12. Hari cuti vs hari libur (LVE-03)**
- Hari cuti dihitung dari **sesi pertama sampai sesi terakhir** di rentang, memakai **hari kalender biasa**. Hari libur dan Minggu di antaranya **tetap ikut terhitung**.
- Contoh: rentang 7–14 Okt, sesi 8 dan 12 Okt → 5 hari (8, 9, 10, 11, 12), termasuk jika 10 Okt libur.
- Cuti hanya bisa dicatat Finance dan harus ada sesi di rentang yang dipilih. Cuti tidak memotong kredit.

**13. Reset Cuti Tahunan (LVE-12)**
- **Manual**, bukan otomatis/cron. Dijalankan lewat tombol **Reset Cuti Tahunan** di tab **Cuti** pada halaman Finance.
- Yang berhak: **Finance** (dan Master).
- Efek: sisa cuti semua client hangus dan semua client kembali ke 30 hari.

**14. Konversi paket & jadwal berulang (FIN-24)**
- Konversi menghapus **semua jadwal aktif** client: status `scheduled`, `rescheduled`, dan `reschedule_pending`, termasuk seluruh seri berulang dan semua jenis terapi.
- Sesi asesmen tidak ikut terhapus. Sesi `completed` dan `cancelled` tetap sebagai riwayat.
- Tidak ada "template pola" terpisah yang tersisa. Yang dihapus adalah sesi-sesinya, sehingga jadwal harus dibuat ulang.

---

## 6. Data Uji UAT

**15. Pemulihan data `QA-...`**
- **Demo:** tombol **Reset Demo Data** (di layout aplikasi) mengembalikan seluruh data ke kondisi awal. Efeknya **per browser** dan **total**, bukan parsial.
- **UAT backend:** tidak ada endpoint publik untuk reset. Jika data `QA-...` habis, **minta ke developer** (sebut kode data yang habis). Developer yang menjalankan pemulihan di server.
- Saran: catat data uji yang sudah terpakai di lembar pelacak, supaya permintaan pemulihan bisa dikumpulkan sekaligus.

---

## Ringkasan item yang perlu dicatat QA
| No | Catatan |
|---|---|
| 1, 2 | Lockout 5× / reset 10 menit berlaku di backend, belum di demo |
| 5 | Duplikat nama + tanggal lahir boleh disimpan (kode beda); pesan peringatan CLI-05 belum tampil |
| 6 | Penyimpanan bukti transfer = private storage backend; demo hanya simulasi |
| 7 | Kode yang sudah ber-draft tetap bisa diselesaikan walau kedaluwarsa |
| 10 | Tidak ada rekomendasi slot saat revert terbentur slot terisi |
| 12 | Hari libur/Minggu tetap dihitung sebagai hari cuti |
