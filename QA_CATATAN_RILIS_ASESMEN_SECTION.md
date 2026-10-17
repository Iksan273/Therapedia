# Catatan Rilis untuk QA — Section Kuesioner (Teks Panduan, Dokumen Kesepakatan) & Soal Opsional

**Untuk:** tim tester / QA · **Mengikuti:** `QA_PANDUAN_TESTER_DEV.md` (format catatan rilis §13 A, ID test case, tingkat bug §10)
**Dibuat:** 15 Okt 2026 · **Modul:** Master Asesmen (Admin Inquiry / Master) dan kuesioner publik `/assessment`
**Build:** isi nomor/tanggal build saat dipasang

---

## 1. Ringkasan

Form Google asli (BOT-A, FOT-A, Konsultasi) akan dikonversi menjadi kategori kuesioner terpisah di Master Asesmen. Agar bisa memuat form itu, ada tiga perubahan:

1. **Section punya "Teks Panduan"** (menggantikan "Kalimat Pengantar / Lead Text"). Boleh pendek atau panjang, baris baru dipertahankan. Contoh isi: kunci penilaian skala 0–5, pengantar kesepakatan.
2. **Section bisa melampirkan dokumen Google Docs / Drive.** Admin menempel link; orang tua membaca dokumennya langsung di layar `/assessment` (seperti membaca PDF). Dipakai untuk **Kesepakatan Konsultasi dan Asesmen**. Persetujuan = soal pilihan ganda biasa dengan satu opsi ("Saya telah membaca dan setuju…").
3. **Soal bisa wajib atau opsional.** Sebelumnya semua soal wajib dijawab. Sekarang admin bisa mematikan "Wajib diisi" per soal (mis. "Jika Ya, sebutkan…"). Soal opsional boleh dikosongkan orang tua.

Tidak ada tipe soal baru, tidak ada halaman/route baru.

## 2. Catatan rilis (format §13 A)

```
CATATAN RILIS — Section kuesioner         Build: [nomor/tanggal]

BARU (siap diuji)
- Master Asesmen: dialog Section memuat Teks Panduan + Link Dokumen Google (pratinjau langsung) — TC: ASM-02…ASM-06
- Master Asesmen: switch "Wajib diisi" pada soal, badge "Opsional" di daftar soal — TC: ASM-07, ASM-08
- /assessment: teks panduan + dokumen section tampil di atas soal — TC: QST-19, QST-20
- /assessment: tanda * (wajib) / "(opsional)" per soal; progres hanya menghitung soal wajib — TC: QST-21, QST-22
- Seed demo baru: kategori "Konsultasi (contoh form kesepakatan + soal opsional)" kode jenis KON — dipakai untuk TC di atas

BERUBAH (perilaku lama yang berubah, bukan bug)
- "Kalimat Pengantar (Lead Text)" hilang; isinya kini "Teks Panduan". Sensory Profile lama yang berisi "Anakku ..." tampil sebagai paragraf biasa (tanpa tanda kutip miring).
- QST-08 (kirim dengan pertanyaan kosong): hanya soal WAJIB yang menahan pengiriman.
- Label progres di form: "X / Y Wajib Terisi" (dulu "X / Y Terisi"); tombol kirim "Kirim Jawaban Asesmen (X/Y)" juga menghitung soal wajib.
- Judul dialog: "Tambah/Edit Section" (dulu "Domain Klinis"); tombol "Simpan Section".

BELUM SIAP / DIKETAHUI (jangan dilaporkan sebagai bug)
- Mode API (backend): belum. Perubahan ini baru di MODE DEMO; backend asesmen (M5) dan kolom baru menyusul. Uji hanya di build mode demo (data di localStorage).
- Opsi "Other:" berisian teks pada pilihan ganda/checkbox belum ada. Pengganti: opsi "Lainnya"/"Ya" + soal pendamping teks bebas opsional.
- Tidak ada percabangan antar-section (soal pilih layanan / pilih BOT-A atau FOT-A tidak dimasukkan; layanan ditentukan lewat kategori + kode).
- Google Docs tidak bisa dibuka di halaman tertentu ("Page 1/Page 2" di form lama = dua section).
- Dokumen yang tidak dibagikan "Siapa saja yang memiliki link" akan meminta login Google di iframe — itu perilaku Google, bukan bug aplikasi.
```

