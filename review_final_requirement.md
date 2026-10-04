# Review Dokumen Final Requirement v1.0 (draf usulan revisi untuk kamu review)

Sumber yang direview: Google Doc "Therapedia – Final Requirement v1.0" (1 Okt 2026, status *Menunggu Persetujuan Klien*). Pembanding: kondisi sistem per 4 Okt 2026 (frontend lengkap, `schema.md` FINAL, `docs/guide/12-keputusan-klien.md`, `pertanyaan_klien.md`).

> **Dokumen asli tidak saya ubah** (Google Doc maupun `docs/Therapedia_Final_Requirement_v1.0.docx`). File ini hanya daftar usulan; teks siap tempel ada di kolom/bagian "Usulan".

**Label sumber perubahan**
- **[K]** = jawaban/keputusan klien (3 Okt 2026, `pertanyaan_klien.md`) — aman dimasukkan.
- **[T]** = keputusan tim setelah meeting (mis. hapus permanen, Void, Master Cabang). Belum tentu sudah disetujui klien: **sebaiknya dikonfirmasi ke klien sebelum tanda tangan** (lihat §7).

**Ringkasan:** ada **13 butir yang bertentangan** dengan sistem sekarang (§1), **32 butir usulan tambahan/perubahan fitur** yang belum tercantum (§2; sebagian berupa perubahan butir yang sudah ada, ditandai "(ubah)"), **9 butir di dokumen yang belum/tidak diimplementasi** dan perlu diputuskan (§3), plus usulan matriks RBAC, istilah, dan butir konfirmasi.

---

## 1. Bagian yang sudah tidak sesuai (perlu direvisi)

