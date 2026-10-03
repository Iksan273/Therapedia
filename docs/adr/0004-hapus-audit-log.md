# 0004 — Hapus fitur audit log; jejak ringan per modul
- Status: Diterima (keputusan product owner)
- Tanggal: 2026-10-03
- Menggantikan: butir 4 ADR 0002 ("audit hanya modul schedule & finance")

## Konteks
ADR 0002 membatasi `audit_logs` pada modul schedule & finance. Product owner memutuskan fitur audit log tidak dibutuhkan: halaman Audit Logs, tabel `audit_logs` (partisi bulanan + trigger append-only + job arsip), dan service pencatat menambah beban implementasi tanpa kebutuhan bisnis. Satu-satunya log yang dibutuhkan adalah **log milik invoice** (ADR 0003).

## Keputusan
1. **Hapus fitur & tabel `audit_logs`** (frontend: halaman, store, domain, seed, route/menu, modul RBAC `audit_logs`; backend: tabel, partisi, trigger, job `audit:partitions`, service `AuditLogger`).
2. **Semua modul memakai kolom pelaku**: `created_by`, `updated_by`, `deleted_by` (`updated_by` = editor terakhir saja, tanpa nilai lama/baru).
3. **Log khusus yang tetap ada** karena dibutuhkan logika bisnis/UI: `credit_ledger` (append-only, undo = baris `reversal`), `client_status_histories` (pipeline), `invoice_logs` (log invoice sendiri), `package_conversions`.
4. **Revert tidak lagi bergantung pada audit**: pemulihan tahap client oleh revert sesi asesmen memakai `schedules.client_status_from/to` (disimpan saat sesi completed); revert kredit memakai ledger (`reverses_ledger_id`).
5. Aksi yang dulu hanya tercatat di audit (lihat bukti bayar, hapus kode kuesioner, bulk action) kini tidak tercatat selain `updated_by`/`deleted_by`.

## Alternatif yang ditolak
- **Mempertahankan audit untuk schedule & finance**: ditolak product owner.
- **Audit generik via observer model**: tetap menambah tabel & volume; kebutuhan nilai lama/baru tidak ada.

## Konsekuensi
- Pengawasan perubahan data lebih terbatas: hanya pelaku terakhir dan log khusus di atas.
- Skema: `audit_logs` dihapus (34 tabel domain); `updated_by`/`deleted_by` dilengkapi di tabel yang belum punya; kolom `schedules.client_status_from/to`.
- Frontend: seed browser dinaikkan ke `demo-2026-10-v9`; key localStorage `audit_logs` dibersihkan saat versi berubah.
- Docs diperbarui: `schema.md` §05 (kini "Jejak perubahan"), `docs/guide/` 00–12, `CLAUDE.md`, skill project.
