# 12 — Keputusan Klien (3 Okt 2026) & Status Implementasi

Rangkuman jawaban klien atas `pertanyaan_klien.md` dan hasil meeting. Dokumen ini adalah **register keputusan + pelacak implementasi**. Aturan yang sudah diimplementasi di frontend dijelaskan di dokumen alur 02–07; kolom FE menunjukkan statusnya.

Status: **Schema** = `schema.md` + `technical_workflow.md` sudah mengikuti · **FE** = frontend (`frontend/src`) sudah mengikuti (✅ selesai, ☐ belum, ◐ sebagian).

## A. Aturan bisnis

| ID | Keputusan | Schema | FE |
|---|---|---|---|
| B1 | **Kode client** `AE-00001`: grup 2 huruf dari huruf pertama nama (A–E=AE, F–J=FJ, K–O=KO, P–T=PT, U–Z=UZ) + 5 digit counter per grup (global). Menggantikan `CLI-tahun-nomor` dan `TDC-XXXX`; dipakai login ortu + tanggal lahir anak. Tidak berubah walau nama diedit | ✅ | ✅ `nextClientCode`, field `clientCode` |
| B2 | **Kode kuesioner** = `type_code` kategori asesmen + suffix acak (mis. `SP2-K7M4QX`); kategori asesmen punya field kode | ✅ | ✅ `typeCode`, `buildQuestionnaireCode` |
| B3 | **Kuesioner**: hanya sekali isi; masa berlaku opsional per kode (dipilih saat generate), dicek saat dibuka, tanpa job; consent wajib; ortu tidak melihat hasil; semua staf internal boleh; tanpa klasifikasi otomatis | ✅ | ✅ (hasil tidak ditampilkan ke ortu: memang tidak ada halamannya) |
| B4 | **Invoice**: jenis Paket Sesi & Assessment; `INV-{KODE}-{YYYYMMDD}-{NNN}`; tanpa jatuh tempo/diskon/DP/cicilan/refund; snapshot harga saat perpanjang; bukti JPG/PNG/PDF ≤5 MB, upload sekali + re-upload maks 3x; paket tanpa masa berlaku | ✅ | ✅ |
| B5 | **Cancel**: kuota 3 **per paket** (penghitung). Admin **wajib memilih potong kredit atau tidak** pada cancel (scheduled/rescheduled/reschedule_pending, semua jenis kalender, termasuk bulk dan drop pending). Reschedule & pending netral kredit | ✅ | ✅ `DeductCreditChoice` |
| B6 | **Revert hanya 1x** per aksi: reschedule/pending → jadwal asal; sudah 2x reschedule → jadwal tersimpan terakhir (`rescheduledPrev`) | ✅ | ✅ `revertedAt` |
| B7 | **Status client** boleh diubah manual ke tahap pipeline mana pun (koreksi outcome = ubah status; reaktivasi); discontinue punya `date_of_discontinue`; otomatis tetap hanya maju | ✅ | ✅ `changeStatus`, `dateOfDiscontinue` |
| B7b | **Hapus di semua modul**: tombol delete hanya untuk role dengan `can_delete` (+ akses modul). Soft delete. Aksi non-hapus mengikuti akses modul (Manager boleh edit, tidak lagi read-only) | ✅ | ✅ (client, invoice, sesi, kode kuesioner, master asesmen/layanan/alasan; hari libur hard delete). Staf: nonaktif |
| B8 | Pencarian client: awal nama, nama ortu, kode client | ✅ | ✅ `matchesClientSearch` |
| B9 | Form jadwal asesmen/terapi **tanpa pilih service** (diturunkan dari client) | ✅ | ✅ |
| — | Dokumen client = link Google Drive; tanpa kolom sumber client; form landing tetap ke WhatsApp; 1 client = 1 ortu | ✅ | ✅ |
| — | Audit log hanya modul **schedule & finance**; modul lain `created_by`/`updated_by`/`deleted_by` | ✅ | ◐ demo masih mencatat kategori client/asesmen/akses/auth di `domain/audit.js` (lihat 11 I4) |
| — | Non-master terikat 1 cabang; password sementara + wajib ganti login pertama; lupa password via email OTP; Master dapat reset; staf dinonaktifkan; role kustom dipertahankan; tanpa notifikasi otomatis | ✅ | ✅ (email OTP disimulasikan di demo) |