| # | Bagian | Isi di dokumen v1.0 | Kondisi sistem sekarang | Usulan revisi | Sumber |
|---|---|---|---|---|---|
| 1 | §1.3 Istilah "Kode TDC"; FR-AUTH-02; FR-INQ-02; §3.2 catatan Portal Orang Tua | Kode klien `TDC-XXXX` (menunggu konfirmasi); login ortu hanya dengan kode | Kode client **`AE-00001`**: grup 2 huruf dari huruf pertama nama (A–E=AE, F–J=FJ, K–O=KO, P–T=PT, U–Z=UZ) + 5 digit counter per grup, tidak berubah walau nama diedit. Login ortu = **kode client + tanggal lahir anak** (faktor kedua), throttle & lockout | Ganti istilah menjadi **Kode Client**. FR-AUTH-02: "Orang tua login memakai Kode Client dan tanggal lahir anak." FR-INQ-02: "Kode Client dibuat otomatis dengan format `XX-00001` (grup huruf dari huruf pertama nama + counter per grup)." | [K] |
| 2 | §1.3 "Kode ASM"; FR-AUTH-03; FR-INQ-05; FR-ASM-03; FR-ASM-08 | Format `ASM-XXXX`; "menunggu konfirmasi" soal sekali pakai/masa berlaku | Kode = **kode jenis asesmen + acak** (mis. `SP2-K7M4QX`), **hanya bisa diisi sekali**, **masa berlaku opsional** (dipilih admin saat generate, dicek saat dibuka), kode yang belum diisi boleh dihapus | Ganti "Kode ASM" menjadi **Kode Kuesioner**. FR-ASM-08: "Kode kuesioner hanya dapat digunakan sekali; masa berlaku bersifat opsional per kode; kode kedaluwarsa tidak dapat dibuka." Hapus tulisan "(Menunggu Konfirmasi)" | [K] |
| 3 | FR-INQ-01 | Pencarian: nama anak, orang tua, **email**, kode | Pencarian: **awal nama anak, nama orang tua, kode client** (email tidak dicari) | Hapus "email" dari daftar pencarian; tambah "pencarian berlaku seragam di semua tabel/daftar" | [K] |
| 4 | FR-SCH-08 + **BR-03** | "3 pembatalan pertama **per klien** tidak memotong kredit; ke-4 dst memotong 1 kredit (otomatis)" | Kuota cancel **3 per paket**, hanya **penghitung** (peringatan bila lewat). **Admin wajib memilih** potong kredit atau tidak di setiap cancel. Reschedule dan "jadwal pengganti menyusul" tidak memengaruhi kredit/kuota | BR-03: "Kuota pembatalan 3 kali per paket sebagai penghitung. Pada setiap pembatalan, admin wajib memilih apakah kredit dipotong atau tidak. Reschedule tidak memotong kredit." FR-SCH-08 disesuaikan | [K] |
| 5 | FR-SCH-09 + **BR-11** | Reschedule langsung, atau "batalkan sesi dulu tanpa mengurangi kredit" | Dua mekanisme: **reschedule langsung**, atau **tandai "jadwal pengganti menyusul"** (status Reschedule – Belum Ada Jadwal). Sesi menggantung bisa ditetapkan jadwalnya, atau **di-drop** (admin memilih potong/tidak). Semua netral kredit sampai drop | Ganti kalimat "membatalkan sesi dulu" dengan "menandai pending lalu menetapkan jadwal pengganti atau membatalkannya (pilihan potong kredit oleh admin)" | [K] |
| 6 | FR-SCH-04 + **BR-12** | Jadwal ditolak bila bentrok dengan **terapis yang sama ATAU klien yang sama** | Sistem hanya memeriksa **bentrok terapis** (terapis sudah menangani client lain di jam yang sama); bentrok klien yang sama **belum** diperiksa. Saat membuat jadwal UI memberi peringatan "Schedule Anyway", reschedule diblokir | Pilih: (a) sesuaikan dokumen: "bentrok terapis"; atau (b) tambah pengecekan klien yang sama di sistem (CR kecil). Perlu keputusan | [T] |
| 7 | FR-SCH-02/03/05; BR-04 | Pilihan "Paket kredit (atau 0 kredit/Frozen)"; Frozen = saldo 0 | Pilihan paket hanya menampilkan **paket yang masih bersisa**; bila tak ada, 1 paket terakhir (Frozen). Client **tanpa paket sama sekali** juga Frozen. Saat renewal/approve, jadwal mendatang otomatis pindah ke paket aktif. Catatan jadwal bernama **Catatan Penjadwalan** (terpisah dari catatan cancel) | Tambahkan: "Paket yang dapat dipilih hanya paket bersisa; client tanpa kredit dapat dijadwalkan dan ditandai Frozen; setelah paket aktif, jadwal mendatang otomatis memakai paket aktif." | [T] |
| 8 | **BR-14** + FR-FIN-06 ("terutang (minus)", "batal (berhalangan)") | Sesi client Frozen yang diselesaikan dicatat sebagai **kredit terutang (saldo negatif)**, dipotong saat renewal | **Tidak ada saldo negatif.** Tanpa paket bersisa, penyelesaian sesi tidak memotong kredit (tidak ada "terutang"). Jenis buku besar yang ada: Terpakai, Cancel (kredit utuh), Penalti cancel, Dibatalkan (Reversal), Top Up/Renewal, Konversi Keluar/Masuk, Koreksi/Pencabutan Kredit (Void) | **Keputusan:** hapus BR-14 dan jenis "terutang/batal (berhalangan)", atau jadikan CR (fitur kredit terutang belum dibangun). Sesuaikan daftar jenis transaksi FR-FIN-06 | [T] |
| 9 | FR-FIN-04 Renewal | Renewal selalu membuat invoice Belum Dibayar, kredit bertambah setelah terverifikasi | **Dua jalur**: (1) *terbitkan invoice baru* (alur biasa), atau (2) *langsung lunas* (pembayaran sudah diterima, mis. tunai) dengan **alasan dan justifikasi wajib**. Renewal bisa **menggantikan invoice void** (paket lama dipakai ulang) | Tulis ulang FR-FIN-04 dengan kedua jalur dan kewajiban alasan + justifikasi untuk jalur langsung lunas | [T] |
| 10 | FR-FIN-02/03; FR-PRT-02 | Invoice: Klien, Paket, Nominal. Bukti: **JPG/PNG/WEBP maks 25 MB, PDF maks 8 MB**, dapat diunggah ulang | Invoice punya **dua jenis**: Paket Sesi dan Assessment; nomor `INV-{KODE}-{YYYYMMDD}-{NNN}`; tanpa jatuh tempo/diskon/DP/cicilan/refund. Bukti: **JPG/PNG/PDF maks 5 MB; upload pertama + re-upload maks 3x**. Invoice assessment belum lunas **menahan akses kuesioner** | Perbarui FR-FIN-02 dan FR-PRT-02 dengan angka dan aturan ini; tambah aturan gating invoice assessment di BR | [K] |
| 11 | FR-THR-02 | "Formulir laporan: Activity, Note, Homework **dengan template isian cepat**" | Template isian cepat **sudah dihapus** | Hapus frasa "dengan template isian cepat" | [T] |
| 12 | **NFR-03** Audit trail | "Aksi penting tercatat: siapa, kapan, apa" (perubahan status, verifikasi, kredit, hak akses) | **Tidak ada audit log** (halaman maupun tabel dihapus). Jejak: kolom pelaku `created_by/updated_by` di semua modul + log khusus: riwayat status pipeline, buku besar kredit, **log tiap invoice**, riwayat konversi paket. Hak akses dan hapus data tidak punya log | Ganti NFR-03 menjadi "Jejak perubahan ringan" dan sebutkan keempat log khusus. **Perlu dikonfirmasi ke klien** karena melemahkan kebutuhan audit awal | [T] |
| 13 | FR-LND-03, FR-LND-05 | Formulir kontak menyimpan **lead** di sistem; konten dapat diubah via CMS sederhana | Formulir landing **tetap diarahkan ke WhatsApp** (tidak membuat lead/intake otomatis); konten landing statis di kode (dua bahasa ID/EN) | Sesuaikan: FR-LND-03 "membuka WhatsApp dengan pesan terformat" dan pindahkan "form → intake otomatis" ke fase 2; FR-LND-05 CMS jadikan fase 2/CR, atau tambah estimasi | [K] |

