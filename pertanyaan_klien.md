# Pertanyaan ke Klien (di luar penjadwalan)

Kumpulan hal yang **masih menggantung** dari `schema.md` dan `technical_workflow.md`, siap dibawa ke klien. Pertanyaan seputar jadwal, sesi, dan kuota cancel sengaja **tidak** dimasukkan (dibahas di dokumen terpisah).

**Cara pakai:** tanyakan kolom "Pertanyaan" dengan bahasa apa adanya. Kolom "Usulan teknis" adalah **default** yang kita pakai kalau klien jawab "terserah" atau belum punya preferensi, karena itu yang paling murah dibangun. Isi kolom "Jawaban" saat bertemu klien, lalu kita sesuaikan `schema.md` dan kode.

**Prioritas:** 🔴 menentukan struktur DB atau sulit diubah setelah ada data · 🟡 memengaruhi perilaku fitur, mudah disesuaikan · 🟢 hanya konfirmasi.

---

## A. Client & intake

| # | Pri | Pertanyaan | Kenapa ditanya | Usulan teknis (paling mudah) | Jawaban |
|---|---|---|---|---|---|
| A1 | 🔴 | Apakah satu orang tua bisa punya lebih dari satu anak di Therapedia (kakak-adik)? Kalau ya, apakah ortu mau satu login untuk semua anak? | Login portal ortu sekarang per anak (kode `TDC-XXXX` + tanggal lahir anak). Satu login untuk banyak anak butuh tabel orang tua | Tiap anak = satu client dengan kode sendiri. Ortu login sekali per anak. Tabel orang tua ditunda ke fase 2 kalau ternyata sering terjadi | |
| A2 | 🔴 | Kalau anak yang sudah selesai (discharge) atau berhenti (discontinue) mendaftar lagi, dianggap client baru atau client lama dibuka kembali? | Status client hanya maju, tidak ada "buka kembali". Pilihan ini menentukan riwayat dan nomor rekam medis | **Client baru.** Riwayat lama tetap utuh, catat "pernah terdaftar" di catatan intake. Tampilkan peringatan (bukan blokir) bila nama dan tanggal lahir sama | |
| A3 | 🟡 | Saat client **discontinue** (berhenti sebelum/tanpa jadi aktif), apakah tanggalnya perlu dicatat seperti discharge? Apa alasannya wajib? | Sekarang discontinue tidak mengisi tanggal keluar, dan alasannya disimpan sebagai "other" + catatan | Samakan dengan discharge: isi `date_of_discharge`, alasan wajib (pilihan cepat atau ketik sendiri) | |
| A4 | 🟡 | Kalau admin salah klik Admit / Done Consult / Done Assessment / Discontinue, perlu tombol "batalkan"? Siapa yang boleh? | Revert sudah ada untuk sesi, belum untuk outcome client | Tunda. Kalau perlu, tombol revert khusus Master dengan alasan wajib (log audit sudah disiapkan: `client.outcome_reverted`) | |
| A5 | 🟡 | Dokumen client (rujukan dokter, video observasi, laporan) cukup berupa **link Google Drive**, atau harus bisa **upload file** ke sistem? | Upload file butuh storage, batas ukuran, dan biaya | Link saja (satu atau beberapa link per client, beri label). Tanpa upload | |
| A6 | 🟡 | Bagaimana kalau client salah input dan perlu dihapus? Siapa yang boleh? | Data klinis tidak boleh hilang diam-diam | Hapus = soft delete oleh Master saja, hanya bila belum ada sesi/invoice; tercatat di audit dan bisa dipulihkan | |
| A7 | 🟡 | Perlu mencatat **sumber client** (Instagram, rujukan dokter, sekolah, dll.) untuk laporan marketing? | Tidak ada kolom khusus sekarang | Tulis di catatan intake dulu. Kolom khusus ditambah kalau nanti perlu laporan | |
| A8 | 🟡 | Form "Book a Consultation" di landing page: sekarang hanya membuka WhatsApp (tombol "terkirim" itu simulasi). Apakah form harus **langsung membuat New Intake** di pipeline? | Butuh endpoint publik + proteksi spam | Versi 1 tetap ke WhatsApp. Versi 2: form membuat intake otomatis (sumber = landing), dengan batas permintaan per IP | |
| A9 | 🟢 | Apakah sudah ada **format nomor rekam medis** yang harus dipertahankan? | Sistem membuat `CLI-tahun-nomor` otomatis | Nomor otomatis berurutan per tahun (global, bukan per cabang) | |
| A10 | 🟢 | Pencarian client: cukup dari **awal nama** (mis. "Ken" → Kenzo), atau perlu cari dari bagian nama mana pun? | Cari di tengah kata butuh indeks khusus | Awal nama + nama orang tua + kode akses (cepat dan cukup). Cari di tengah kata ditambah belakangan | |