## B. Fitur baru / perubahan dari meeting

| ID | Fitur | Schema | FE |
|---|---|---|---|
| F1 | Hari libur: pengaturan tanggal; jadwal berulang melewati; kalender tidak bisa memilih | ✅ (`holidays`) | ✅ `/admin-schedule/holidays` |
| F2 | Modul monitoring: sesi completed yang laporannya belum diisi (manager) | ✅ (`v_unreported_sessions`) | ✅ `/admin-schedule/unreported-reports` |
| F3 | Portal ortu: View Report nonaktif bila laporan kosong; daftar kuesioner belum diisi (wajib bayar invoice assessment pending dulu); export laporan harian | ✅ | ✅ (export = dokumen cetak/PDF lewat dialog cetak browser) |
| F4 | Dashboard inquiry: pencarian di tab Menunggu Kuesioner & log drop-off (+ tanggal drop-off) | — | ✅ |
| F5 | Detail client (profile): jadwal rutin recurring + jadwal aktif di kalender; filter analitik periode custom; list Active Client (active/discharge/discontinue + filter + reaktivasi) | ✅ | ✅ |
| F6 | Auth: password sementara, wajib ganti, lupa password OTP (simulasi di demo), reset oleh Master, Manager sesuai RBAC | ✅ | ✅ |
| F7 | Landing page dua bahasa (EN/ID) | — | ✅ default Indonesia, pengalih ID/EN di header |
| F8 | Integrasi Google Calendar — **paling akhir** | ✅ (fase akhir, migration ditunda) | ☐ belum dikerjakan (butuh OAuth + backend) |
| F9 | Finance: konversi paket (Senior → Regular), otomatis/manual, lebihan jadi saldo pemotong invoice berikutnya, kuota cancel ikut pindah, jadwal mendatang dihapus, log invoice sendiri (ADR 0003) | ✅ (`package_conversions`, `invoice_logs`) | ✅ tab Billing: Konversi & Log |
| — | Master asesmen: tipe soal selengkap Google Form termasuk `birth_date`; Finance menerbitkan invoice assessment | ✅ | ✅ |

## C. Tafsir tim teknis yang perlu konfirmasi klien
- Grup kode client ditentukan dari huruf **pertama** nama.
- "Revert 1x" = satu langkah mundur per aksi (setelah revert tidak bisa revert lagi sampai ada aksi baru), bukan sekali seumur sesi.
- Pilihan potong/tidak hanya pada **cancel** (termasuk drop pending); reschedule/pending tidak memotong kredit. Cancel sesi asesmen: "potong" memotong paket aktif client (bila ada).
- Kode login ortu berurutan (mudah ditebak) → diamankan throttle/lockout (backend); tanggal lahir satu-satunya faktor kedua.
- Hapus: sesi `completed` harus di-revert dulu; hapus client menyembunyikan sesi & invoice-nya; invoice `paid` yang dihapus keluar dari omzet tanpa membatalkan paket/kredit.
- Gating kuesioner dihitung per **client**: selama ada invoice Assessment belum lunas, semua kuesioner client itu terkunci.
- Kode demo `TDC-1009` kini `AE-00006`; kode kuesioner seed lama `ASM-xxxx` tetap valid (`SEED_VERSION` = `demo-2026-10-v8`).

Sumber utama: `pertanyaan_klien.md`, `schema.md` §04–§06, `technical_workflow.md` (F1–F28), ADR `docs/adr/0002-hak-akses-modul-hapus-per-role-dan-audit-terbatas.md`.