---

## 2. Fitur baru yang belum ada di dokumen (usulan tambahan)

Teks sudah dibuat dengan gaya dokumen (ID, Kebutuhan, Kriteria Penerimaan) agar tinggal ditempel.

### 2.1 Autentikasi & Administrasi
| ID usulan | Kebutuhan | Deskripsi / Kriteria Penerimaan | Sumber |
|---|---|---|---|
| FR-AUTH-09 | Password sementara | Master mengatur kata sandi sementara; pengguna **wajib mengganti** saat login pertama dan hanya dapat membuka halaman ganti kata sandi sampai selesai. | [K] |
| FR-AUTH-07 (ubah) | Lupa kata sandi | Staf meminta **OTP via email** untuk reset; Master juga dapat mereset langsung. OTP kedaluwarsa ±10 menit, maksimal 5 percobaan. | [K] |
| FR-ADM-06 | Master Cabang | Master dapat menambah, mengubah, mengaktifkan/menonaktifkan, dan menghapus cabang (kode dan nama unik). Cabang nonaktif tidak muncul di pilihan baru namun riwayat tetap. Setiap pengguna non-Master terikat tepat satu cabang. | [T] |
| FR-ADM-07 | Hak hapus per role | Setiap role memiliki pengaturan **boleh menghapus**; tombol hapus hanya tampil bagi role yang diizinkan dan memiliki akses modul terkait. Punya akses modul = boleh semua aksi selain hapus (termasuk Branch Manager). | [K] |
| FR-ADM-08 | Hapus permanen | Penghapusan bersifat **permanen**: hapus client menghapus jadwal, invoice, kredit, kuesioner, dan seluruh data terkait; hapus cabang menghapus seluruh isi cabang (wajib mengetik kode cabang); master data yang **sudah pernah dipakai tidak dapat dihapus** (hanya dinonaktifkan). Pemulihan hanya dari backup. | [T] |
| FR-ADM-04 (ubah) | Matriks RBAC | Toggle akses **13 modul** × peran (lihat §5). | [T] |