## B. Kuesioner & asesmen

| # | Pri | Pertanyaan | Kenapa ditanya | Usulan teknis (paling mudah) | Jawaban |
|---|---|---|---|---|---|
| B1 | 🔴 | Boleh ortu mengisi kuesioner **lebih dari sekali**? Kalau ya, hasil mana yang dipakai, dan berapa kali maksimal? | DB menyimpan tiap pengisian sebagai revisi. Frontend sekarang menimpa jawaban lama | Boleh ulang, tanpa batas. Hasil terbaru dipakai, revisi lama tetap tersimpan. Frontend disesuaikan saat integrasi | |
| B2 | 🔴 | Apakah kode kuesioner (`ASM-XXXX`) perlu **masa berlaku** (mis. 14 hari)? | Kode kedaluwarsa butuh job harian | Tanpa masa berlaku. Kode yang belum diisi bisa dihapus manual. Job `assessment-codes:expire` tidak dipasang | |
| B3 | 🔴 | Apakah hasil kuesioner perlu **klasifikasi otomatis** ("Much More Than Others", "Typical", dst.)? Kalau ya, siapa yang menyediakan tabel norma per usia? | Kolom klasifikasi ada di DB tapi frontend belum menghitungnya. Tabel norma instrumen resmi biasanya berlisensi | Versi 1: hanya **skor mentah per kuadran**. Terapis menafsirkan di laporan. Tabel norma ditambah bila klien menyediakannya | |
| B4 | 🟡 | Siapa yang boleh **melihat hasil asesmen**: semua terapis, hanya terapis yang menangani, ortu juga? | Menentukan aturan akses data klinis | Admin inquiry, master, manager (cabangnya), dan terapis cabang yang sama. **Ortu tidak** melihat di versi 1 | |
| B5 | 🟡 | Perlu **persetujuan (consent)** penggunaan data anak sebelum ortu mengisi kuesioner (terkait UU Pelindungan Data Pribadi)? | Perlu bukti persetujuan tersimpan | Satu kotak centang wajib di form + simpan waktu persetujuan (satu kolom di data pengisian) | |
| B6 | 🟢 | Instrumen yang dipakai hanya Sensory Profile 2 dan School Companion, atau akan menambah instrumen lain? | Mesin kuesioner sudah generik | Tidak ada perubahan: instrumen baru dibuat lewat menu Master | |

## C. Keuangan & paket

| # | Pri | Pertanyaan | Kenapa ditanya | Usulan teknis (paling mudah) | Jawaban |
|---|---|---|---|---|---|
| C1 | 🔴 | Apakah klinik menagih lewat sistem hanya untuk **paket sesi**, atau juga **biaya asesmen / konsultasi satuan**? | DB punya jenis invoice `assessment_fee`, `consultation_fee`, `single_session`, tapi UI hanya membuat paket | Versi 1: paket saja. Invoice satuan (tanpa kredit) ditambah bila diminta | |
| C2 | 🔴 | Apakah ada **diskon, DP, cicilan, atau refund**? | Tidak ada di desain sekarang; memengaruhi alur invoice dan saldo | Diskon: ubah nominal saat terbit (harga tersalin ke invoice). Cicilan: satu invoice per cicilan. Refund: dicatat manual, invoice di-void, kredit dikoreksi oleh Master dengan alasan wajib | |
| C3 | 🟡 | Invoice jatuh tempo berapa hari? Perlu pengingat ke ortu? | UI belum punya tanggal jatuh tempo | Default 7 hari dari terbit. Pengingat lewat tombol WhatsApp manual dari daftar invoice terlambat (tanpa job otomatis) | |
| C4 | 🟡 | Apakah paket sesi punya **masa berlaku** (mis. 10 sesi harus habis dalam 3 bulan)? | Masa berlaku butuh job kedaluwarsa dan aturan sisa kredit | Tanpa masa berlaku. Kolom disiapkan, job tidak dipasang | |
| C5 | 🟡 | Bagaimana kalau harga atau isi paket berubah? Perlu bisa edit/hapus paket? | Edit harga di paket yang sudah dipakai membingungkan riwayat | Paket lama dinonaktifkan, buat paket baru. Invoice lama tetap memakai harga saat terbit | |
| C6 | 🟡 | Metode bayar: **transfer bank saja**, atau juga tunai/QRIS/kartu di kasir? | Menentukan isi kolom metode bayar | Transfer (ortu upload bukti) dan tunai lewat renewal langsung Finance. Metode berupa teks bebas | |
| C7 | 🟡 | Siapa yang boleh membatalkan invoice (void), memakai renewal langsung, dan mengoreksi saldo kredit manual? | Aksi sensitif keuangan | Finance dan Master saja. Void dan koreksi saldo wajib alasan dan tercatat di audit | |
| C8 | 🟡 | Aturan bukti bayar: format dan ukuran maksimal, berapa lama disimpan, boleh upload ulang berapa kali? | Menentukan validasi dan storage | JPG/PNG/PDF maks 5 MB, disimpan selama data client ada (storage privat), upload ulang tanpa batas sampai disetujui | |
| C9 | 🟡 | Client yang di-admit tapi **belum bayar** (saldo 0 = Frozen): memang boleh seperti sekarang? | Admit tidak membuat paket otomatis | Ya, sama seperti sekarang. Status Frozen hanya penanda sampai Finance mengaktifkan paket | |
| C10 | 🟢 | Nomor invoice `INV-tahun-nomor`: satu urutan untuk semua cabang atau per cabang? | Menentukan penomoran | Satu urutan global per tahun | |
| C11 | 🟢 | Laporan perlu membedakan **pembelian pertama** dan **perpanjangan** paket? | Menentukan label di riwayat kredit | Otomatis: client belum pernah punya paket = pembelian pertama, selanjutnya perpanjangan (tidak perlu dipilih manual) | |

