# 0005 — Hapus permanen (hard delete) dengan cascade; master ber-FK yang dipakai tidak bisa dihapus
- Status: Diterima (keputusan product owner)
- Tanggal: 2026-10-04
- Menggantikan: butir 2 ADR 0002 ("hapus = soft delete + `deleted_by`") dan keputusan sementara "hapus client = sembunyikan"

## Konteks
Hapus sebelumnya soft delete (`deleted_at` + `deleted_by`). Akibatnya data "terhapus" tetap ada dan harus disaring di setiap list/view, FK `restrict` memaksa data yatim disembunyikan lewat join, dan angka dashboard harus memfilter client terhapus. Product owner memutuskan hapus berarti **hapus data sebenarnya**.

## Keputusan
1. **Semua hapus = `DELETE` fisik.** Tidak ada `softDeletes()`, `deleted_at`, `deleted_by`, atau enum log `deleted`. View dan indeks tidak lagi memfilter `deleted_at`.
2. **Hapus client** → client + jadwal (sesi, laporan sesi, seri) + invoice (bukti bayar, log, paket, konversi) + ledger kredit + riwayat status + kode/jawaban kuesioner + dokumen + layanan terpilih.
3. **Hapus invoice hanya untuk yang belum lunas** (belum punya paket): invoice + bukti bayar + log terhapus, saldo lebihan yang dipakainya kembali ke client. **Invoice lunas tidak bisa dihapus**; koreksinya lewat **Void** (invoice tetap tercatat, keluar dari omzet). Void mewajibkan alasan dan pilihan kredit: *pertahankan kredit* atau *cabut sisa kredit* (paket `voided`; sesi selesai & laporan tetap; sesi mendatang pindah ke paket aktif lain atau Frozen). Invoice baru dapat *menggantikan* invoice void agar paket lama dipakai ulang tanpa kredit dobel. (Revisi 4 Okt 2026: sebelumnya hapus invoice menghapus paket dan seluruh sesinya; ditolak karena risiko salah klik menghapus jadwal dan laporan yang sudah terjadi.)
4. **Hapus master data**:
   - Master ber-FK (`services`, `sensory_quadrants`, `master_packages`, `assessment_categories/sections/questions`, `roles`) → langsung terhapus **hanya bila belum pernah dipakai**; yang sudah dipakai ditolak (FK `RESTRICT`, service mengembalikan 409 dengan alasan; solusi: nonaktifkan).
   - Master pilihan string (`cancel_reasons`, `discharge_reasons`, `holidays`) → langsung terhapus tanpa cek karena transaksi menyimpan string, bukan FK.
5. **Hapus cabang** → seluruh isi cabang: client (dan semua turunannya), jadwal, invoice, ledger, hari libur cabang, lalu akun staf/terapis cabang itu. Dijalankan **sinkron** dalam satu transaksi atomik dengan konfirmasi mengetik kode cabang. Akun `master` tidak tersentuh.
6. Hanya role dengan `roles.can_delete` + akses modul yang boleh menghapus (tidak berubah dari ADR 0002).

## Desain database (ringkas; rinci di `schema.md` §04 dan §6.7)
- Data milik induk memakai `ON DELETE CASCADE`: `clients.branch_id`, `schedules.{branch_id,client_id}`, `invoices.{client_id,branch_id}`, `client_packages.{client_id,converted_from_package_id}`, `credit_ledger.{client_id,branch_id,client_package_id,conversion_id,reverses_ledger_id}`, `package_conversions.*`, `invoice_logs.invoice_id`, dan semua anak client lainnya.
- Master yang dipakai memakai `RESTRICT` (`invoices/client_packages.master_package_id`, FK kode layanan/kuadran, `assessment_*.category_id/question_id`, `users.role_id`).
- `users.branch_id` sengaja `RESTRICT` (bukan `SET NULL`: staf akan menjadi "semua cabang"); `schedules.therapist_id` `RESTRICT`. Hapus cabang menghapus sesi dulu, baru staf, lewat urutan eksplisit di service.
- `client_packages.invoice_id` dan `schedules.client_package_id` `SET NULL`: paket dan sesi tidak ikut terhapus saat invoice/paket hilang; invoice lunas dijaga di service (409). `credit_ledger.schedule_id` `SET NULL`: menghapus satu sesi tidak menghapus ledger-nya.

## Alternatif yang ditolak
- **Tetap soft delete + purge berkala**: data hilang tetap harus disaring di semua query; product owner ingin hapus sungguhan.
- **Trigger hapus manual**: cascade FK sudah menjamin tidak ada data yatim tanpa kode tambahan.

## Konsekuensi
- **Tidak bisa dipulihkan** setelah commit. Satu-satunya jalan pulih adalah backup (harian dan arsip 6 bulan/1 tahun). UI wajib konfirmasi tegas (hapus cabang: ketik kode cabang); service menulis satu baris ke log aplikasi (file, bukan tabel; ADR 0004 tetap berlaku).
- Tidak ada jejak "siapa menghapus apa" di DB. `deleted_by` dan `invoice_logs.action = 'deleted'` dihapus dari skema.
- Hapus cabang/client besar adalah operasi berat (ribuan baris ledger/sesi): **sengaja sinkron** (tanpa job async, keputusan 4 Okt 2026) sehingga request boleh lama; timeout rute dinaikkan, penghapusan dibagi per batch di dalam satu transaksi agar memori terjaga dan hasilnya atomik.
- File bukti bayar di storage privat dihapus sinkron tepat setelah commit (kegagalan hanya dicatat di log aplikasi).
- Sesi `completed` yang punya ledger harus di-revert dulu sebelum dihapus satu per satu (aturan hapus sesi tunggal tidak berubah); hapus client/invoice/cabang tidak punya syarat itu.
- Frontend: store client/jadwal/kredit/cabang melakukan hapus nyata dengan cascade lewat hook use-case; field `deletedAt/deletedBy` dibuang.