### 2.2 Inquiry, Asesmen
| ID usulan | Kebutuhan | Deskripsi / Kriteria Penerimaan | Sumber |
|---|---|---|---|
| FR-INQ-13 | Ubah status manual | Admin dapat mengubah status client ke **tahap pipeline mana pun** (termasuk koreksi dan reaktivasi dari Discharged/Discontinued); perubahan otomatis hanya maju. Discontinue mencatat tanggal discontinue. | [K] |
| FR-INQ-14 | Peringatan duplikat | Saat intake, bila nama + tanggal lahir sama dengan client lain, sistem menampilkan peringatan (tidak memblokir). | [T] |
| FR-ASM-10 | Consent & sekali isi | Orang tua wajib mencentang persetujuan penggunaan data anak sebelum mengirim kuesioner; kuesioner hanya dapat diisi sekali; hasil **tidak** ditampilkan ke orang tua; skor kuadran mentah tanpa klasifikasi otomatis. | [K] |
| FR-ASM-02 (ubah) | Tipe pertanyaan | **12 tipe**: skala 0–5, rentang, pilihan ganda, checkbox multi, teks bebas, ya/tidak, teks singkat, angka, dropdown, tanggal, tanggal lahir, jam. | [K] |

### 2.3 Penjadwalan & Klien aktif
| ID usulan | Kebutuhan | Deskripsi / Kriteria Penerimaan | Sumber |
|---|---|---|---|
| FR-SCH-13 | Revert (1x) | Admin dapat **membatalkan satu langkah** status sesi (selesai/batal/reschedule/pending) dengan alasan wajib; kredit dan kuota dikembalikan sesuai efeknya; hanya **satu kali** per aksi. | [K] |
| FR-SCH-14 | Hari libur | Master/admin mengatur hari libur (semua cabang atau per cabang). Jadwal berulang **melewati** tanggal libur; kalender tidak dapat memilihnya. Sesi yang sudah ada tidak berubah (ditandai). | [K] |
| FR-SCH-15 | Monitoring laporan | Daftar sesi selesai yang **laporannya belum diisi** (untuk manager), dengan filter cabang/terapis/periode. | [K] |
| FR-SCH-16 | Aksi massal tambahan | Selain selesaikan/reschedule/batal massal: **revert massal** (sesi yang tidak memenuhi syarat dilewati dan dilaporkan). | [K] |
| FR-CLT-06 | Roster lengkap | Roster mencakup client Active, Discharged, dan Discontinued dengan filter status; client Discharged/Discontinued dapat **diaktifkan kembali** dari daftar maupun detail. | [K] |
| FR-CLT-07 | Kuota cancel per paket | Detail dan roster menampilkan kuota cancel **per paket aktif** (paket 0 sesi disembunyikan kecuali tidak ada paket bersisa). | [T] |
| FR-CLT-03 (ubah) | Analitik kehadiran | Tabel Performa Kehadiran: kehadiran %, hadir, **tidak hadir = cancel yang memotong kredit**, sesi berikutnya; filter periode kustom, cabang, terapis. Tanpa peringatan kuota. | [T] |
| FR-CLT-08 | Detail client | Profil menampilkan jadwal rutin (recurring) dan jadwal aktif di kalender, plus riwayat sesi dengan "Catatan Penjadwalan". | [K] |

### 2.4 Keuangan
| ID usulan | Kebutuhan | Deskripsi / Kriteria Penerimaan | Sumber |
|---|---|---|---|
| FR-FIN-08 | Jenis invoice | Invoice Paket Sesi dan Invoice Assessment; nomor `INV-{KODE}-{YYYYMMDD}-{NNN}` (KODE = kode paket/ASM). Tanpa jatuh tempo, diskon, DP, cicilan, atau refund. | [K] |
| FR-FIN-09 | Konversi paket | Finance dapat mengonversi **sisa sesi** paket (mis. Senior → Regular): otomatis (nilai sisa ÷ harga per sesi tujuan, dibulatkan ke bawah) atau manual dengan alasan (tidak boleh melebihi hasil otomatis). Lebihan rupiah menjadi **saldo lebihan** client. Kuota cancel ikut pindah; jadwal terapi mendatang dihapus untuk dijadwalkan ulang. Tanpa revert konversi. | [K] |
| FR-FIN-10 | Saldo lebihan | Saldo lebihan otomatis memotong nominal invoice paket berikutnya (sampai sebesar nominal). Tab **Saldo Lebihan** menampilkan client, sisa saldo, sumber (invoice asal konversi), dan invoice yang memakainya. | [K]/[T] |
| FR-FIN-11 | Log invoice | Setiap invoice memiliki log sendiri (terbit, unggah bukti, verifikasi/tolak, pemakaian saldo, konversi, void). | [K] |
| FR-FIN-12 | Void invoice | Invoice **lunas** dapat di-void oleh Finance (alasan wajib). Pilihan wajib: **pertahankan kredit** atau **cabut sisa kredit** (sesi selesai dan laporan tetap; sesi mendatang pindah ke paket aktif lain atau menjadi Frozen). Invoice void tetap tercatat, keluar dari omzet, dan tidak dapat dibatalkan. | [T] |
| FR-FIN-13 | Invoice pengganti | Invoice baru dapat **menggantikan** invoice void (kredit dipertahankan): paket lama dipakai ulang tanpa kredit ganda. Pilihan wajib dibuat bila client memiliki kandidat. | [T] |
| FR-FIN-14 | Hapus invoice | Hanya invoice **belum lunas/ditolak** yang dapat dihapus; invoice lunas dikoreksi lewat Void. | [T] |
| FR-FIN-01 (ubah) | Master paket | Tambah **kode paket** untuk nomor invoice (unik); harga yang diubah tidak memengaruhi invoice/paket yang sudah ada (snapshot); paket tanpa masa berlaku. | [K] |

