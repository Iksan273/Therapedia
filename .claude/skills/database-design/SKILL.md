---
name: database-design
description: Desain database MySQL 8 + Laravel 11 untuk Therapedia — penamaan, tipe data, indeks komposit berbasis query, ledger kredit append-only, optimistic locking, jejak perubahan, partisi, dan tabel ringkasan dashboard. Pakai saat menambah/mengubah tabel atau kolom, menulis migration, mendesain query/indeks, membahas performa DB, atau memperbarui schema.md.
---

# Database Design — Therapedia (MySQL 8 · Laravel 11)

Sumber kebenaran skema: **`schema.md`** (root repo). Setiap perubahan tabel/kolom/indeks wajib memperbarui `schema.md` + mapping di `docs/guide/03-data-model.md` & `docs/guide/10-api-migration.md`.

## 1. Proses desain (wajib berurutan)

1. **Kumpulkan query nyata** — dari halaman/filter frontend (cabang, periode, status, terapis, search). Tulis daftar "query → frekuensi → target latensi".
2. **Modelkan entity** dari `docs/guide/03-data-model.md`; pisahkan data inti (OLTP) dari data turunan/agregat.
3. **Normalisasi sampai 3NF**, lalu **denormalisasi terukur** hanya untuk hot path (saldo kredit, counter cancel) — selalu dengan sumber kebenaran (ledger) + job rekonsiliasi.
4. **Desain indeks dari query** (bukan dari kolom). Kolom equality dulu, lalu range, lalu kolom sort; pertimbangkan covering index.
5. **Tentukan aturan integritas**: FK, unique, check, idempotency key, `version`.
6. **Tentukan jejak**: tidak ada audit log (ADR 0004). Pakai `created_by`/`updated_by`/`deleted_by`; bila aksi butuh riwayat sendiri, buat log khusus append-only (contoh `invoice_logs`, `credit_ledger`).
7. **Tulis migration** sesuai urutan dependensi; update `schema.md`.

## 2. Konvensi

| Aspek | Aturan |
|---|---|
| Engine/charset | InnoDB, `utf8mb4`, `utf8mb4_0900_ai_ci` |
| Nama tabel | snake_case jamak (`client_packages`); pivot = dua nama tunggal urut alfabet (`client_service`) kecuali butuh kolom tambahan |
| PK | `id BIGINT UNSIGNED AUTO_INCREMENT` (`$table->id()`); lookup table boleh PK `code VARCHAR` |
| FK | `<entity>_id`, `constrained()`; `restrictOnDelete()` untuk data bisnis, `cascadeOnDelete()` hanya untuk anak murni (detail jawaban, section soal) |
| Waktu | `DATETIME` UTC via `timestamps()`; tanggal kalender `DATE`; slot jam `TIME`; presisi log `DATETIME(3)` |
| Uang | `BIGINT UNSIGNED` dalam **rupiah utuh** (tanpa desimal). Jangan `FLOAT`/`DOUBLE` |
| Boolean | `TINYINT(1)` via `boolean()` dengan prefix `is_`/`has_` |
| Status siklus hidup tetap | `ENUM` (hemat, cepat). Tambah nilai **di akhir** (ALTER instan MySQL 8) |
| Daftar yang bisa diedit user (alasan, layanan, kuadran) | **Lookup table** dengan PK `code` |
| Soft delete | Hanya entity bisnis yang bisa "dihapus" user (clients, users, master). **Tidak** untuk ledger & log |
| Optimistic lock | Kolom `version INT UNSIGNED DEFAULT 1` pada entity yang bisa diedit bersamaan (clients, schedules, invoices, client_packages). `UPDATE … WHERE id=? AND version=?` → 0 baris = HTTP 409 |
| Jejak pelaku | `created_by`, `updated_by` (FK users, nullable) pada tabel transaksi |
| JSON | Hanya untuk data yang tidak difilter (opsi soal, snapshot log). Jika perlu difilter → generated column + indeks |
| Snapshot | Simpan nama/harga saat transaksi (`package_name`, `amount`) agar histori tidak berubah saat master diedit |

## 3. Pola penting

### Ledger append-only (kredit)
- `credit_ledger` hanya INSERT. Koreksi = baris `reversal` yang menunjuk `reverses_ledger_id`.
- Saldo cepat: `client_packages.remaining_credit` & `clients.credit_balance` (denormalisasi) diperbarui **dalam transaksi yang sama** dengan `SELECT … FOR UPDATE` pada `client_packages`.
- Idempotensi: `idempotency_key` UNIQUE (mis. `used:schedule:{id}:v{version}`) mencegah potong ganda.
- Job harian rekonsiliasi: `SUM(credit_change)` per paket = `remaining_credit`.

