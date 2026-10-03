# 0002 — Hak akses berbasis modul, hapus per role, status client manual bebas, audit terbatas
- Status: Diterima (keputusan klien); **butir 4 (audit) digantikan oleh ADR 0004**
- Tanggal: 2026-10-03

## Konteks
Jawaban klien atas `pertanyaan_klien.md` dan hasil meeting mengubah beberapa asumsi desain awal: hak aksi per role di-hardcode (mis. `canManageSchedule` hanya master/admin_schedule), status client tidak boleh mundur, penghapusan hanya Master, dan `audit_logs` mencatat semua aksi yang mengubah data.

## Keputusan
1. **Hak akses = akses modul.** Role yang punya akses suatu modul boleh melakukan semua aksi di modul itu (lihat, tambah, ubah, aksi status), termasuk Manager. Tidak ada daftar role hardcode per aksi. Void invoice, renewal langsung, dan koreksi saldo = aksi modul finance.
2. **Hapus dikendalikan flag `roles.can_delete`.** Semua modul punya fitur hapus (soft delete: `deleted_at`, `deleted_by`), tetapi tombol/endpoint hanya tersedia bila role punya `can_delete` **dan** akses modul. Staf tidak dihapus: dinonaktifkan.
3. **Status client: otomatis hanya maju, manual bebas.** Admin boleh mengubah status ke tahap pipeline mana pun (koreksi outcome, reaktivasi). Setiap perubahan tercatat di `client_status_histories`; tidak ada tombol "revert outcome" khusus.
4. **Audit hanya modul schedule & finance** (`audit_logs`). Modul lain memakai `created_by` / `updated_by` / `deleted_by`; pipeline memakai `client_status_histories`.
5. **Kode client berurutan per grup huruf** (`AE-00001`) menjadi ID rekam medis sekaligus kode login ortu (bersama tanggal lahir anak), menggantikan `CLI-` dan `TDC-`.

## Alternatif yang ditolak
- **Matriks izin per aksi per modul (create/update/delete terpisah)**: lebih granular tetapi klien meminta aturan sederhana (akses modul = semua aksi kecuali hapus).
- **Flag hapus per modul per role**: satu flag per role cukup untuk kebutuhan klien; bisa dipecah nanti bila diminta.
- **Audit semua modul**: ditolak klien; menambah volume log dan beban implementasi tanpa kebutuhan bisnis.
- **Kode login ortu terpisah (acak) dari kode client**: lebih sulit ditebak, tetapi klien memilih satu kode. Risiko enumerasi diredam dengan throttle/lockout, tanggal lahir sebagai faktor kedua.

## Konsekuensi
- Positif: aturan akses lebih sederhana dan konsisten dengan RBAC modul; koreksi data tanpa fitur revert khusus.
- Negatif: Manager dan role lain bisa mengubah data bila diberi modul; jejak perubahan modul non-schedule/finance hanya editor terakhir (tanpa nilai lama). Kode client berurutan mudah ditebak.
- Lanjutan: implementasi frontend bertahap (`docs/guide/12-keputusan-klien.md`), migration backend sesuai `schema.md`.
- Dokumen terkait: `schema.md` §04-A, §05, §06.6–6.7; `technical_workflow.md` §0, F2, F9; `docs/guide/02`, `12`.