### 2.5 Portal, dashboard, umum
| ID usulan | Kebutuhan | Deskripsi / Kriteria Penerimaan | Sumber |
|---|---|---|---|
| FR-PRT-06 | Kuesioner & gating | Portal ortu menampilkan kuesioner yang belum diisi; bila ada invoice assessment belum lunas, ortu wajib membayar dulu. | [K] |
| FR-PRT-07 | Laporan sesi | Tombol "View Report" nonaktif bila laporan kosong; **export laporan harian** per sesi. | [K] |
| FR-EXE-03 (ubah) | Performa cabang | Ditambah **filter rentang waktu** (preset dan kustom); rasio konversi dihitung admitted ÷ total intake; cabang dinamis mengikuti Master Cabang. | [T] |
| FR-GEN-01 | Pagination & pencarian | Semua daftar/tabel menampilkan **10 data per halaman** (pilihan 10/25/50, tanpa infinite scroll) dan dapat dicari berdasarkan **nama anak, nama orang tua, kode client** (bila relevan). | [T] |
| FR-GEN-02 | Mode gelap | Pengguna dapat memilih tema terang/gelap (halaman publik tetap terang). | [T] |
| FR-LND-06 | Dua bahasa | Landing page tersedia dalam Bahasa Indonesia dan Inggris. | [K] |

---

## 3. Butir di dokumen yang belum/tidak diimplementasi (perlu keputusan)