## D. Akun, akses, dan cabang

| # | Pri | Pertanyaan | Kenapa ditanya | Usulan teknis (paling mudah) | Jawaban |
|---|---|---|---|---|---|
| D1 | 🔴 | Apakah satu terapis bisa bekerja di **lebih dari satu cabang**? | Akun staf sekarang terikat ke satu cabang (kosong = semua cabang) | Satu cabang per terapis. Terapis lintas cabang diberi akun "semua cabang". Pindah cabang diubah manual | |
| D2 | 🟡 | Kalau staf lupa password, bagaimana? Perlu login 2 langkah (OTP)? | Reset lewat email butuh layanan email | Master mengatur password sementara, wajib ganti saat login pertama. Tanpa OTP di versi 1 (ada batas percobaan login) | |
| D3 | 🟡 | Apa yang boleh dilakukan **Branch Manager**: hanya melihat (laporan, audit) atau juga mengubah data? | Menentukan izin role manager | Hanya melihat, terkunci ke cabangnya | |
| D4 | 🟡 | Terapis boleh melihat **semua client cabangnya** atau hanya client yang punya sesi dengannya? | Menentukan aturan akses data klinis | Hanya client yang punya sesi dengannya (sesuai tampilan sekarang) | |
| D5 | 🟡 | Kalau ortu **lupa atau kodenya bocor**, siapa yang mengirim ulang / mengganti kode akses? | Login ortu: kode + tanggal lahir anak | Admin melihat dan mengirim ulang kode dari Client Detail, serta bisa membuat kode baru. Tanpa pemulihan mandiri | |
| D6 | 🟡 | Role kustom (selain 7 role bawaan) masih diperlukan? | Fitur sudah ada, tapi menambah beban pengujian | Pertahankan seperti sekarang, tanpa fitur baru | |
| D7 | 🟢 | Staf yang berhenti: akunnya **dinonaktifkan** (data tetap), bukan dihapus. Setuju? | Terapis yang punya riwayat sesi tidak boleh hilang | Ya, nonaktifkan (soft delete) | |

## E. Notifikasi & komunikasi

| # | Pri | Pertanyaan | Kenapa ditanya | Usulan teknis (paling mudah) | Jawaban |
|---|---|---|---|---|---|
| E1 | 🔴 | Notifikasi WhatsApp ke ortu: **otomatis** (WhatsApp Business API, berbayar dan perlu persetujuan template) atau cukup **tombol klik-kirim** yang membuka WhatsApp admin seperti sekarang? | Menentukan ada tidaknya antrean notifikasi dan biaya bulanan | Tetap klik-kirim (`wa.me`). Sistem hanya menyiapkan teks pesan. Integrasi API ditunda | |
| E2 | 🟡 | **Email orang tua** dipakai untuk apa? Sekarang wajib diisi saat intake | Kalau tidak dipakai, bisa dijadikan opsional | Tetap disimpan sebagai kontak, boleh kosong. Tanpa email otomatis di versi 1 | |

## F. Data, privasi, dan retensi

