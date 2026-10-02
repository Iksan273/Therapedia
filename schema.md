# Skema Database Therapedia — v2

**One Gate Integrated Clinic System** · MySQL 8.0.22+ (InnoDB) · Laravel 11 · Sanctum · **tanpa Redis** (cache, queue, session memakai MySQL)

Dokumen ini adalah sumber kebenaran desain database backend. Skema mencakup **seluruh fitur prototype frontend** (`frontend/`): intake & pipeline, mesin asesmen, penjadwalan + kredit, finance, portal terapis, portal orang tua, dashboard, RBAC, dan **audit log untuk setiap aksi yang mengubah data**.

Disusun dengan skill `database-design` (`.claude/skills/database-design/SKILL.md`). Mapping field frontend ↔ kolom ada di bagian 08 dan `docs/guide/03-data-model.md`.

---

## Daftar Isi
- [00. Prinsip desain](#00-prinsip-desain)
- [01. Query utama & target performa](#01-query-utama--target-performa)
- [02. Peta modul & tabel](#02-peta-modul--tabel)
- [03. ERD](#03-erd)
- [04. Spesifikasi tabel](#04-spesifikasi-tabel)
- [05. Audit log](#05-audit-log)
- [06. Alur transaksi kritis](#06-alur-transaksi-kritis)
- [07. Strategi performa](#07-strategi-performa)
- [08. Mapping frontend ↔ database & keputusan enum](#08-mapping-frontend--database--keputusan-enum)
- [09. Urutan migration & seeder](#09-urutan-migration--seeder)
- [10. Catatan implementasi Laravel](#10-catatan-implementasi-laravel)
- [11. Job terjadwal (Laravel Scheduler)](#11-job-terjadwal-laravel-scheduler)

---

## 00. Prinsip desain

| # | Prinsip | Wujud di skema |
|---|---|---|
| 1 | **Indeks dari query, bukan dari kolom** | Setiap indeks komposit di bagian 04 menyebut query yang dilayani (lihat 01) |
| 2 | **Ledger sebagai sumber kebenaran kredit** | `credit_ledger` append-only; saldo di `client_packages` & `clients` adalah denormalisasi yang diperbarui di transaksi yang sama |
| 3 | **Tidak ada perubahan yang hilang** | `audit_logs` mencatat semua aksi + nilai lama/baru; pembatalan (undo) = aksi baru yang menunjuk aksi asal, bukan menghapus/menimpa |
| 4 | **Reversible by design** | Kolom `previous_status`, `credit_effect`, `reverses_ledger_id`, `reverts_audit_id` memungkinkan "completed lalu dibatalkan" tanpa kehilangan jejak |
| 5 | **Aman dari edit bersamaan** | Kolom `version` (optimistic lock) pada entity yang sering diubah → HTTP 409 |
| 6 | **Idempoten** | `credit_ledger.idempotency_key` UNIQUE mencegah potong kredit ganda |
| 7 | **Snapshot nilai transaksi** | Nama paket, harga, nama pelaku disalin saat transaksi agar histori tidak berubah ketika master diedit |
| 8 | **Baca cepat tanpa infrastruktur tambahan** | Dashboard = **VIEW + JOIN** di atas indeks covering & generated column tanggal; tanpa Redis dan tanpa tabel ringkasan selama target terpenuhi (§04-G, §07) |
| 9 | **Lookup table untuk daftar yang bisa diedit** | Layanan dan kuadran = tabel ber-PK `code`. Alasan cancel/discharge juga tabel `code`, tetapi hanya **pilihan cepat tanpa FK** (transaksi menyimpan string, boleh teks custom) |
| 10 | **ENUM untuk siklus hidup tetap** | Status client/sesi/invoice/paket |

Konvensi umum (detail di skill): InnoDB `utf8mb4_0900_ai_ci`; PK `BIGINT UNSIGNED`; waktu `DATETIME` UTC; tanggal kalender `DATE`; slot `TIME`; uang `BIGINT UNSIGNED` rupiah utuh; soft delete hanya untuk entity bisnis; ledger & audit tidak pernah di-UPDATE/DELETE.

---

## 01. Query utama & target performa

Daftar ini adalah dasar desain indeks. Setiap halaman prototype dipetakan ke query utamanya.

| ID | Halaman / fitur | Query | Indeks yang melayani | Target DB p95 |
|---|---|---|---|---|
| Q1 | Weekly Calendar (Admin Schedule) | sesi 1 cabang, 1 minggu, opsional terapis | `schedules (branch_id, session_date, status)` · `schedules (therapist_id, session_date, start_time)` | < 30 ms |
| Q2 | Conflict check saat buat/pindah sesi | sesi aktif terapis X tanggal D yang overlap jam | `schedules (therapist_id, session_date, start_time)` | < 10 ms |
| Q3 | My Schedule (Terapis) | sesi terapis X rentang minggu | `schedules (therapist_id, session_date, start_time)` | < 20 ms |
| Q4 | Inquiry Pipeline (kanban) | client per cabang per status, urut terbaru | `clients (branch_id, status, created_at)` | < 30 ms |
| Q5 | Search client (nama / ortu / kode) | prefix nama / kode akses | `clients (child_name)`, `clients (parent_name)`, UNIQUE `client_access_code` | < 30 ms |
| Q6 | Active Clients roster + filter kredit | client `admitted` per cabang + saldo | `clients (branch_id, status, credit_balance)` | < 30 ms |
| Q7 | Birthday radar | client aktif per cabang per bulan lahir | `clients (branch_id, birth_month)` (generated column) | < 20 ms |
| Q8 | Detail client (kredit, sesi, invoice) | by id + relasi | PK + `schedules (client_id, session_date)` · `client_packages (client_id, status)` · `invoices (client_id, issued_at)` | < 30 ms |
| Q9 | Finance — antrean verifikasi | invoice `pending_verification` per cabang | `invoices (branch_id, status, issued_at)` | < 20 ms |
| Q10 | Finance — riwayat mutasi kredit | ledger semua client per cabang, terbaru, keyset | `credit_ledger (branch_id, created_at, id)` | < 30 ms |
| Q11 | Revenue dashboard | omzet `paid` per cabang per periode | view `v_daily_revenue` → `invoices idx_inv_paid_date (status, branch_id, paid_date, amount, deleted_at)` | < 50 ms |
| Q12 | Inquiry / Schedule / Branch dashboard | KPI per cabang per periode | view `v_daily_sessions`, `v_daily_pipeline`, `v_daily_credit_usage` (indeks diawali `branch_id, tanggal`) | < 50 ms |
| Q13 | Kode kuesioner publik | lookup kode | UNIQUE `assessment_access_codes (code)` | < 5 ms |
| Q14 | Login ortu | lookup kode akses client | UNIQUE `clients (client_access_code)` | < 5 ms |
| Q15 | Audit timeline 1 client / 1 sesi | log per entity / per induk, terbaru | `audit_logs (subject_type, subject_id, occurred_at)` · `audit_logs (entity_type, entity_id, occurred_at)` | < 30 ms |
| Q16 | Audit per user / per aksi | aktivitas staf X atau aksi Y per periode | `audit_logs (actor_id, occurred_at)` · `audit_logs (action, occurred_at)` | < 50 ms |
| Q17 | Therapist summary | sesi `completed` terapis X per periode + status laporan | `schedules (therapist_id, session_date, start_time)` + `session_reports (schedule_id)` | < 30 ms |
| Q18 | Awaiting questionnaire | kode `issued` belum submit per cabang | `assessment_access_codes (status, issued_at)` + join client | < 30 ms |

Target API (server, p95): detail < 100 ms · list < 200 ms · aksi transaksional < 150 ms · dashboard < 100 ms.

---

## 02. Peta modul & tabel

| Modul | Tabel | Fungsi singkat |
|---|---|---|
| **A. Organisasi & akses** | `branches` | Cabang klinik |
| | `roles` | Role sistem & kustom |
| | `access_modules` | Daftar modul RBAC |
| | `role_permissions` | Matriks role × modul |
| | `users` | Staf internal + terapis (satu tabel) |
| **B. Master data** | `services` | Layanan intake (BOT-A, FOT-A, Consultation, …) |
| | `sensory_quadrants` | Kuadran sensori (AV/SN/RG/SK) |
| | `cancel_reasons` | Pilihan cepat alasan cancel (tanpa FK; transaksi menyimpan string) |
| | `discharge_reasons` | Pilihan cepat alasan discharge (tanpa FK; transaksi menyimpan string) |
| | `master_packages` | Katalog paket kredit |
| **C. Client & intake** | `clients` | Master anak + kredensial portal ortu |
| | `client_services` | Layanan dipilih (multi) |
| | `client_documents` | Tautan GDrive / dokumen |
| | `client_status_histories` | Riwayat tahap pipeline |
| **D. Asesmen** | `assessment_categories` | Instrumen (Sensory Profile 2, …) |
| | `assessment_sections` | Bagian/domain soal |
| | `assessment_questions` | Bank soal (6 tipe) |
| | `assessment_access_codes` | Kode kuesioner publik |
| | `assessment_responses` | Pengisian kuesioner (per revisi) |
| | `assessment_answers` | Jawaban per soal |
| | `assessment_quadrant_scores` | Skor kuadran per pengisian |
| **E. Penjadwalan** | `schedule_series` | Pola jadwal berulang |
| | `schedules` | Sesi terapi/asesmen |
| | `session_reports` | Laporan sesi 3 bagian + SOAP |
| **F. Keuangan & kredit** | `invoices` | Tagihan |
| | `payment_proofs` | Bukti transfer (riwayat upload) |
| | `client_packages` | Paket kredit milik client |
| | `credit_ledger` | Mutasi kredit append-only |
| **G. Audit & analitik** | `audit_logs` | Log semua aksi (partisi bulanan) |
| | *view* `v_daily_revenue`, `v_daily_sessions`, `v_daily_pipeline`, `v_daily_credit_usage`, `v_therapist_sessions`, `v_invoice_queue` | Dashboard & list gabungan (bukan tabel, tidak menyimpan data) |
| **H. Laravel bawaan** | `personal_access_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `failed_jobs`, `job_batches` | Sanctum, session, cache & queue driver `database` (MySQL) |

Total: 29 tabel domain + 6 view + tabel bawaan Laravel.

---

## 03. ERD

```mermaid
erDiagram
  branches ||--o{ users : "staf"
  branches ||--o{ clients : "client"
  branches ||--o{ schedules : "sesi"
  branches ||--o{ invoices : "tagihan"
  roles ||--o{ users : ""
  roles ||--o{ role_permissions : ""
  access_modules ||--o{ role_permissions : ""
  users ||--o{ schedules : "terapis"

  clients ||--o{ client_services : ""
  services ||--o{ client_services : ""
  clients ||--o{ client_documents : ""
  clients ||--o{ client_status_histories : "pipeline"

  assessment_categories ||--o{ assessment_sections : ""
  assessment_sections ||--o{ assessment_questions : ""
  sensory_quadrants ||--o{ assessment_questions : ""
  clients ||--o{ assessment_access_codes : ""
  assessment_categories ||--o{ assessment_access_codes : ""
  assessment_access_codes ||--o{ assessment_responses : "revisi"
  assessment_responses ||--o{ assessment_answers : ""
  assessment_responses ||--o{ assessment_quadrant_scores : ""

  clients ||--o{ schedule_series : ""
  schedule_series ||--o{ schedules : ""
  clients ||--o{ schedules : ""
  client_packages ||--o{ schedules : "dipakai"
  schedules ||--o| session_reports : ""

  master_packages ||--o{ invoices : ""
  clients ||--o{ invoices : ""
  invoices ||--o{ payment_proofs : ""
  invoices ||--o| client_packages : "aktivasi"
  clients ||--o{ client_packages : ""
  client_packages ||--o{ credit_ledger : ""
  schedules ||--o{ credit_ledger : ""
  credit_ledger ||--o| credit_ledger : "reversal"
```
`audit_logs` sengaja tanpa FK (partisi + data historis tetap ada walau entity dihapus).

---

## 04. Spesifikasi tabel

Notasi indeks: `idx_<tabel>_<kolom>` dan komentar `// Qn` = query di bagian 01 yang dilayani.

### A. Organisasi & akses

#### `branches`
```php
Schema::create('branches', function (Blueprint $table) {
    $table->id();
    $table->string('code', 20)->unique();            // EAST, CTL, WEST
    $table->string('name', 100);                      // East, Citraland, West
    $table->string('city', 50)->default('Surabaya');
    $table->text('address')->nullable();
    $table->string('phone', 30)->nullable();
    $table->boolean('is_active')->default(true);
    $table->timestamps();
    $table->softDeletes();
});
```

#### `roles`
Role sistem (`master`, `manager`, `admin_inquiry`, `admin_schedule`, `finance`, `therapist`) + role kustom buatan Master. Orang tua **tidak** memakai tabel ini (auth via `clients`).
```php
Schema::create('roles', function (Blueprint $table) {
    $table->id();
    $table->string('code', 50)->unique();             // master, admin_inquiry, custom_xxx
    $table->string('name', 100);
    $table->string('badge', 100)->nullable();
    $table->text('description')->nullable();
    $table->boolean('is_system')->default(false);     // role sistem tidak bisa dihapus
    $table->timestamps();
    $table->softDeletes();
});
```

#### `access_modules`
```php
Schema::create('access_modules', function (Blueprint $table) {
    $table->string('code', 50)->primary();            // revenue, inquiry_pipeline, weekly_calendar, finance, rbac, …
    $table->string('label', 100);
    $table->string('category', 50);                   // Financial, Inquiry, Scheduling, Administration, Clinical
    $table->text('description')->nullable();
    $table->unsignedSmallInteger('sort_order')->default(0);
});
```

#### `role_permissions`
```php
Schema::create('role_permissions', function (Blueprint $table) {
    $table->foreignId('role_id')->constrained()->cascadeOnDelete();
    $table->string('module_code', 50);
    $table->boolean('allowed')->default(false);
    $table->timestamps();
    $table->primary(['role_id', 'module_code']);
    $table->foreign('module_code')->references('code')->on('access_modules')->cascadeOnUpdate()->cascadeOnDelete();
});
```
Dibaca setiap request (policy): satu query by PK `role_id` (±12 baris) — cukup **dimemo per request** di `PermissionService`. Opsional: cache driver `database` (`Cache::remember("rbac:role:{id}")`, tabel `cache` MySQL) dengan invalidasi saat matriks diubah. Tidak butuh Redis.

#### `users`
Staf internal & terapis dalam satu tabel. Atribut klinis nullable untuk non-terapis.
```php
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->foreignId('role_id')->constrained()->restrictOnDelete();
    $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete(); // null = semua cabang (master)
    $table->string('name', 150);
    $table->string('email', 150)->unique();
    $table->string('password');
    $table->string('phone', 30)->nullable();
    $table->string('title', 50)->nullable();          // S.Tr.Kes, S.Ft, A.Md.OT
    $table->string('specialty', 150)->nullable();
    $table->text('bio')->nullable();
    $table->boolean('is_active')->default(true);
    $table->timestamp('last_login_at')->nullable();
    $table->rememberToken();
    $table->timestamps();
    $table->softDeletes();

    $table->index(['branch_id', 'role_id', 'is_active'], 'idx_users_branch_role');   // daftar staf/terapis per cabang
});
```

### B. Master data

Tabel master kecil (puluhan baris) dan dibaca lewat PK → query langsung < 1 ms dari buffer pool InnoDB. Frontend memuatnya sekali per sesi (react-query `staleTime` panjang). Tidak perlu Redis.

#### `services`
```php
Schema::create('services', function (Blueprint $table) {
    $table->string('code', 50)->primary();            // b_ota, f_ota, school_companion, consult_wo_report, consult_w_report
    $table->string('label', 150);
    $table->string('short_label', 60);
    $table->string('category', 50);                   // string bebas (tanpa enum): combo box UI menawarkan Asesmen / Konsultasi / Terapi + opsi ketik kategori sendiri
    $table->text('description')->nullable();
    $table->boolean('is_active')->default(true);      // nonaktif = tidak bisa dipilih, label tetap tampil
    $table->unsignedSmallInteger('sort_order')->default(0);
    $table->timestamps();
});
```

#### `sensory_quadrants`
```php
Schema::create('sensory_quadrants', function (Blueprint $table) {
    $table->string('code', 10)->primary();            // AV, SN, RG, SK
    $table->string('title', 60);
    $table->string('full_name', 100);
    $table->text('description')->nullable();
    $table->string('color', 20)->default('slate');
    $table->unsignedSmallInteger('sort_order')->default(0);
    $table->timestamps();
});
```

#### `cancel_reasons` & `discharge_reasons` (pilihan cepat, TANPA foreign key)
Hanya **sumber pilihan cepat** untuk dropdown di UI (dikelola di menu Master Data). Tabel transaksi (`schedules`, `clients`, `credit_ledger`) menyimpan alasan sebagai **string biasa** (`cancel_reason`, `pending_reason`, `discharge_reason`): berisi `code` pilihan cepat **atau** teks bebas yang diketik user ("Lainnya"). Karena itu tidak ada FK: mengubah/menghapus pilihan tidak memengaruhi riwayat, dan teks bebas tidak perlu terdaftar. Label tampil = `label` bila string cocok dengan `code`, selain itu string apa adanya.
Kuota cancel (3/client) adalah aturan global di service (§6.2), bukan atribut per alasan. Alasan sistem `reschedule_dibatalkan` (drop reschedule menggantung, netral kredit) adalah konstanta kode, bukan baris tabel.
```php
Schema::create('cancel_reasons', function (Blueprint $table) {
    $table->string('code', 40)->primary();            // sakit, izin_keluarga, bentrok_sekolah, tanpa_kabar
    $table->string('label', 120);
    $table->boolean('is_active')->default(true);      // nonaktif = tidak muncul di pilihan baru
    $table->unsignedSmallInteger('sort_order')->default(0);
    $table->timestamps();
});

Schema::create('discharge_reasons', function (Blueprint $table) {
    $table->string('code', 40)->primary();            // moving, financial, conflict_schedule, expectation_not_met, graduate
    $table->string('label', 120);
    $table->boolean('is_active')->default(true);
    $table->unsignedSmallInteger('sort_order')->default(0);
    $table->timestamps();
});
```

#### `master_packages`
```php
Schema::create('master_packages', function (Blueprint $table) {
    $table->id();
    $table->string('code', 50)->unique();             // pkg-reguler, pkg-vip, pkg-consult
    $table->string('name', 150);
    $table->unsignedSmallInteger('credits');
    $table->unsignedBigInteger('price');              // rupiah
    $table->text('description')->nullable();
    $table->boolean('is_active')->default(true);
    $table->timestamps();
    $table->softDeletes();
});
```

### C. Client & intake

#### `clients`
Master anak, entity pipeline, **sekaligus entity login portal ortu** (`client_access_code`).
```php
Schema::create('clients', function (Blueprint $table) {
    $table->id();
    $table->string('client_code', 30)->unique();      // CLI-2026-0001 (nomor rekam medis internal)
    $table->foreignId('branch_id')->constrained()->restrictOnDelete();

    // Biodata
    $table->string('child_name', 120);                // nama lengkap (tanpa nama panggilan)
    $table->enum('gender', ['male', 'female']);
    $table->date('date_of_birth');
    $table->unsignedTinyInteger('birth_month')->storedAs('MONTH(date_of_birth)');   // Q7 birthday radar
    $table->string('parent_name', 120);
    $table->string('parent_phone', 30);               // WhatsApp
    $table->string('parent_email', 150)->nullable();
    $table->text('address')->nullable();
    $table->text('intake_note')->nullable();          // catatan saat intake (keluhan utama, rujukan, dll). Laporan asesmen memakai session_reports, bukan kolom ini

    // Pipeline & outcome
    $table->enum('status', [
        'inquiry', 'service_selected', 'assessment_scheduled', 'assessment_done',
        'admitted', 'done_consult', 'done_assessment', 'discontinued', 'discharged',
    ])->default('inquiry');
    $table->enum('final_outcome', ['admitted', 'done_consult', 'done_assessment', 'discontinued'])->nullable();
    $table->timestamp('status_changed_at')->nullable();
    $table->date('date_of_join')->nullable();
    $table->date('date_of_discharge')->nullable();
    $table->string('discharge_reason', 150)->nullable();   // string bebas: code pilihan cepat atau teks custom (tanpa FK)
    $table->text('discharge_note')->nullable();

    // Denormalisasi kredit (sumber kebenaran: credit_ledger) — diperbarui di transaksi yang sama
    $table->integer('credit_balance')->default(0);    // Σ remaining_credit paket aktif; 0 = Frozen
    $table->unsignedSmallInteger('cancel_count_total')->default(0);

    // Kredensial portal ortu
    $table->string('client_access_code', 20)->unique();   // TDC-XXXX — Q14
    $table->timestamp('last_login_at')->nullable();

    $table->unsignedInteger('version')->default(1);
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
    $table->softDeletes();

    $table->index(['branch_id', 'status', 'created_at'], 'idx_clients_pipeline');        // Q4
    $table->index(['branch_id', 'status', 'credit_balance'], 'idx_clients_roster');      // Q6
    $table->index(['branch_id', 'birth_month'], 'idx_clients_birthday');                 // Q7
    $table->index('child_name', 'idx_clients_child_name');                               // Q5 prefix search
    $table->index('parent_name', 'idx_clients_parent_name');                             // Q5
});
```
Catatan:
- **Frozen** tidak disimpan sebagai status; diturunkan dari `credit_balance = 0` (sesuai frontend).
- Search nama memakai prefix (`LIKE 'abc%'`). Jika butuh search di tengah kata, tambahkan `FULLTEXT(child_name, parent_name)` (ngram parser).
- Login ortu: `client_access_code` **+ tanggal lahir anak** (`date_of_birth`) sebagai verifikasi kedua (tanpa PIN). Respons gagal selalu generik (tidak membocorkan mana yang salah). Throttle per IP & per kode (Laravel RateLimiter) karena kode pendek.
- Nama anak hanya satu kolom `child_name` (nama lengkap). Layanan pendamping sekolah = layanan `school_companion` di `client_services`, bukan flag di `clients`.

#### `client_services`
```php
Schema::create('client_services', function (Blueprint $table) {
    $table->foreignId('client_id')->constrained()->cascadeOnDelete();
    $table->string('service_code', 50);
    $table->timestamp('selected_at')->useCurrent();
    $table->foreignId('selected_by')->nullable()->constrained('users')->nullOnDelete();
    $table->primary(['client_id', 'service_code']);
    $table->foreign('service_code')->references('code')->on('services');
    $table->index('service_code', 'idx_client_services_service');                         // funnel per layanan
});
```

#### `client_documents`
```php
Schema::create('client_documents', function (Blueprint $table) {
    $table->id();
    $table->foreignId('client_id')->constrained()->cascadeOnDelete();
    $table->enum('type', ['gdrive_folder', 'referral', 'observation_video', 'report', 'other'])->default('gdrive_folder');
    $table->string('label', 150)->nullable();
    $table->string('url', 500);
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
    $table->softDeletes();
    $table->index(['client_id', 'type'], 'idx_client_docs_client');
});
```

#### `client_status_histories`
Timeline bisnis pipeline (ditampilkan ke user). Detail teknis tetap di `audit_logs`.
```php
Schema::create('client_status_histories', function (Blueprint $table) {
    $table->id();
    $table->foreignId('client_id')->constrained()->cascadeOnDelete();
    $table->foreignId('branch_id')->constrained()->restrictOnDelete();          // denormalisasi dari clients (untuk view per cabang)
    $table->string('from_status', 30)->nullable();
    $table->string('to_status', 30);
    $table->enum('trigger', ['manual', 'service_selected', 'code_issued', 'assessment_scheduled', 'questionnaire_submitted', 'session_completed', 'outcome', 'discharge', 'revert']);
    $table->text('note')->nullable();
    $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();  // null = sistem / ortu
    $table->timestamp('changed_at')->useCurrent();
    $table->date('changed_date')->storedAs("DATE(changed_at + INTERVAL 7 HOUR)");  // tanggal WIB
    $table->index(['client_id', 'changed_at'], 'idx_csh_client');                        // timeline client
    $table->index(['branch_id', 'changed_date', 'to_status'], 'idx_csh_branch_date');    // v_daily_pipeline (funnel & tren)
});
```

### D. Mesin asesmen

#### `assessment_categories`
```php
Schema::create('assessment_categories', function (Blueprint $table) {
    $table->id();
    $table->string('code', 50)->unique();             // cat-001
    $table->string('name', 200);                      // Child Sensory Profile 2 (Winnie Dunn…)
    $table->string('standard_title', 150)->nullable();
    $table->string('author', 150)->nullable();
    $table->string('domain', 150)->nullable();
    $table->json('scoring_key')->nullable();          // {"0": "Tidak berlaku", … "5": "Hampir selalu"}
    $table->boolean('is_active')->default(true);
    $table->unsignedInteger('version')->default(1);
    $table->timestamps();
    $table->softDeletes();
});
```

#### `assessment_sections`
```php
Schema::create('assessment_sections', function (Blueprint $table) {
    $table->id();
    $table->foreignId('category_id')->constrained('assessment_categories')->cascadeOnDelete();
    $table->string('title', 150);                     // Pemrosesan AUDITORI
    $table->string('lead_text', 150)->nullable();     // "Anakku ..."
    $table->unsignedSmallInteger('sort_order')->default(0);
    $table->timestamps();
    $table->index(['category_id', 'sort_order'], 'idx_sections_category');
});
```

#### `assessment_questions`
```php
Schema::create('assessment_questions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('category_id')->constrained('assessment_categories')->cascadeOnDelete(); // denormalisasi untuk load 1 query
    $table->foreignId('section_id')->constrained('assessment_sections')->cascadeOnDelete();
    $table->unsignedSmallInteger('item_no');
    $table->string('quadrant_code', 10)->nullable();
    $table->enum('question_type', ['scale_0_5', 'range', 'multiple_choice', 'checkbox_multi', 'free_text', 'yes_no'])->default('scale_0_5');
    $table->text('question');
    $table->json('options')->nullable();              // pilihan untuk multiple_choice / checkbox_multi
    $table->smallInteger('range_min')->nullable();
    $table->smallInteger('range_max')->nullable();
    $table->string('range_min_label', 60)->nullable();
    $table->string('range_max_label', 60)->nullable();
    $table->boolean('is_required')->default(true);
    $table->unsignedSmallInteger('sort_order')->default(0);
    $table->timestamps();
    $table->softDeletes();

    $table->foreign('quadrant_code')->references('code')->on('sensory_quadrants');
    $table->index(['category_id', 'section_id', 'sort_order'], 'idx_questions_form');  // render form
});
```

#### `assessment_access_codes`
```php
Schema::create('assessment_access_codes', function (Blueprint $table) {
    $table->id();
    $table->string('code', 20)->unique();             // ASM-XXXX — Q13
    $table->foreignId('client_id')->constrained()->cascadeOnDelete();
    $table->foreignId('category_id')->constrained('assessment_categories')->restrictOnDelete();
    $table->enum('status', ['issued', 'submitted', 'expired'])->default('issued');   // kode `issued` yang belum diisi boleh DIHAPUS (baris dihapus, hanya jejak di audit_logs); `submitted` tidak bisa dihapus
    $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamp('issued_at')->useCurrent();
    $table->timestamp('expires_at')->nullable();
    $table->timestamp('last_submitted_at')->nullable();
    $table->timestamps();

    $table->index(['client_id', 'category_id'], 'idx_codes_client');
    $table->index(['status', 'issued_at'], 'idx_codes_awaiting');                         // Q18
    $table->index(['status', 'expires_at'], 'idx_codes_expiry');                         // job assessment-codes:expire
});
```

#### `assessment_responses`
Setiap submit = 1 baris (revisi). Submit ulang **tidak menimpa** — revisi lama tetap ada, yang terbaru `is_latest = 1`.
```php
Schema::create('assessment_responses', function (Blueprint $table) {
    $table->id();
    $table->foreignId('access_code_id')->constrained('assessment_access_codes')->cascadeOnDelete();
    $table->foreignId('client_id')->constrained()->cascadeOnDelete();
    $table->foreignId('category_id')->constrained('assessment_categories')->restrictOnDelete();
    $table->unsignedSmallInteger('revision')->default(1);
    $table->boolean('is_latest')->default(true);
    $table->string('respondent_name', 120)->nullable();
    $table->string('respondent_relation', 30)->nullable();
    $table->unsignedSmallInteger('answered_count');
    $table->timestamp('submitted_at')->useCurrent();
    $table->string('ip_address', 45)->nullable();
    $table->timestamps();

    $table->unique(['access_code_id', 'revision'], 'uq_responses_revision');
    $table->index(['client_id', 'category_id', 'is_latest'], 'idx_responses_latest');    // hasil terbaru per client
});
```

#### `assessment_answers`
```php
Schema::create('assessment_answers', function (Blueprint $table) {
    $table->id();
    $table->foreignId('response_id')->constrained('assessment_responses')->cascadeOnDelete();
    $table->foreignId('question_id')->constrained('assessment_questions')->restrictOnDelete();
    $table->unsignedSmallInteger('item_no');          // snapshot
    $table->string('quadrant_code', 10)->nullable();  // snapshot
    $table->text('answer_text');                      // "4 - Sering (75%)"
    $table->json('answer_values')->nullable();        // checkbox_multi
    $table->smallInteger('score')->nullable();
    $table->unique(['response_id', 'question_id'], 'uq_answers_question');
});
```

#### `assessment_quadrant_scores`
Dihitung **server** saat submit (Σ score per kuadran). Disimpan agar laporan & dashboard tidak menghitung ulang.
```php
Schema::create('assessment_quadrant_scores', function (Blueprint $table) {
    $table->foreignId('response_id')->constrained('assessment_responses')->cascadeOnDelete();
    $table->string('quadrant_code', 10);
    $table->unsignedSmallInteger('raw_score');
    $table->unsignedSmallInteger('item_count');
    $table->string('classification', 40)->nullable(); // mis. "Much More Than Others"
    $table->primary(['response_id', 'quadrant_code']);
    $table->foreign('quadrant_code')->references('code')->on('sensory_quadrants');
});
```

### E. Penjadwalan

#### `schedule_series`
Pola jadwal berulang (multi-hari, N minggu) agar operasi "ubah/batalkan seluruh seri" efisien.
```php
Schema::create('schedule_series', function (Blueprint $table) {
    $table->id();
    $table->foreignId('client_id')->constrained()->cascadeOnDelete();
    $table->foreignId('branch_id')->constrained()->restrictOnDelete();
    $table->json('pattern');                          // [{"day":1,"start":"09:00","end":"10:00","therapist_id":7,"client_package_id":3,"type":"therapy"}]
    $table->unsignedTinyInteger('weeks');             // default 12
    $table->date('starts_on');
    $table->date('ends_on');
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
    $table->index(['client_id', 'starts_on'], 'idx_series_client');
});
```

#### `schedules`
Tabel paling sering dibaca (kalender). Teks laporan dipisah ke `session_reports` agar baris tetap ramping.
```php
Schema::create('schedules', function (Blueprint $table) {
    $table->id();
    $table->foreignId('branch_id')->constrained()->restrictOnDelete();
    $table->foreignId('client_id')->constrained()->restrictOnDelete();
    $table->foreignId('therapist_id')->constrained('users')->restrictOnDelete();
    $table->foreignId('series_id')->nullable()->constrained('schedule_series')->nullOnDelete();
    $table->foreignId('client_package_id')->nullable()->constrained()->nullOnDelete();   // null untuk asesmen
    $table->string('service_code', 50)->nullable();
    $table->enum('type', ['therapy', 'assessment', 'consultation'])->default('therapy');

    $table->date('session_date');
    $table->time('start_time');
    $table->time('end_time');

    $table->enum('status', ['scheduled', 'completed', 'cancelled', 'rescheduled', 'reschedule_pending'])->default('scheduled');
    $table->string('previous_status', 30)->nullable();   // status sebelum transisi terakhir — dipakai revert
    $table->enum('credit_effect', ['none', 'used', 'excused', 'penalty'])->default('none'); // efek kredit transisi terakhir

    // Cancel
    $table->string('cancel_reason', 150)->nullable();    // string bebas: code pilihan cepat atau teks custom (tanpa FK)
    $table->text('cancel_note')->nullable();
    $table->timestamp('cancelled_at')->nullable();
    $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();

    // Complete
    $table->timestamp('completed_at')->nullable();
    $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();

    // Reschedule (jejak slot asal pertama) & reschedule menggantung
    $table->date('origin_date')->nullable();
    $table->time('origin_start_time')->nullable();
    $table->time('origin_end_time')->nullable();
    $table->foreignId('origin_therapist_id')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamp('rescheduled_at')->nullable();
    $table->string('pending_reason', 150)->nullable();   // string bebas, sama seperti cancel_reason
    $table->text('pending_note')->nullable();
    $table->timestamp('pending_at')->nullable();

    $table->unsignedInteger('version')->default(1);
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
    $table->softDeletes();

    $table->foreign('service_code')->references('code')->on('services');

    $table->index(['branch_id', 'session_date', 'status', 'deleted_at'], 'idx_sch_calendar'); // Q1 + v_daily_sessions (covering)
    $table->index(['therapist_id', 'session_date', 'start_time'], 'idx_sch_therapist');   // Q2, Q3, Q17
    $table->index(['client_id', 'session_date'], 'idx_sch_client');                       // Q8, portal ortu
    $table->index(['status', 'session_date'], 'idx_sch_status');                          // auto-complete job, rekap
    $table->index('series_id', 'idx_sch_series');
});
```
Catatan:
- `rescheduled` = sudah pindah slot (slot baru di `session_date/start_time`, asal di `origin_*`).
- `reschedule_pending` diabaikan oleh conflict check (sama dengan frontend).
- **Frozen** tidak disimpan; diturunkan dari `clients.credit_balance = 0` saat render.

#### `session_reports`
Laporan sesi 3 bagian (prototype) + kolom SOAP terstruktur opsional.
```php
Schema::create('session_reports', function (Blueprint $table) {
    $table->id();
    $table->foreignId('schedule_id')->unique()->constrained()->cascadeOnDelete();
    $table->foreignId('client_id')->constrained()->cascadeOnDelete();         // denormalisasi: riwayat laporan per client
    $table->foreignId('therapist_id')->constrained('users')->restrictOnDelete();
    $table->text('activity_section')->nullable();     // Aktivitas sesi
    $table->text('note_section')->nullable();         // Catatan klinis (ringkas, prototype)
    $table->text('homework_section')->nullable();     // PR / home program
    $table->text('subjective_note')->nullable();      // SOAP opsional
    $table->text('objective_note')->nullable();
    $table->text('assessment_note')->nullable();
    $table->text('plan_note')->nullable();
    $table->unsignedTinyInteger('filled_sections')->storedAs(
        "(activity_section IS NOT NULL AND activity_section <> '') + (note_section IS NOT NULL AND note_section <> '') + (homework_section IS NOT NULL AND homework_section <> '')"
    );                                                // 0..3 → filter "laporan lengkap 3/3" (TherapistSummary)
    $table->unsignedInteger('version')->default(1);
    $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();

    $table->index(['client_id', 'created_at'], 'idx_reports_client');
    $table->index(['therapist_id', 'filled_sections'], 'idx_reports_therapist');
});
```

### F. Keuangan & kredit

#### `invoices`
```php
Schema::create('invoices', function (Blueprint $table) {
    $table->id();
    $table->string('invoice_number', 30)->unique();   // INV-2026-0001 (sequence per tahun, dibuat server)
    $table->foreignId('client_id')->constrained()->restrictOnDelete();
    $table->foreignId('branch_id')->constrained()->restrictOnDelete();
    $table->foreignId('master_package_id')->nullable()->constrained()->nullOnDelete();
    $table->enum('invoice_type', ['package_purchase', 'package_renewal', 'assessment_fee', 'consultation_fee', 'single_session'])->default('package_purchase');

    // Snapshot saat tagihan diterbitkan
    $table->string('package_name', 150);
    $table->unsignedSmallInteger('credits')->default(0);
    $table->unsignedBigInteger('amount');             // rupiah

    $table->enum('status', ['unpaid', 'pending_verification', 'paid', 'rejected', 'void'])->default('unpaid');
    $table->timestamp('issued_at')->useCurrent();
    $table->date('due_date')->nullable();
    $table->timestamp('paid_at')->nullable();
    $table->date('paid_date')->nullable()->storedAs("DATE(paid_at + INTERVAL 7 HOUR)");  // tanggal WIB untuk v_daily_revenue
    $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamp('verified_at')->nullable();
    $table->text('rejection_reason')->nullable();
    $table->string('payment_method', 40)->default('bank_transfer');

    $table->unsignedInteger('version')->default(1);
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
    $table->softDeletes();

    $table->index(['branch_id', 'status', 'issued_at'], 'idx_inv_queue');                // Q9
    $table->index(['client_id', 'issued_at'], 'idx_inv_client');                         // Q8, portal ortu
    $table->index(['status', 'branch_id', 'paid_date', 'amount', 'deleted_at'], 'idx_inv_paid_date'); // Q11 v_daily_revenue (covering)
    $table->index(['status', 'due_date'], 'idx_inv_due');                                // job invoices:flag-overdue
});
```
Status: `unpaid` → (ortu upload) `pending_verification` → Finance `paid` / `rejected` (ortu bisa upload ulang → `pending_verification`). `void` = dibatalkan Finance (wajib alasan, tercatat audit).

#### `payment_proofs`
Riwayat setiap upload bukti (bukan hanya yang terakhir).
```php
Schema::create('payment_proofs', function (Blueprint $table) {
    $table->id();
    $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
    $table->string('file_path', 500);                 // storage privat (bukan public URL)
    $table->string('file_name', 200);
    $table->string('mime_type', 80);
    $table->unsignedInteger('file_size');
    $table->enum('uploaded_by_type', ['client', 'user']);
    $table->unsignedBigInteger('uploaded_by_id');
    $table->timestamp('uploaded_at')->useCurrent();
    $table->enum('review_status', ['pending', 'accepted', 'rejected'])->default('pending');
    $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamp('reviewed_at')->nullable();
    $table->text('review_note')->nullable();
    $table->index(['invoice_id', 'uploaded_at'], 'idx_proofs_invoice');
});
```

#### `client_packages`
Paket kredit milik client. Satu client bisa punya banyak paket; saldo total = Σ `remaining_credit` paket aktif.
```php
Schema::create('client_packages', function (Blueprint $table) {
    $table->id();
    $table->foreignId('client_id')->constrained()->restrictOnDelete();
    $table->foreignId('invoice_id')->nullable()->unique()->constrained()->nullOnDelete(); // 1 invoice paid → 1 paket
    $table->foreignId('master_package_id')->nullable()->constrained()->nullOnDelete();
    $table->string('package_name', 150);              // snapshot
    $table->unsignedSmallInteger('total_credit');
    $table->smallInteger('remaining_credit');         // denormalisasi dari ledger; CHECK >= 0
    $table->unsignedSmallInteger('cancel_count')->default(0);
    $table->enum('status', ['active', 'depleted', 'expired'])->default('active');
    $table->timestamp('activated_at')->useCurrent();
    $table->date('expires_at')->nullable();
    $table->unsignedInteger('version')->default(1);
    $table->timestamps();

    $table->index(['client_id', 'status', 'activated_at'], 'idx_pkg_client');            // pilih paket aktif tertua (FIFO)
    $table->index(['status', 'expires_at'], 'idx_pkg_expiry');                           // job packages:expire
});
// MySQL 8.0.16+: CHECK constraint
DB::statement('ALTER TABLE client_packages ADD CONSTRAINT chk_pkg_remaining CHECK (remaining_credit >= 0 AND remaining_credit <= total_credit)');
```

#### `credit_ledger`
Mutasi kredit **append-only**. Tidak ada UPDATE/DELETE; koreksi = baris `reversal`.
```php
Schema::create('credit_ledger', function (Blueprint $table) {
    $table->id();
    $table->foreignId('client_id')->constrained()->restrictOnDelete();
    $table->foreignId('branch_id')->constrained()->restrictOnDelete();          // denormalisasi untuk Q10
    $table->foreignId('client_package_id')->nullable()->constrained()->restrictOnDelete();
    $table->foreignId('schedule_id')->nullable()->constrained()->nullOnDelete();
    $table->foreignId('invoice_id')->nullable()->constrained()->nullOnDelete();
    $table->enum('action', ['purchased', 'renewed', 'used', 'cancel_excused', 'cancel_penalty', 'reversal', 'manual_adjust', 'expired']);
    $table->smallInteger('credit_change');            // +N / -1 / 0
    $table->smallInteger('package_balance_after');    // saldo paket setelah mutasi (audit cepat)
    $table->integer('client_balance_after');          // saldo total client setelah mutasi
    $table->unsignedSmallInteger('cancel_count_after')->nullable();
    $table->string('cancel_reason', 150)->nullable();   // string bebas (tanpa FK)
    $table->string('package_name', 150)->nullable();  // snapshot
    $table->text('note')->nullable();
    $table->foreignId('reverses_ledger_id')->nullable()->unique()->constrained('credit_ledger')->restrictOnDelete(); // 1 baris hanya bisa di-reverse sekali
    $table->string('idempotency_key', 100)->nullable()->unique();   // used:schedule:{id}:v{version}
    $table->char('batch_id', 26)->nullable();         // ULID — sama dengan audit_logs.batch_id
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamp('created_at', 3)->useCurrent();

    $table->index(['client_id', 'created_at'], 'idx_ledger_client');                     // riwayat per client
    $table->index(['branch_id', 'created_at', 'id'], 'idx_ledger_branch');               // Q10 keyset
    $table->index(['schedule_id', 'action'], 'idx_ledger_schedule');                     // revert sesi
    $table->date('entry_date')->storedAs("DATE(created_at + INTERVAL 7 HOUR)");  // tanggal WIB
    $table->index(['branch_id', 'entry_date', 'action'], 'idx_ledger_branch_date');      // v_daily_credit_usage
});
```

### G. Audit & analitik

#### `audit_logs`
Dijelaskan lengkap di bagian 05.

#### View dashboard (tanpa tabel ringkasan)
Dashboard membaca **VIEW MySQL** di atas tabel transaksi. View tidak menyimpan data (bukan materialized) — kecepatannya sama dengan query di dalamnya, jadi setiap view dirancang agar:
1. Kolom yang di-`GROUP BY` / difilter **terindeks** dan **sargable** (tanpa fungsi di kolom saat WHERE).
2. Tanggal bisnis memakai **generated column tanggal WIB** (`… + INTERVAL 7 HOUR`, WIB tanpa DST) agar transaksi jam 00:00–06:59 WIB tidak tercatat di tanggal UTC kemarin.
3. Query ke view **selalu** memakai filter cabang + rentang tanggal. MySQL ≥ 8.0.22 mendorong filter itu ke dalam view ber-`GROUP BY` (*derived condition pushdown*), sehingga hanya rentang indeks yang dibaca.

Generated column & indeks pendukung (ringkasan — sudah tercantum di spesifikasi tabel masing-masing):
```php
// invoices
$table->date('paid_date')->nullable()->storedAs("DATE(paid_at + INTERVAL 7 HOUR)");
$table->index(['status', 'branch_id', 'paid_date', 'amount', 'deleted_at'], 'idx_inv_paid_date'); // v_daily_revenue (covering)
// client_status_histories (branch_id ikut disimpan saat insert — denormalisasi dari clients)
$table->date('changed_date')->storedAs("DATE(changed_at + INTERVAL 7 HOUR)");
$table->index(['branch_id', 'changed_date', 'to_status'], 'idx_csh_branch_date');       // v_daily_pipeline (covering)
// credit_ledger
$table->date('entry_date')->storedAs("DATE(created_at + INTERVAL 7 HOUR)");
$table->index(['branch_id', 'entry_date', 'action'], 'idx_ledger_branch_date');         // v_daily_credit_usage
// schedules: session_date sudah DATE lokal → cukup idx_sch_calendar (branch_id, session_date, status, deleted_at), covering untuk v_daily_sessions
```

```sql
-- Q11 Revenue dashboard: omzet harian per cabang
CREATE OR REPLACE VIEW v_daily_revenue AS
SELECT branch_id, paid_date, COUNT(*) AS invoices_paid, SUM(amount) AS revenue
FROM invoices
WHERE status = 'paid' AND deleted_at IS NULL
GROUP BY branch_id, paid_date;

-- Q12 Schedule dashboard: status sesi harian per cabang
CREATE OR REPLACE VIEW v_daily_sessions AS
SELECT branch_id, session_date,
       COUNT(*)                                   AS sessions_total,
       SUM(status = 'completed')                  AS sessions_completed,
       SUM(status = 'cancelled')                  AS sessions_cancelled,
       SUM(status = 'reschedule_pending')         AS sessions_pending,
       SUM(status IN ('scheduled','rescheduled')) AS sessions_upcoming
FROM schedules
WHERE deleted_at IS NULL
GROUP BY branch_id, session_date;

-- Q12 Inquiry dashboard & Branch performance: funnel pipeline harian per cabang
CREATE OR REPLACE VIEW v_daily_pipeline AS
SELECT branch_id, changed_date, to_status, COUNT(*) AS transitions
FROM client_status_histories
GROUP BY branch_id, changed_date, to_status;

-- Finance / revenue: pemakaian & penambahan kredit harian per cabang
CREATE OR REPLACE VIEW v_daily_credit_usage AS
SELECT branch_id, entry_date, action, COUNT(*) AS entries, SUM(credit_change) AS credit_change
FROM credit_ledger
GROUP BY branch_id, entry_date, action;

-- Q17 Therapist summary: JOIN tanpa agregasi (algoritma MERGE → filter langsung memakai idx_sch_therapist)
CREATE OR REPLACE VIEW v_therapist_sessions AS
SELECT s.id AS schedule_id, s.branch_id, s.therapist_id, s.client_id, c.child_name,
       s.session_date, s.start_time, s.end_time, s.type, s.status,
       COALESCE(r.filled_sections, 0) AS filled_sections, r.updated_at AS report_updated_at
FROM schedules s
JOIN clients c ON c.id = s.client_id
LEFT JOIN session_reports r ON r.schedule_id = s.id
WHERE s.deleted_at IS NULL;

-- Q9 Antrean verifikasi Finance: JOIN invoice + bukti terakhir + client (MERGE)
CREATE OR REPLACE VIEW v_invoice_queue AS
SELECT i.id AS invoice_id, i.branch_id, i.invoice_number, i.status, i.amount, i.issued_at,
       c.id AS client_id, c.child_name, c.parent_name,
       p.id AS last_proof_id, p.uploaded_at AS last_proof_at, p.review_status
FROM invoices i
JOIN clients c ON c.id = i.client_id
LEFT JOIN payment_proofs p ON p.id = (
  SELECT p2.id FROM payment_proofs p2 WHERE p2.invoice_id = i.id ORDER BY p2.uploaded_at DESC LIMIT 1
)
WHERE i.deleted_at IS NULL;
```

Contoh pemakaian (dari Laravel: `DB::table('v_daily_revenue')->where(...)`):
```sql
SELECT paid_date, revenue FROM v_daily_revenue
WHERE branch_id = 1 AND paid_date BETWEEN '2026-01-01' AND '2026-12-31';
```

**Perkiraan beban:** 3 cabang × ±60 sesi/hari ≈ 65 ribu sesi/tahun. Dashboard 12 bulan satu cabang membaca ±22 ribu entri indeks (covering, tanpa akses baris) → orde puluhan milidetik. Masih jauh di bawah target selama filter cabang + tanggal selalu ada.

**Kapan pindah ke tabel ringkasan?** Hanya jika `EXPLAIN ANALYZE` view dashboard konsisten > 100 ms (mis. data > 5 tahun / cabang bertambah banyak). Saat itu buat `daily_branch_metrics` (PK `branch_id, metric_date`) yang diisi job malam `metrics:rebuild` (lihat §11) — struktur view di atas bisa langsung dipakai sebagai query pengisinya, jadi API dashboard tidak berubah.

---

## 05. Audit log

### 5.1 Tujuan
Mencatat **setiap aksi yang mengubah data** (dan aksi baca sensitif tertentu) sehingga bisa dijawab: *siapa, melakukan apa, terhadap data apa, kapan, dari mana, nilai sebelum & sesudahnya, alasannya, dan apakah aksi itu kemudian dibatalkan*.

Contoh yang harus terlacak: Admin Schedule menandai sesi **completed** (kredit terpotong), lalu **membatalkan completed** itu (kredit kembali). Kedua aksi tercatat, saling terhubung, dan log pertama tidak berubah.

### 5.2 Skema
```php
// Tabel dipartisi bulanan → tanpa FK, PK komposit memuat kolom partisi.
Schema::create('audit_logs', function (Blueprint $table) {
    $table->unsignedBigInteger('id', true);          // auto increment
    $table->dateTime('occurred_at', 6);
    $table->char('batch_id', 26)->nullable();        // ULID: semua log dari 1 aksi user (mis. complete → sesi + ledger + client)
    $table->char('request_id', 26)->nullable();      // korelasi dengan log aplikasi

    // Pelaku (snapshot — tetap terbaca walau user dihapus/diganti nama)
    $table->enum('actor_type', ['user', 'client', 'system', 'public']);
    $table->unsignedBigInteger('actor_id')->nullable();
    $table->string('actor_name', 150)->nullable();
    $table->string('actor_role', 50)->nullable();
    $table->unsignedBigInteger('branch_id')->nullable();  // cakupan cabang data yang diubah

    // Aksi & objek
    $table->string('action', 64);                    // <entity>.<verb>, lihat katalog 5.4
    $table->string('entity_type', 40);               // schedule, client, invoice, credit_ledger, …
    $table->unsignedBigInteger('entity_id')->nullable();
    $table->string('entity_label', 200)->nullable(); // snapshot: "Sesi Kenzo 2026-10-02 09:00"
    $table->string('subject_type', 40)->nullable();  // induk untuk timeline (biasanya client)
    $table->unsignedBigInteger('subject_id')->nullable();

    // Perubahan
    $table->json('old_values')->nullable();          // hanya field yang berubah
    $table->json('new_values')->nullable();
    $table->json('meta')->nullable();                // efek turunan: {credit_change:-1, ledger_id:…, bulk_count:12}
    $table->text('reason')->nullable();              // wajib untuk cancel, revert, void, discharge, manual_adjust
    $table->unsignedBigInteger('reverts_audit_id')->nullable(); // log asal yang dibatalkan oleh aksi ini

    // Konteks teknis
    $table->enum('source', ['web', 'api', 'public_form', 'system', 'import'])->default('web');
    $table->string('ip_address', 45)->nullable();
    $table->string('user_agent', 255)->nullable();

    $table->primary(['id', 'occurred_at']);
    $table->index(['entity_type', 'entity_id', 'occurred_at'], 'idx_audit_entity');      // Q15
    $table->index(['subject_type', 'subject_id', 'occurred_at'], 'idx_audit_subject');   // Q15 timeline client
    $table->index(['actor_id', 'occurred_at'], 'idx_audit_actor');                       // Q16
    $table->index(['action', 'occurred_at'], 'idx_audit_action');                        // Q16
    $table->index(['branch_id', 'occurred_at'], 'idx_audit_branch');
    $table->index('batch_id', 'idx_audit_batch');
    $table->index('reverts_audit_id', 'idx_audit_reverts');
});

// Partisi bulanan (dibuat via migration raw SQL; job bulanan menambah partisi berikutnya)
DB::statement("
  ALTER TABLE audit_logs PARTITION BY RANGE (TO_DAYS(occurred_at)) (
    PARTITION p2026_10 VALUES LESS THAN (TO_DAYS('2026-11-01')),
    PARTITION p2026_11 VALUES LESS THAN (TO_DAYS('2026-12-01')),
    PARTITION pmax     VALUES LESS THAN MAXVALUE
  )
");
```

### 5.3 Aturan penulisan
1. **Satu transaksi**: log ditulis di transaksi DB yang sama dengan perubahan data. Jika bisnis gagal/rollback, log ikut batal; tidak ada log "palsu" dan tidak ada perubahan tanpa log.
2. **Append-only**: user DB aplikasi hanya punya `INSERT, SELECT` pada `audit_logs`. Tambahan proteksi:
   ```sql
   CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs FOR EACH ROW
     SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs bersifat append-only';
   CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs FOR EACH ROW
     SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs bersifat append-only';
   ```
   Penghapusan data lama hanya lewat `DROP/EXCHANGE PARTITION` oleh DBA (arsip), bukan DELETE.
3. **Hanya field yang berubah** di `old_values`/`new_values` (hemat storage, mudah dibaca). Field sensitif (password, PIN, token) **tidak pernah** dicatat; diganti `"[redacted]"`.
4. **Snapshot pelaku & label** supaya log tetap bermakna walau data master berubah.
5. **Undo = log baru**: aksi pembatalan menulis `action = <entity>.<verb>_reverted` (atau aksi kebalikannya) dengan `reverts_audit_id` = id log asal dan `reason` wajib.
6. **Bulk**: satu log per entity yang berubah, semuanya berbagi `batch_id`, plus satu log ringkasan `schedule.bulk_completed` dengan `meta.count`.
7. **Aksi baca sensitif** yang dicatat: lihat bukti bayar, export/print laporan klinis, login/logout & login gagal.

### 5.4 Katalog kode aksi

| Entity | Aksi |
|---|---|
| auth | `auth.login`, `auth.logout`, `auth.login_failed`, `auth.client_login`, `auth.client_login_failed` |
| client | `client.created`, `client.updated`, `client.status_changed`, `client.services_updated`, `client.admitted`, `client.done_consult`, `client.done_assessment`, `client.discontinued`, `client.discharged`, `client.outcome_reverted`, `client.document_added`, `client.document_removed`, `client.deleted`, `client.restored` |
| assessment | `assessment_code.issued`, `assessment_code.deleted`, `assessment_response.submitted` (actor `public`), `assessment_response.viewed`, `assessment_category.created/updated/deleted`, `assessment_question.created/updated/deleted` |
| schedule | `schedule.created`, `schedule.series_created`, `schedule.updated`, `schedule.completed`, `schedule.completion_reverted`, `schedule.cancelled`, `schedule.cancellation_reverted`, `schedule.rescheduled`, `schedule.reschedule_reverted`, `schedule.marked_pending`, `schedule.pending_dropped`, `schedule.report_saved`, `schedule.bulk_completed`, `schedule.bulk_cancelled`, `schedule.bulk_rescheduled`, `schedule.bulk_reverted`, `schedule.deleted` |
| credit | `credit.package_activated`, `credit.used`, `credit.cancel_excused`, `credit.cancel_penalty`, `credit.reversed`, `credit.manual_adjusted`, `credit.expired` (job), `credit.reconciled` (job) |
| invoice | `invoice.issued`, `invoice.proof_uploaded` (actor `client`), `invoice.proof_viewed`, `invoice.verified`, `invoice.rejected`, `invoice.voided`, `invoice.renewal_created` |
| master | `service.*`, `quadrant.*`, `package.*`, `cancel_reason.*`, `discharge_reason.*` (`created/updated/deleted`) |
| access | `user.created`, `user.updated`, `user.deactivated`, `user.deleted`, `role.created`, `role.updated`, `role.deleted`, `role.permission_changed` |
| report | `report.printed`, `report.exported` |
| system (job, `actor_type = system`) | `assessment_code.expired`, `system.job_completed`, `system.job_failed` (ringkasan tiap run: jumlah baris diproses, durasi) — lihat §11 |

### 5.5 Skenario: completed lalu dibatalkan

**Langkah 1** — Admin Fajar (id 5) menandai sesi #9012 (Kenzo, client #9) completed. Satu transaksi, `batch_id = 01J…A`.

| tabel | isi |
|---|---|
| `schedules` #9012 | `status: scheduled → completed`, `previous_status = scheduled`, `credit_effect = used`, `completed_by = 5`, `version 3 → 4` |
| `client_packages` #31 | `remaining_credit 6 → 5` |
| `clients` #9 | `credit_balance 6 → 5` |
| `credit_ledger` #7001 | `action=used, credit_change=-1, schedule_id=9012, idempotency_key=used:schedule:9012:v3` |
| `audit_logs` #500 | `action=schedule.completed, entity=schedule#9012, subject=client#9, old={"status":"scheduled"}, new={"status":"completed"}, meta={"credit_change":-1,"ledger_id":7001}` |
| `audit_logs` #501 | `action=credit.used, entity=credit_ledger#7001, subject=client#9, new={"package_balance":5}` |

**Langkah 2** — Fajar sadar salah sesi dan membatalkan completed dengan alasan "Salah klik, sesi belum berlangsung". Transaksi baru, `batch_id = 01J…B`.

| tabel | isi |
|---|---|
| `schedules` #9012 | `status: completed → scheduled` (dari `previous_status`), `credit_effect = none`, `completed_at/by = null`, `version 4 → 5` |
| `client_packages` #31 | `remaining_credit 5 → 6` |
| `clients` #9 | `credit_balance 5 → 6` |
| `credit_ledger` #7002 | `action=reversal, credit_change=+1, reverses_ledger_id=7001` (#7001 tetap ada) |
| `audit_logs` #502 | `action=schedule.completion_reverted, reverts_audit_id=500, reason="Salah klik…", old={"status":"completed"}, new={"status":"scheduled"}, meta={"credit_change":1,"ledger_id":7002}` |
| `audit_logs` #503 | `action=credit.reversed, entity=credit_ledger#7002, reverts_audit_id=501` |

Jika sesi itu kemudian di-complete lagi, `idempotency_key = used:schedule:9012:v5` (versi berbeda) sehingga pemotongan baru sah dan tidak bentrok dengan #7001.

### 5.6 Query contoh
```sql
-- Timeline lengkap satu client (semua aksi pada client, sesi, invoice, kredit miliknya)
SELECT occurred_at, actor_name, action, entity_type, entity_id, old_values, new_values, reason
FROM audit_logs
WHERE subject_type = 'client' AND subject_id = 9
ORDER BY occurred_at DESC, id DESC
LIMIT 50;

-- Semua aksi yang pernah dibatalkan beserta pembatalannya
SELECT a.occurred_at AS done_at, a.actor_name AS done_by, a.action,
       r.occurred_at AS reverted_at, r.actor_name AS reverted_by, r.reason
FROM audit_logs r
JOIN audit_logs a ON a.id = r.reverts_audit_id
WHERE r.reverts_audit_id IS NOT NULL
  AND r.occurred_at >= '2026-10-01';

-- Aktivitas satu staf hari ini (keyset: tambahkan AND (occurred_at, id) < (:last_at, :last_id))
SELECT * FROM audit_logs
WHERE actor_id = 5 AND occurred_at >= CURDATE()
ORDER BY occurred_at DESC, id DESC LIMIT 50;
```

### 5.7 Retensi & volume
- Estimasi: ±3 cabang × ±400 aksi/hari ≈ 1.200 baris/hari ≈ 450 ribu/tahun (±0,5 KB/baris → ±250 MB/tahun). Partisi bulanan menjaga indeks kecil.
- Retensi online: **24 bulan**; partisi lebih lama di-`EXCHANGE` ke tabel arsip / di-export ke object storage (rekam medis & keuangan: simpan arsip ≥ 5 tahun sesuai kebijakan klinik).
- Job bulanan `audit:partitions` menambah partisi bulan depan (`REORGANIZE PARTITION pmax`) dan mengarsip partisi > 24 bulan — lihat §11.

---

## 06. Alur transaksi kritis

Semua alur: `DB::transaction()`, kunci baris dengan `lockForUpdate()`, cek `version` (optimistic lock), tulis audit di transaksi yang sama. Respons error: 409 (versi berubah / bentrok jadwal), 422 (validasi).

### 6.1 Complete sesi (`POST /schedules/{id}/complete`)
1. Lock `schedules` (id) → cek `version` & status ∈ {scheduled, rescheduled}.
2. Jika `type = therapy`: lock `client_packages` aktif client (`ORDER BY activated_at` — FIFO; prioritas `client_package_id` sesi) → `remaining_credit -= 1` (CHECK ≥ 0), status `depleted` bila 0.
3. Insert `credit_ledger` (`used`, idempotency key) → update `clients.credit_balance`.
4. Update sesi: `status=completed`, `previous_status`, `credit_effect=used`, `completed_*`, `version+1`; upsert `session_reports`.
5. Jika `type = assessment` dan status client sebelum `assessment_done` → update `clients.status`, insert `client_status_histories` (`trigger=session_completed`).
6. Audit: `schedule.completed`, `credit.used`, (`client.status_changed`). Dashboard otomatis ikut berubah karena membaca view (tidak ada ringkasan yang perlu di-update).

### 6.2 Cancel sesi (`POST /schedules/{id}/cancel`)
1. Lock sesi + client. Alasan = string dari request (code pilihan cepat atau teks custom; wajib terisi, maks 150 karakter; tidak divalidasi ke tabel `cancel_reasons`).
2. `clients.cancel_count_total += 1` (setiap cancel manual dihitung kuota).
3. Penalti bila `cancel_count_total > 3` (kuota global): potong 1 kredit seperti 6.1 → ledger `cancel_penalty`, `credit_effect=penalty`. Selain itu ledger `cancel_excused` (0), `credit_effect=excused`.
4. Update sesi `cancelled` + alasan; audit `schedule.cancelled` (+ `credit.cancel_penalty`).

### 6.3 Revert (`POST /schedules/{id}/revert`, wajib `reason`)
| Dari | Ke | Efek |
|---|---|---|
| `completed` | `previous_status` | Bila `credit_effect=used`: ledger `reversal` (+1) untuk ledger `used` sesi ini; kembalikan status client bila transisi otomatis terjadi di batch yang sama |
| `cancelled` | `previous_status` | Bila `credit_effect=penalty`: reversal (+1). Bila kuota terhitung: `cancel_count_total -= 1` |
| `rescheduled` | `scheduled` di slot `origin_*` (tanggal, jam, terapis asal) | Cek bentrok slot asal dulu (409 bila terisi); `origin_*` dan `rescheduled_at` dikosongkan; tanpa efek kredit. Audit `schedule.reschedule_reverted` |
Audit `*_reverted` dengan `reverts_audit_id`. Hak akses revert: `master`, `admin_schedule` (policy), opsional batas waktu (mis. ≤ 7 hari) via konfigurasi.

Aturan tambahan (sudah diterapkan di frontend demo, `useSessionActions.revertSession`):
- **Alasan wajib** (maks 300 karakter). Sesi yang kembali aktif (`scheduled`/`rescheduled`) harus lolos cek bentrok §6.4 (409 bila slot sudah terisi).
- **Ledger append-only**: baris `used` / `cancel_*` lama tidak diubah. Revert = baris `reversal` baru dengan `reverses_ledger_id` → baris asal (UNIQUE, jadi satu baris hanya bisa dibalik sekali). `cancel_excused` direverse dengan `credit_change = 0` (hanya kuota −1).
- **Complete lagi setelah revert** sah dan membuat baris `used` **baru** (id berbeda, `idempotency_key` memakai `version` baru). Revert berikutnya menunjuk baris `used` yang terbaru yang belum dibalik, bukan yang lama.
- **Asesmen completed**: bila di aksi asal status client naik otomatis ke `assessment_done`, revert mengembalikannya ke status sebelumnya (hanya jika status client masih `assessment_done`) + `client_status_histories` `trigger = revert`.
- Revert `completed` memakai `previous_status` sesi; data lama tanpa `previous_status` dianggap `scheduled` (atau `rescheduled` bila ada jejak `origin_*`).

### 6.4 Buat / pindah sesi (conflict check)
1. `SELECT … FROM schedules WHERE therapist_id=? AND session_date=? AND status NOT IN ('cancelled','reschedule_pending') FOR UPDATE` (indeks `idx_sch_therapist`).
2. Cek overlap jam dengan sesi aktif terapis itu (tidak ada konsep jam kerja; bentrok = terapis sudah handle client lain di jam yang sama). Bentrok → 409 dengan daftar sesi bentrok (kecuali `force=true` oleh role yang diizinkan; dicatat di audit `meta.forced=true`).
3. Insert/update. Seri berulang: insert batch dalam satu transaksi (`schedule_series` + N `schedules`).
4. Saat **membuat** sesi `type = assessment` dan `clients.status` masih sebelum `assessment_scheduled` (`inquiry` / `service_selected`): update `clients.status = assessment_scheduled` + insert `client_status_histories` (`trigger=assessment_scheduled`) + audit `client.status_changed`, di transaksi yang sama. Boleh melompat dari `inquiry` (tidak perlu `service_selected` / kode kuesioner dulu); tidak pernah mundur. Pindah jadwal (reschedule) tidak memicu transisi.

### 6.5 Verifikasi pembayaran (`POST /invoices/{id}/verify`)
1. Lock invoice (status harus `pending_verification`) + cek `version`.
2. `approve`: invoice `paid`, `paid_at`, `verified_by`; insert `client_packages` (snapshot paket, `invoice_id` UNIQUE mencegah aktivasi ganda); ledger `purchased`/`renewed` (+N); update `clients.credit_balance`; `payment_proofs.review_status=accepted`.
3. `reject`: invoice `rejected` + `rejection_reason`; proof `rejected`.
4. Audit `invoice.verified`/`invoice.rejected` + `credit.package_activated`.

### 6.6 Transisi status client (`POST /clients/{id}/transition`)
Validasi transisi di server (alur maju otomatis = `advanceStatus` di `frontend/src/domain/client.js`; outcome manual bebas dari tahap mana pun, sesuai prototype). Selalu insert `client_status_histories` + audit `client.status_changed` (atau `client.admitted` dsb.). Admit: set `date_of_join`, tidak membuat paket (saldo 0 = frozen sampai Finance mengaktifkan paket).

---

## 07. Strategi performa

| Area | Strategi |
|---|---|
| **Indeks** | Komposit sesuai bagian 01; urutan kolom: equality (`branch_id`, `therapist_id`, `status`) → range (`session_date`, `issued_at`) → sort. Tidak ada indeks tunggal untuk kolom kardinalitas rendah |
| **Baris ramping** | Teks panjang dipisah (`session_reports`); tabel hot (`schedules`, `clients`) hanya kolom yang difilter/ditampilkan di list |
| **Denormalisasi terkendali** | `clients.credit_balance`, `cancel_count_total`, `client_packages.remaining_credit`, `credit_ledger.branch_id`, `session_reports.client_id` — diperbarui di transaksi yang sama; job rekonsiliasi malam membandingkan dengan Σ ledger dan menulis audit `system` bila ada selisih |
| **Generated column** | `clients.birth_month`, `session_reports.filled_sections` → filter tanpa fungsi di WHERE (indeks tetap terpakai) |
| **Dashboard via VIEW** | `v_daily_*` di atas indeks covering + generated column tanggal WIB; selalu difilter cabang + rentang tanggal (pushdown MySQL ≥ 8.0.22). Tabel ringkasan hanya jika view > 100 ms (§04-G) |
| **Tanpa Redis** | Andalkan InnoDB buffer pool (data hot: kalender, client aktif, master data muat di RAM). Cache Laravel & queue memakai driver `database` (tabel `cache`, `jobs`). Permission dimemo per request. Hasil dashboard boleh di-cache driver `database` TTL 60 detik bila perlu |
| **Pagination** | Keyset untuk `audit_logs`, `credit_ledger`, riwayat sesi; offset hanya untuk list kecil ber-filter |
| **N+1** | API Resource memakai `with()` eksplisit; aktifkan `Model::preventLazyLoading()` di non-produksi |
| **Payload** | List mengembalikan kolom ringkas (Resource khusus list), detail lengkap di endpoint detail |
| **Kalender** | Satu query per minggu per cabang (Q1) + daftar terapis/client ringkas (dimuat sekali di frontend); frontend tidak memanggil per sel |
| **Lock singkat** | `lockForUpdate` hanya pada baris yang diubah; transaksi tidak memanggil I/O eksternal (WA, upload) — itu dilakukan setelah commit via queue `database` |
| **Partisi** | `audit_logs` per bulan. Tabel lain belum perlu (estimasi < 5 juta baris/5 tahun) |
| **Konfigurasi MySQL** | `innodb_buffer_pool_size` ≈ 60–70% RAM, `innodb_flush_log_at_trx_commit=1` (data finansial), slow query log ≥ 200 ms dipantau |
| **Skala lanjut** | Read replica untuk dashboard & laporan bila beban baca naik; koneksi persistent via Octane/PHP-FPM tuning |

Verifikasi: setiap query di bagian 01 diuji `EXPLAIN ANALYZE` dengan data seed ±50 ribu sesi; target `type` = `ref`/`range`, tanpa `Using filesort` untuk list utama.

---

## 08. Mapping frontend ↔ database & keputusan enum

### 8.1 Mapping field utama
| Frontend (`frontend/src`) | Database |
|---|---|
| `clients[].clientName / dob / parentContact / parentEmail` | `clients.child_name / date_of_birth / parent_phone / parent_email` |
| `clients[].serviceTypes[]` (+ legacy `serviceType`) | `client_services` |
| `clients[].gdriveClientLink` | `client_documents (type=gdrive_folder)` |
| `clients[].assessmentCodes[]` | `assessment_access_codes` |
| `clients[].assessmentAnswers[]` | `assessment_responses` + `assessment_answers` + `assessment_quadrant_scores` |
| `clients[].intakeNote` | `clients.intake_note` |
| `clients[].dischargeReason / dischargeNote` | `clients.discharge_reason / discharge_note` |
| perubahan status client | `client_status_histories` + `audit_logs` |
| `schedules[].date / startTime / endTime / therapistId` | `schedules.session_date / start_time / end_time / therapist_id` |
| `schedules[].creditPackageId` | `schedules.client_package_id` |
| `schedules[].rescheduledFrom{…}` | `schedules.origin_date / origin_start_time / origin_end_time / origin_therapist_id` |
| `schedules[].pendingFrom / pendingReason / pendingNote` | slot tetap + `pending_reason / pending_note / pending_at` |
| `schedules[].activitySection / noteSection / homeworkSection` | `session_reports.*` |
| `schedules[].recurrenceRule / isRecurring` | `schedule_series` + `schedules.series_id` |
| `credits.masterPackages[]` | `master_packages` |
| `credits.records[].packages[]` | `client_packages` |
| `credits.records[].history[]` | `credit_ledger` |
| `credits.records[].cancelCountTotal` | `clients.cancel_count_total` |
| `credits.invoices[]` (+ `proof*`) | `invoices` + `payment_proofs` |
| `therapists[]` + `staffUsers[]` | `users` |
| `rolesList[]` / `rbacPermissions` | `roles` / `role_permissions` (+ `access_modules`) |
| `master_services` / `master_quadrants` | `services` / `sensory_quadrants` |
| `master_cancel_reasons`, `master_discharge_reasons` (+ `DEFAULT_*` seed) | `cancel_reasons`, `discharge_reasons` (pilihan cepat; kolom transaksi = string, tanpa FK) |
| dashboard (hitung di `useMemo`) | view `v_daily_revenue`, `v_daily_sessions`, `v_daily_pipeline`, `v_daily_credit_usage` |

Konversi camelCase ↔ snake_case dilakukan otomatis oleh `frontend/src/services/http/httpClient.js`.

### 8.2 Keputusan enum (menyelesaikan gap prototype vs schema v1)
| Area | Keputusan v2 | Dampak ke frontend |
|---|---|---|
| `clients.status` | Ikut prototype: 9 status termasuk `service_selected`, `assessment_done`, `discharged` | Tidak ada |
| `schedules.status` | `scheduled, completed, cancelled, rescheduled, reschedule_pending`; **frozen = turunan** | Tidak ada |
| `cancel_reasons` / `discharge_reasons` | Tabel pilihan cepat tanpa FK; kolom transaksi menyimpan **string** (code atau teks custom) | Tidak ada: UI menyediakan pilihan cepat + opsi "Lainnya (ketik sendiri)"; label tampil dicari dari master, fallback ke string |
| Aturan penalti | Kuota 3 cancel per client (global, prototype); semua alasan manual dihitung kuota | Tidak ada |
| `invoices.status` | `unpaid, pending_verification, paid, rejected, void` | Frontend perlu menampilkan `pending_verification` & `rejected` (sekarang: bukti diunggah tetap `unpaid`) |
| `client_packages.status` | `active, depleted, expired` | Tambah `expired` (paket berbatas waktu, opsional) |
| `credit_ledger.action` | `purchased, renewed, used, cancel_excused, cancel_penalty, reversal, manual_adjust, expired` | Label baru di riwayat kredit Finance (`expired` hanya dari job `packages:expire`, §11) |
| Revert sesi | Endpoint baru `POST /schedules/{id}/revert` | Fitur UI "Batalkan completed/cancel" (belum ada di prototype) |

---

## 09. Urutan migration & seeder

1. `branches`, `roles`, `access_modules`, `role_permissions`, `users`
2. `services`, `sensory_quadrants`, `cancel_reasons`, `discharge_reasons`, `master_packages`
3. `clients`, `client_services`, `client_documents`, `client_status_histories`
4. `assessment_categories`, `assessment_sections`, `assessment_questions`, `assessment_access_codes`, `assessment_responses`, `assessment_answers`, `assessment_quadrant_scores`
5. `invoices`, `payment_proofs`, `client_packages`
6. `schedule_series`, `schedules`, `session_reports`
7. `credit_ledger`
8. `audit_logs` (+ partisi + trigger)
9. View dashboard (`CREATE OR REPLACE VIEW …` di migration terpisah, setelah semua tabel)
10. Laravel bawaan: `personal_access_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `failed_jobs`, `job_batches` (`php artisan cache:table`, `queue:table`, `session:table`)

Seeder:
- **Wajib (produksi)**: branches, roles + role_permissions (dari `frontend/src/domain/rbac.js`), access_modules, services (`INTAKE_SERVICES`), sensory_quadrants, cancel_reasons, discharge_reasons, master_packages, akun master awal.
- **Demo/staging**: konversi seed frontend (`frontend/src/data/*.seed.json`, `scripts/generate_demo_seed.py`) — tanggal relatif hari ini, ledger dibangun dari histori agar saldo konsisten.
- Setelah seed demo: jalankan `credits:reconcile` sekali untuk memastikan saldo denormalisasi cocok dengan ledger.

---

## 10. Catatan implementasi Laravel

- **Auth ganda**: guard `staff` (model `User`, Sanctum token) dan guard `client` (model `Client` sebagai `Authenticatable`, login dengan `client_access_code` + tanggal lahir anak + throttle). Token ability membedakan portal.
- **Policy**: berbasis `role_permissions` (modul) + aturan aksi (mis. `SchedulePolicy::complete` hanya `master`/`admin_schedule`), selaras `frontend/src/domain/rbac.js` & `canManageSchedule`.
- **Scope cabang**: global scope `BranchScope` pada model ber-`branch_id` untuk user non-master.
- **Action class per use-case** (`CompleteSessionAction`, `CancelSessionAction`, `RevertSessionAction`, `VerifyPaymentAction`, `TransitionClientAction`) — padanan hook use-case frontend; semua aturan kredit mengikuti `frontend/src/domain/credit.js` (acuan test).
- **AuditLogger** service:
  ```php
  AuditLogger::batch(function () use ($schedule, $dto) {
      $before = $schedule->only(['status']);
      // … perubahan data …
      AuditLogger::log('schedule.completed', $schedule, old: $before, new: $schedule->only(['status']),
          subject: $schedule->client, meta: ['credit_change' => -1, 'ledger_id' => $ledger->id]);
  });
  ```
  `batch()` membungkus `DB::transaction` + membuat `batch_id` (ULID). Trait `Auditable` (observer) hanya untuk CRUD master sederhana; aksi bisnis selalu eksplisit agar `reason`, `subject`, dan `meta` lengkap.
- **Optimistic lock**: request mengirim `version`; `update … where version = ?` → 0 baris = `409 Conflict` (frontend: `ApiError.isConflict`).
- **Event & queue** (driver `database`, worker `php artisan queue:work`): `SessionCompleted`, `InvoicePaid`, `ClientStatusChanged` → listener kirim notifikasi WA setelah commit (`ShouldQueue` + `afterCommit`). Tidak ada listener pengisi ringkasan.
- **`.env` tanpa Redis**: `CACHE_STORE=database`, `QUEUE_CONNECTION=database`, `SESSION_DRIVER=database`.
- **Kontrak API & endpoint**: `docs/guide/10-api-migration.md` dan `frontend/src/services/api/endpoints.js`.

---

## 11. Job terjadwal (Laravel Scheduler)

Semua job dijalankan **Laravel Scheduler** + **queue driver `database`** (tanpa Redis). Di server cukup:

```bash
# crontab (satu baris, setiap menit) — Laravel yang menentukan job mana yang jalan
* * * * * cd /var/www/therapedia && php artisan schedule:run >> /dev/null 2>&1

# Supervisor: worker queue (notifikasi WA, upload, dsb.)
php artisan queue:work --queue=default --tries=3 --max-time=3600
```

Prinsip:
- Jadwal memakai zona **Asia/Jakarta** dan jam sepi (00:30–04:30 WIB), agar tidak berebut lock dengan jam operasional klinik (07:00–18:00).
- Setiap job `withoutOverlapping()` + `onOneServer()` (lock disimpan di tabel `cache_locks` MySQL).
- Data diproses **per batch kecil** (`chunkById(500)`), satu transaksi per batch, supaya lock InnoDB singkat.
- Setiap perubahan data oleh job ditulis ke `audit_logs` dengan `actor_type = system`, `source = system`, satu `batch_id` per run, ditutup log ringkasan `system.job_completed` (jumlah baris, durasi) atau `system.job_failed`.
- Job harus **idempoten**: dijalankan dua kali tidak menghasilkan efek ganda.

### 11.1 Daftar job

| Jam (WIB) | Command | Untuk apa | Tabel / indeks | Wajib? |
|---|---|---|---|---|
| Setiap hari 00:30 | `assessment-codes:expire` | Kode kuesioner ortu yang lewat `expires_at` dan belum dipakai → status `expired`, sehingga link lama tidak bisa dipakai lagi | `assessment_access_codes` · `idx_codes_expiry` | Ya, bila kode diberi masa berlaku |
| Setiap hari 01:00 | `packages:expire` | Paket kredit `active` yang lewat `expires_at` → `expired`. Sisa kredit dicatat ledger `expired` (−sisa) dan `clients.credit_balance` dikurangi | `client_packages` · `idx_pkg_expiry`, `credit_ledger`, `clients` | Hanya bila klinik memakai masa berlaku paket |
| Setiap hari 02:00 | `credits:reconcile` | **Pengaman denormalisasi**: bandingkan Σ `credit_ledger.credit_change` per paket dengan `client_packages.remaining_credit`, serta Σ per client dengan `clients.credit_balance` & `cancel_count_total`. Bila beda → perbaiki dari ledger (ledger = sumber kebenaran), catat `credit.reconciled`, dan kirim peringatan ke Master. Normalnya selisih 0; bila ada selisih, itu tanda bug yang harus diselidiki | `credit_ledger` (`idx_ledger_client`), `client_packages`, `clients` | **Ya** |
| Tanggal 1 tiap bulan, 03:00 | `audit:partitions` | Tambah partisi `audit_logs` bulan depan (`REORGANIZE PARTITION pmax`); partisi > 24 bulan di-`EXCHANGE` ke `audit_logs_archive` lalu diekspor ke file (arsip ≥ 5 tahun) | `audit_logs` | **Ya** (tanpa ini log menumpuk di `pmax` dan partisi tidak efektif) |
| Setiap hari 03:30 | backup DB (cron sistem, bukan Laravel) | `mysqldump --single-transaction --routines --triggers` (atau Percona XtraBackup) + binary log untuk point-in-time recovery; simpan 14 hari lokal + salinan off-server | seluruh DB | **Ya** |
| Setiap hari 04:00 | housekeeping Laravel | `sanctum:prune-expired --hours=24`, `queue:prune-failed --hours=168`, `queue:prune-batches --hours=48`, `auth:clear-resets`, dan hapus baris `cache` yang sudah lewat `expiration` (driver `database` tidak menghapusnya otomatis) | `personal_access_tokens`, `failed_jobs`, `job_batches`, `password_reset_tokens`, `cache` | Ya |
| Minggu 04:30 | `db:analyze` | `ANALYZE TABLE schedules, clients, invoices, credit_ledger, client_status_histories` — menyegarkan statistik indeks agar optimizer tetap memilih indeks yang tepat saat data bertambah | tabel transaksi utama | Disarankan |
| Setiap hari 07:00 | `schedules:overdue-digest` | Kirim ringkasan ke Admin Schedule tiap cabang: sesi `scheduled/rescheduled` yang tanggalnya sudah lewat tapi belum di-complete/cancel. **Tidak** auto-complete, karena complete memotong kredit dan butuh laporan terapis | `schedules` · `idx_sch_status (status, session_date)` | Disarankan |
| Setiap hari 08:00 | `invoices:overdue-reminder` | Invoice `unpaid` yang lewat `due_date` → pengingat WA ke ortu (via queue) & daftar untuk Finance. Status invoice tidak diubah | `invoices` · `idx_inv_due` | Opsional |

Contoh pendaftaran di `routes/console.php`:
```php
use Illuminate\Support\Facades\Schedule;

Schedule::command('assessment-codes:expire')->dailyAt('00:30')->timezone('Asia/Jakarta')->withoutOverlapping()->onOneServer();
Schedule::command('packages:expire')->dailyAt('01:00')->timezone('Asia/Jakarta')->withoutOverlapping()->onOneServer();
Schedule::command('credits:reconcile')->dailyAt('02:00')->timezone('Asia/Jakarta')->withoutOverlapping()->onOneServer()
    ->onFailure(fn () => NotifyMaster::dispatch('credits:reconcile gagal'));
Schedule::command('audit:partitions')->monthlyOn(1, '03:00')->timezone('Asia/Jakarta')->onOneServer();
Schedule::command('sanctum:prune-expired --hours=24')->dailyAt('04:00')->timezone('Asia/Jakarta');
Schedule::command('queue:prune-failed --hours=168')->dailyAt('04:05')->timezone('Asia/Jakarta');
Schedule::command('cache:purge-expired')->dailyAt('04:10')->timezone('Asia/Jakarta');   // custom: DELETE FROM cache WHERE expiration < UNIX_TIMESTAMP()
Schedule::command('db:analyze')->weeklyOn(0, '04:30')->timezone('Asia/Jakarta');
Schedule::command('schedules:overdue-digest')->dailyAt('07:00')->timezone('Asia/Jakarta')->onOneServer();
Schedule::command('invoices:overdue-reminder')->dailyAt('08:00')->timezone('Asia/Jakarta')->onOneServer();
```

### 11.2 Yang sengaja **tidak** memakai job
| Fitur | Kenapa tidak perlu job |
|---|---|
| Dashboard revenue / inquiry / schedule / cabang | Dibaca langsung dari view `v_daily_*` (§04-G), selalu real-time |
| Status **Frozen** (kredit 0) | Turunan `clients.credit_balance = 0`, dihitung saat query |
| Birthday radar | Query live `clients (branch_id, birth_month)` dengan generated column + indeks |
| Kuota cancel & penalti | Diterapkan di transaksi cancel (§06.2), bukan batch malam |
| Skor kuadran asesmen | Dihitung saat ortu submit, disimpan di `assessment_quadrant_scores` |
| Notifikasi WA saat aksi terjadi | Queue `database` setelah commit, bukan terjadwal |

### 11.3 Kapan menambah job ringkasan
Hanya jika view dashboard melewati target (> 100 ms p95, lihat §04-G). Saat itu tambahkan `metrics:rebuild` (setiap hari 01:30, membangun ulang `daily_branch_metrics` untuk H-1 s.d. H-7 memakai query view yang sama) dan arahkan endpoint dashboard ke tabel itu. Sebelum itu, job ini **tidak dibuat**.
