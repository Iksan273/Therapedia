# 0003 — Konversi paket, saldo lebihan, dan log invoice sendiri
- Status: Diterima (keputusan klien/product owner)
- Tanggal: 2026-10-03

## Konteks
Finance perlu mengubah paket yang sudah dibayar (mis. Senior → Regular) tanpa menerbitkan ulang invoice, dengan perhitungan otomatis maupun manual, dan jejaknya harus terlihat di invoice. Sebelumnya `schema.md` menyatakan invoice tanpa diskon dan log invoice hanya bisa dilihat lewat audit log.

## Keputusan
1. **Yang dikonversi adalah paket kredit client**, bukan invoice. Invoice asal tidak berubah nominalnya; ia hanya mendapat log `converted`. Ledger kredit memakai dua baris `converted_out` + `converted_in` (append-only, `conversion_id`), tabel `package_conversions` menyimpan ringkasannya.
2. **Perhitungan**: otomatis = `floor(nilai sisa ÷ harga per sesi tujuan)`; manual = Finance mengisi sesi (alasan wajib) dengan batas atas = hasil otomatis. **Tidak boleh ada kekurangan bayar** (nilai paket baru ≤ nilai sisa).
3. **Lebihan rupiah jadi saldo client** (`clients.leftover_balance`) dan otomatis mengurangi invoice **paket** berikutnya (terbit atau renewal langsung). Ini satu-satunya pengecualian atas "invoice tanpa diskon": `gross_amount`, `balance_applied`, `amount` (bersih). Saldo dikembalikan bila invoice belum lunas dihapus.
4. **Kuota cancel (penalti) ikut pindah** ke paket baru (`cancel_count` disalin).
5. **Semua jadwal terapi mendatang client dihapus** (soft delete) saat konversi karena paket dan terapis berubah; admin schedule menjadwalkan ulang. Sesi riwayat dan asesmen tidak disentuh.
6. **Invoice punya log sendiri** (`invoice_logs`, append-only) yang dibaca UI, bukan diturunkan dari `audit_logs`. Audit tetap mencatat aksi finance (`invoice.package_converted`) untuk pengawasan lintas modul.
7. Tanpa revert konversi di fase ini (jadwal terhapus tidak dapat dipulihkan otomatis).

## Alternatif yang ditolak
- **Mengubah/mengganti invoice asal**: merusak catatan keuangan & omzet.
- **Lebihan dikembalikan tunai / diabaikan**: klien memilih memotong invoice renewal berikutnya.
- **Membolehkan kekurangan (upgrade dengan tagihan selisih)**: ditunda; klien meminta konversi tanpa kekurangan.
- **Log invoice dari audit log**: klien menginginkan log yang melekat pada invoice; juga audit hanya untuk pengawasan.
- **Memindahkan jadwal ke paket baru otomatis**: terapis/ruang berubah, penjadwalan ulang oleh admin lebih aman.

## Konsekuensi
- Tabel baru `package_conversions`, `invoice_logs`; kolom baru di `invoices`, `client_packages`, `credit_ledger`, `clients` (lihat `schema.md`). Total 35 tabel domain.
- Frontend: `domain/credit.js` (+ test), `creditsStore` (`CONVERT_PACKAGE`, saldo, log), hook `usePackageConversionActions`, `ConvertPackageDialog`, `InvoiceLogDialog`, `BalanceHint`.
- Docs diperbarui: `docs/guide/03, 05, 06, 10`, `schema.md`.
- Pekerjaan lanjutan bila diminta: upgrade dengan invoice selisih, revert konversi.