## 3. Persiapan uji

- **Mode:** demo (tanpa `VITE_DATA_SOURCE=api`). Versi seed naik ke `demo-2026-10-v19`, jadi data lokal browser otomatis ter-reset saat build baru dibuka. Bila perlu bersih, hapus localStorage / Reset Demo Data.
- **Akun:** Master atau Admin Inquiry (akses Master Asesmen); halaman publik `/assessment` tanpa login.
- **Dokumen contoh:** link kesepakatan sudah ada di seed kategori KON. Minta developer memastikan dokumen itu dibagikan **"Siapa saja yang memiliki link: Viewer"**; tanpa itu TC QST-19 akan menampilkan halaman login Google.
- **Link uji tambahan** (siapkan dari developer): Google Docs publik `/edit`, link dengan `?usp=drive_link`, file Drive `/file/d/…/view`, dan contoh **tidak valid**: `http://docs.google.com/…`, domain lain, spreadsheet, folder Drive.
- **Perangkat:** desktop + HP 375px (Android Chrome / iPhone Safari); mode terang dan gelap untuk halaman Master.
- Data yang dibuat diberi akhiran ` (QA)`.

## 4. Test case baru

Kolom: **ID · P · Langkah · Hasil yang diharapkan** (lanjutan §7.8 dan MST).

### 4.1 Master Asesmen (ASM)
| ID | P | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| ASM-02 | P1 | Tambah section baru, isi Judul dan Teks Panduan **3 baris** | Tersimpan; di daftar section tampil panduan (maks 3 baris); toast "Section … berhasil ditambahkan" |
| ASM-03 | P1 | Edit section lama (mis. kategori Sensory Profile, "Anakku ...") | Dialog terisi teks panduan lama; simpan tidak menghilangkan soal di dalamnya |
| ASM-04 | P0 | Isi **Link Dokumen** dengan Google Docs `/edit?usp=drive_link` (publik) | Pratinjau dokumen tampil di dialog; setelah simpan, section bertanda badge **"Dokumen terlampir"** |
| ASM-04b | P1 | Ulangi dengan link `?tab=t.0`, link `/view`, dan file Drive `/file/d/…/view` | Semuanya valid dan tampil di pratinjau |
| ASM-05 | P0 | Isi link tidak valid: `http://`, domain selain Google, spreadsheet, folder Drive, teks bebas | Pesan merah di bawah isian; tombol Simpan menolak dengan toast; tidak ada pratinjau |
| ASM-06 | P1 | Kosongkan link pada section yang sudah punya dokumen, simpan | Badge hilang; form ortu tidak lagi menampilkan dokumen |
| ASM-07 | P1 | Tambah soal: switch **Wajib diisi** aktif secara default; matikan lalu simpan | Soal berbadge **"Opsional"** di daftar; soal wajib tidak berbadge |
| ASM-08 | P1 | Edit soal opsional, lalu duplikasi soal | Switch mengikuti status tersimpan; salinan tetap opsional |
| ASM-09 | P2 | Dialog Section di HP 375px dan mode gelap | Bisa di-scroll sampai tombol Simpan; pratinjau tidak melebihi lebar; teks terbaca |
| ASM-10 | P1 | Role dengan akses modul tapi tanpa izin hapus | Bisa edit section/soal; tombol hapus tidak ada (RBAC-03) |

### 4.2 Kuesioner publik (QST)
Gunakan kategori **KON** (buat kode lewat Master Asesmen → Terbitkan Kode, pilih "tanpa invoice" agar langsung bisa diisi).