### Jejak perubahan (tanpa audit log)
- Tidak ada tabel `audit_logs` (ADR 0004). Semua tabel transaksi/master: `created_by`, `updated_by` (editor terakhir), dan `deleted_by` bila ada soft delete.
- Log khusus append-only hanya bila dibutuhkan logika/UI: `credit_ledger` (undo = baris `reversal`), `client_status_histories`, `invoice_logs`, `package_conversions`. Ditulis di transaksi yang sama dengan perubahan datanya.

### Konflik jadwal
- Tidak bisa dijamin oleh UNIQUE (overlap rentang). Backend: transaksi + `SELECT … FOR UPDATE` pada sesi terapis di tanggal itu, cek overlap, lalu insert.
- Indeks `(therapist_id, session_date, start_time)`.

### Dashboard cepat
- **Stack hanya MySQL (tanpa Redis)**: cache dan session memakai driver `database`; tanpa queue/job async (semua proses sinkron). Andalkan InnoDB buffer pool + indeks yang tepat.
- Dashboard membaca **VIEW** (`v_daily_*`) di atas indeks covering. Kolom tanggal bisnis = generated column WIB (`DATE(ts + INTERVAL 7 HOUR)`) agar sargable. Query ke view selalu difilter cabang + rentang tanggal (pushdown MySQL ≥ 8.0.22).
- Tabel ringkasan (`daily_branch_metrics` + job `metrics:rebuild`) **hanya** jika `EXPLAIN ANALYZE` view > 100 ms. Struktur query view dipakai ulang sebagai pengisinya.
- JOIN tanpa agregasi aman dijadikan view (algoritma MERGE); pastikan kolom filter terindeks di tabel dasar.

### Job terjadwal
- Daftar & tujuan job ada di `schema.md` §11 (Laravel Scheduler, satu cron `schedule:run`).
- Job: idempoten, `withoutOverlapping()->onOneServer()`, `chunkById`, transaksi per batch; ringkasan run ke log aplikasi.
- Jangan membuat job untuk data yang bisa dihitung live dengan indeks (frozen, birthday, dashboard).

### Pagination
- List besar (ledger, invoice_logs, schedules history) memakai **keyset pagination** (`WHERE (occurred_at, id) < (?, ?) ORDER BY occurred_at DESC, id DESC LIMIT 50`), bukan OFFSET.

## 4. Checklist indeks

- [ ] Setiap query list punya indeks yang diawali kolom filter equality (biasanya `branch_id`), lalu range (`session_date`, `issued_at`).
- [ ] FK yang dipakai join punya indeks (Laravel `constrained()` otomatis).
- [ ] Tidak ada indeks duplikat prefix (mis. `(a)` dan `(a,b)` — cukup `(a,b)`).
- [ ] Kolom kardinalitas rendah (`status`) tidak jadi indeks tunggal; gabungkan dalam komposit.
- [ ] `EXPLAIN` untuk query dashboard & kalender: `type` = `range`/`ref`, tanpa `Using filesort` pada list utama.

## 5. Target performa (acuan)

| Operasi | Target p95 (server) |
|---|---|
| Detail entity (by id) | < 30 ms DB, < 100 ms API |
| List ber-filter + pagination | < 50 ms DB, < 200 ms API |
| Kalender 1 minggu 1 cabang | < 50 ms DB |
| Aksi transaksional (complete/verify) | < 150 ms API |
| Dashboard (dari ringkasan) | < 100 ms API |

## 6. Template migration Laravel

```php
Schema::create('schedules', function (Blueprint $table) {
    $table->id();
    $table->foreignId('branch_id')->constrained()->restrictOnDelete();
    $table->foreignId('client_id')->constrained()->restrictOnDelete();
    $table->foreignId('therapist_id')->constrained('users')->restrictOnDelete();
    $table->date('session_date');
    $table->time('start_time');
    $table->time('end_time');
    $table->enum('status', ['scheduled', 'completed', 'cancelled', 'rescheduled', 'reschedule_pending'])->default('scheduled');
    $table->unsignedInteger('version')->default(1);
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
    $table->softDeletes();

    $table->index(['branch_id', 'session_date', 'status'], 'sch_branch_date_status');
    $table->index(['therapist_id', 'session_date', 'start_time'], 'sch_therapist_slot');
});
```

## 7. Output yang diharapkan
1. Tabel/kolom/indeks baru dengan alasan per indeks (query yang dilayani).
2. Kolom pelaku (`created_by`/`updated_by`/`deleted_by`) dan log khusus bila perlu.
3. Update `schema.md` (spesifikasi, ERD mermaid, urutan migration) dan mapping frontend ↔ DB.
4. Catatan risiko: lock, pertumbuhan data, kebutuhan job rekonsiliasi/arsip.