| # | Pri | Pertanyaan | Kenapa ditanya | Usulan teknis (paling mudah) | Jawaban |
|---|---|---|---|---|---|
| F1 | 🔴 | Berapa lama **rekam klinis dan keuangan** wajib disimpan? Ada permintaan hapus data dari ortu? | Menentukan arsip dan hapus permanen. Perlu dicek ke regulasi (rekam medis, UU Pelindungan Data Pribadi). **Belum diverifikasi oleh tim teknis** | Tidak ada hapus permanen otomatis. Log audit 24 bulan online lalu diarsip (≥ 5 tahun, angka sementara). Hapus permanen hanya manual atas keputusan klinik | |
| F2 | 🔴 | Siapa yang menyediakan dan memegang **server** (hosting, domain, backup)? Anggaran per bulan? | Menentukan lokasi data dan biaya | Satu VPS (Laravel + MySQL) dengan backup harian disimpan 14 hari plus salinan di tempat lain. Frontend tetap di Vercel | |
| F3 | 🟡 | Siapa yang boleh **mencetak / mengekspor** laporan klinis? | Data sensitif anak | Semua staf yang berhak melihat client tersebut. Setiap cetak dan ekspor tercatat di audit | |
| F4 | 🟡 | Siapa yang boleh melihat **log audit** (siapa mengubah apa)? | Log memuat aktivitas semua staf | Master (semua cabang) dan Manager (cabangnya) | |
| F5 | 🟢 | Setuju bahwa aksi **melihat** data sensitif (bukti bayar, hasil asesmen, cetak laporan) ikut dicatat? | Menambah baris log | Ya, hanya untuk aksi sensitif itu (bukan semua halaman) | |

## G. Migrasi data & operasional

| # | Pri | Pertanyaan | Kenapa ditanya | Usulan teknis (paling mudah) | Jawaban |
|---|---|---|---|---|---|
| G1 | 🔴 | Apakah sudah ada **data lama** (client, saldo kredit, invoice) di Excel atau kertas yang harus dimasukkan saat go-live? | Menentukan skrip impor dan saldo awal | Impor sekali dari template CSV: data client dan **saldo kredit awal** (paket "Saldo Awal"). Riwayat invoice dan sesi lama tidak diimpor | |
| G2 | 🟡 | Cabang tetap 3 (East, Citraland, West) atau akan bertambah? Data resmi tiap cabang (alamat, telepon)? | Data cabang disiapkan sebagai isian awal | Isi awal dari data klien. Cabang baru ditambah oleh tim teknis lewat seeder dulu, menu khusus belakangan | |
| G3 | 🟡 | Format **laporan cetak**: kop surat, tanda tangan, bahasa (Indonesia/Inggris)? | Laporan cetak sekarang bercampur istilah Inggris | Template tetap seperti sekarang, kop dan tanda tangan diisi dari data cabang | |
| G4 | 🟡 | Definisi angka dashboard: **omzet** (invoice lunas menurut tanggal verifikasi?), **client aktif** (status admitted?), **konversi** (admitted ÷ semua inquiry?) | Rumus harus sama dengan yang dipakai manajemen | Pakai definisi yang tampil sekarang, minta klien menyetujui tiga angka itu | |

---

## Keputusan teknis internal (tidak perlu ditanya ke klien)

Item menggantung yang bisa kita putuskan sendiri. Kalau setuju, tinggal kita terapkan.

| # | Topik | Keputusan yang diusulkan |
|---|---|---|
| T1 | Riwayat status pertama client | Tambah nilai `created` di enum `trigger` pada `client_status_histories` (sekarang memakai `manual`, tidak berdampak ke dashboard) |
| T2 | Menghapus pilihan cepat alasan cancel/discharge | Tetap boleh, riwayat menampilkan kodenya. Di UI arahkan ke **nonaktifkan** |
| T3 | `purchased` vs `renewed` | Otomatis dari ada tidaknya paket sebelumnya (lihat C11) |
| T4 | Kode `TDC-` / `ASM-` bentrok | Kolom UNIQUE di DB + ulang pembuatan kode bila bentrok (di frontend demo belum dicek, tercatat di known issues B5) |
| T5 | `sort_order` di tabel master | Pertahankan (dipakai urutan dropdown). Kalau tidak butuh urut manual, kolom boleh dibuang |
| T6 | `client_status_histories` vs `audit_logs` | Pertahankan keduanya: yang pertama ringan untuk dashboard funnel dan tidak ikut diarsip |
| T7 | Dashboard besar | Tetap view MySQL. Tabel ringkasan hanya jika `EXPLAIN ANALYZE` view > 100 ms |

## Di luar dokumen ini

Pertanyaan jadwal dibahas terpisah: batasan revert reschedule, cancel sesi asesmen dan kuota cancel, aturan kredit untuk sesi asesmen/konsultasi, sesi mendatang saat client di-discharge, dan siapa yang boleh memaksa jadwal bentrok.