| ID | P | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| QST-19 | P0 | Buka `/assessment?code=KON-…`, lihat section "Kesepakatan Konsultasi dan Asesmen" | Teks panduan tampil (baris baru terjaga), dokumen Google tampil di kotak yang bisa di-scroll; tombol **"Buka di tab baru"** membuka dokumen asli |
| QST-20 | P1 | Dokumen belum dibagikan publik | Kotak menampilkan halaman login Google/akses ditolak; tombol "Buka di tab baru" tetap ada (perilaku Google, bukan bug) |
| QST-21 | P0 | Periksa label soal | Soal wajib bertanda `*`; soal opsional ("Jika Ya, sebutkan") bertulis "(opsional)"; kartu soal opsional kosong tidak disorot amber |
| QST-22 | P0 | Isi semua soal wajib, **kosongkan soal opsional**, centang persetujuan, kirim | Berhasil terkirim. Label "5 / 5 Wajib Terisi (100%)" muncul sebelum kirim |
| QST-22b | P0 | Kirim dengan satu soal wajib kosong | Ditolak: "Mohon lengkapi seluruh pertanyaan wajib (N belum diisi)"; N hanya menghitung soal wajib; "Lihat Pertanyaan" melompat ke soal wajib kosong pertama |
| QST-22c | P1 | Filter **Belum Diisi** | Hanya soal wajib yang belum terisi; soal opsional kosong tidak ikut |
| QST-23 | P1 | Staf membuka jawaban kuesioner yang soal opsionalnya kosong | Tidak ada tulisan "undefined"; jawaban kosong; skor tidak berubah |
| QST-24 | P1 | Isi sebagian, "Simpan & Lanjutkan Nanti", buka lagi dengan kode yang sama | Jawaban pulih; progres benar; kirim final menghapus draft |
| QST-25 | P2 | Buka form di HP 375px | Dokumen pas lebar layar, tidak ada scroll ke samping, tombol ≥ 40px, tinggi dokumen nyaman |
| QST-26 | P1 | Lembar penilaian asesor (hasil kuesioner) untuk kategori yang punya teks panduan | Teks panduan tampil di kepala tabel; tabel skor tidak berubah |

### 4.3 Test case lama yang berubah
| ID | Perubahan |
|---|---|
| MST-05 | Tambahkan: section dengan teks panduan + link dokumen dan soal opsional tampil benar di form |
| QST-08 | Hanya soal **wajib** yang kosong menahan pengiriman; soal opsional kosong boleh |
| QST-09 | Staf melihat jawaban + skor mentah; jawaban opsional kosong tidak menimbulkan skor |
| QST-18 | Tambahkan: kotak dokumen tidak membuat scroll ke samping di 375px |

## 5. Regresi yang perlu diulang (P0)
- Kuesioner Sensory Profile bawaan (kode demo `ASM-2016`/`ASM-2017`): semua soal tetap wajib, skor mentah dan lembar hasil sama seperti sebelumnya.
- QST-05 (bukti transfer), QST-07 (consent), QST-10/11 (sekali isi, kedaluwarsa), ASM-01 (semua tipe soal), MST-04 (hapus master yang dipakai).

## 6. Risiko yang diminta diperhatikan
- Data kuesioner lama di localStorage yang berisi `leadText`: setelah build baru, seed ter-reset; bila tester memakai data lama yang bertahan, teks pengantar lama harus tetap tampil sebagai teks panduan.
- Link dokumen: pastikan tidak ada link non-Google yang lolos (keamanan dasar, NFR). Coba juga domain mirip: `docs.google.com.contoh.com`.
- Tampilan iframe berbeda antar browser (Safari iOS): catat bila dokumen tidak tampil atau tidak bisa di-scroll.

## 7. Pelaporan bug
Gunakan template §13 B. Tingkat: salah blok kirim/kehilangan jawaban/dokumen non-Google lolos = **Kritis/Mayor**; label, tampilan, teks = **Minor**. Sebutkan rujukan TC dari dokumen ini.