| # | ID | Isi di dokumen | Status sistem | Rekomendasi |
|---|---|---|---|---|
| 1 | BR-14 | Kredit terutang / saldo negatif | Tidak ada | Hapus dari dokumen, atau jadikan CR (lihat §1 #8) |
| 2 | BR-12 | Bentrok klien yang sama | Hanya bentrok terapis | Sesuaikan dokumen atau tambah pengecekan (kecil) |
| 3 | FR-LND-03 | Lead tersimpan di sistem | Diarahkan ke WhatsApp | Sesuaikan dokumen; lead otomatis = fase 2 |
| 4 | FR-LND-05 | CMS sederhana untuk konten | Konten statis | Fase 2/CR dengan estimasi sendiri |
| 5 | FR-AUTH-06 | Sesi berakhir otomatis setelah periode tidak aktif | Belum ada batas idle (token dikelola di fase API) | Tetapkan durasi (mis. 8 jam) atau hapus dari dokumen |
| 6 | FR-AUTH-08 | "Remember me" | Hanya pilihan di UI demo | Tetapkan perilaku (durasi token) atau hapus |
| 7 | FR-SCH-09 | Alur "tanpa jadwal pasti" | Sudah ada, tapi dengan mekanisme berbeda | Perbarui teks (lihat §1 #5) |
| 8 | NFR-03 | Audit trail penuh | Dihapus | Konfirmasi ke klien (lihat §1 #12) |
| 9 | FR-INQ-01 | Pencarian email | Tidak dicari | Hapus email dari daftar |

---

## 4. Perubahan kecil per bagian

| Bagian | Perubahan |
|---|---|
| **Kontrol Dokumen** | Tambah baris versi **1.1** (4 Okt 2026) berisi ringkasan: kode client/kuesioner, aturan cancel, finance (void, pengganti, konversi, saldo lebihan), Master Cabang, hapus permanen, jejak perubahan. Tambah kolom/Daftar **Change Log** per butir |
| **§1.2 Ruang lingkup** | Tambah: Master Cabang, hari libur, konversi paket & saldo lebihan, void invoice. Tambah paragraf **di luar ruang lingkup (fase 2)**: WhatsApp Business API otomatis, satu login ortu untuk banyak anak, upload file dokumen ke server (versi 1 = link Google Drive), klasifikasi skor asesmen otomatis, form landing → intake otomatis, diskon/DP/cicilan/refund, invoice biaya satuan lain |
| **§1.3 Istilah** | Ganti Kode TDC → Kode Client; Kode ASM → Kode Kuesioner. Tambah: **Void**, **Invoice Pengganti**, **Saldo Lebihan**, **Konversi Paket**, **Kuota Cancel**, **Revert**, **Renewal** (dua jalur), **Reschedule Pending**, **Discharge vs Discontinue** (tanggal berbeda). Perbarui definisi **Frozen**: "kredit 0 atau belum memiliki paket" |
| **§2.1 Cabang** | Tambah catatan: daftar cabang dikelola Master (Master Cabang); data alamat/telepon resmi disediakan klien |
| **§2.2 Alur bisnis** | Poin A.5: invoice assessment menahan kuesioner; poin A.6 + keputusan manual bebas; Poin B: sesi selesai memotong kredit paket yang dipilih, kuota cancel per paket, Reschedule Pending, Revert 1x |
| **§2.3 Daftar modul** | Tambah modul: **MON** (Monitoring laporan), **HOL** (Hari libur), **BRN** (Master Cabang); CLT menyebut Finance sebagai pengguna (sudah) |
| **§3.1 Peran** | Finance: "Sesuai penugasan" → "Cabang sendiri"; semua non-Master terikat tepat satu cabang. Tambah penjelasan hak hapus per role |
| **§5 NFR** | NFR-01: "JWT" → "token Bearer (Laravel Sanctum)". NFR-04: tetap (file di storage privat). Tambah **NFR-09 Performa** (daftar dipaginasi, query terindeks), **NFR-10 Backup** (harian + arsip tiap 6 bulan/1 tahun, uji restore), **NFR-11 Proses sinkron** (tanpa antrean; operasi hapus besar boleh lama), **NFR-12 Responsif** (portal ortu dan kuesioner diuji di 375 px). NFR-08: tambah MySQL 8, tanpa Redis |
| **§6 Aturan bisnis** | Ubah BR-03, BR-11; hapus/putuskan BR-12 dan BR-14. Tambah: **BR-15** invoice assessment belum lunas menahan kuesioner; **BR-16** kuesioner sekali isi + consent; **BR-17** invoice lunas tidak dihapus, hanya Void; **BR-18** master yang sudah dipakai tidak dapat dihapus; **BR-19** saldo lebihan memotong invoice paket berikutnya; **BR-20** revert hanya satu kali per aksi; **BR-21** kode client tidak dipakai ulang |
| **§7 Asumsi** | Tambah: data lama (client, saldo kredit) diserahkan klien dan dikonversi tim (G1, menyusul); retensi data minimum menunggu regulasi/keputusan klien; hapus permanen berarti pemulihan hanya dari backup |

---

## 5. Usulan Matriks Hak Akses Default (§3.2)

Disamakan dengan konfigurasi di sistem (`rbac.js`). Kolom **Hapus** = role boleh menghapus (hak hapus per role, default hanya Master).

| Modul | Master | Manager | Adm. Inquiry | Adm. Schedule | Finance | Terapis |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Dashboard Revenue | ✓ | ✓ | – | – | ✓ | – |
| Inquiry Pipeline | ✓ | ✓ | ✓ | – | – | – |
| Inquiry Dashboard | ✓ | ✓ | ✓ | – | – | – |
| Weekly Calendar | ✓ | ✓ | – | ✓ | – | – |
| Schedule Dashboard | ✓ | ✓ | – | ✓ | – | – |
| Active Client | ✓ | ✓ | – | ✓ | ✓ | – |
| Finance & Invoices | ✓ | – | – | – | ✓ | – |
| **Monitoring Laporan Sesi** (baru) | ✓ | ✓ | – | ✓ | – | – |
| **Hari Libur** (baru) | ✓ | – | – | ✓ | – | – |
| User Management | ✓ | – | – | – | – | – |
| **Master Cabang** (baru) | ✓ | – | – | – | – | – |
| RBAC | ✓ | – | – | – | – | – |
| Therapist Module | ✓ | – | – | – | – | ✓ |
| **Hak Hapus** (baru) | ✓ | – | – | – | – | – |

Catatan: matriks lama menyebut "10 modul"; sekarang **13 modul** (+ Monitoring Laporan, Hari Libur, Master Cabang). Master dapat mengubah semuanya, termasuk membuat custom role.

---

## 6. Perubahan label tampilan yang perlu disebut (opsional)

- Pipeline: tambah status **Discharged** (dari Admitted) pada daftar status; Kanban tetap 8 kolom.
- Status invoice: Belum Lunas, Menunggu Verifikasi, Lunas Terverifikasi, Ditolak, **Void**.
- Status sesi: Scheduled, Completed, Cancelled, Rescheduled, **Reschedule – Belum Ada Jadwal**.
- Jenis buku besar: Top Up/Renewal, Sesi Terpakai, Cancel (Kredit Utuh), Penalti Cancel, Dibatalkan (Reversal), Konversi Keluar/Masuk, **Koreksi/Pencabutan Kredit (Void)**.

---

## 7. §8 "Poin yang Memerlukan Konfirmasi Klien"

**Butir lama (sudah dijawab, bisa dipindah ke Ringkasan Keputusan):**
1. Format kode client → `AE-00001` (grup huruf pertama) ✔
2. Format Kode Kuesioner → randomize sistem + kode jenis ✔
3. Masa berlaku/sekali pakai → keduanya: masa berlaku opsional, sekali pakai ✔

**Butir baru yang sebaiknya masuk daftar konfirmasi** (terutama label [T]):

| No | Pertanyaan ke klien | Usulan jawaban dari tim |
|---|---|---|
| 4 | Setuju penghapusan **permanen** (client, invoice belum lunas, cabang) dan pemulihan hanya dari backup? | Ya, dengan konfirmasi tegas dan backup harian + arsip tiap 6 bulan/1 tahun |
| 5 | Setuju invoice lunas **tidak dapat dihapus**, dikoreksi lewat **Void** (pilihan pertahankan/cabut kredit) dan **invoice pengganti**? | Ya |
| 6 | Audit log penuh **ditiadakan** (diganti jejak pelaku terakhir + 4 log khusus). Setuju? | Ya (jika ada kebutuhan audit tertentu, sebutkan) |
| 7 | **Kredit terutang/saldo negatif** (BR-14): dibutuhkan atau dihapus? | Dihapus (tidak ada saldo negatif) |
| 8 | Bentrok jadwal **klien yang sama** (BR-12): perlu diblokir? | Tambahkan pengecekan atau cukup bentrok terapis |
| 9 | Formulir landing: cukup diarahkan ke **WhatsApp** (tanpa lead tersimpan)? CMS konten = fase 2? | Ya |
| 10 | Durasi **sesi login otomatis berakhir** dan perilaku "remember me" | Mis. 8 jam / 30 hari |
| 11 | Data cabang resmi (alamat, telepon) dan format laporan cetak (G2, G3) | Menunggu klien |
| 12 | Retensi data minimum dan penyedia server (F1, F2) dan definisi angka dashboard (G4) | Menunggu klien |
| 13 | Data lama (client, saldo kredit) untuk go-live (G1) | Klien menyerahkan data, tim mengonversi |

---

## 8. Saran urutan kerja merevisi dokumen
1. Terapkan bagian **§1** (ketidaksesuaian) lebih dulu, terutama #1, #2, #4, #8, #12, karena itu yang bisa menimbulkan salah paham saat UAT.
2. Tambahkan **§2** (fitur baru) dan **§4** (perubahan per bagian), lalu **§5** (matriks).
3. Kirim **§7** ke klien sebagai lembar konfirmasi; naikkan versi menjadi **1.1** dan catat di Kontrol Dokumen.
4. Setelah klien menandatangani v1.1, perubahan berikutnya melalui Change Request.
