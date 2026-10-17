# Timeline Development (Internal) — Therapedia

**Dokumen internal developer.** Versi klien (bahasa non-teknis, jadwal UAT, termin): `TIMELINE_UAT_KLIEN.md`. Dokumen ini **menggantikan penjadwalan** di `sprint_plan.md` §2 dan §4 (isi teknis sprint di sana tetap jadi rujukan rincian task). Dibuat **10 Okt 2026** setelah requirement final dan deal.

## 1. Ringkasan

| Item | Nilai |
|---|---|
| Mulai backend | **Senin 12 Okt 2026** (folder `therapedia-v2` masih kosong per 10 Okt; bila sudah ada progres, geser dari sini) |
| Selesai pembangunan fitur | Jumat 13 Nov (D5) + stabilisasi D6–D7 |
| UAT klien | **Setiap Sabtu, kisaran 10.00–13.00 WIB (opsional; jam pasti disepakati dengan klien per sesi)**: 24 Okt → 28 Nov (6 sesi; prototipe sudah direview klien, tanpa UAT 17 Okt), cadangan Sabtu 5 Des |
| Sign-off UAT | **Sabtu 28 Nov 2026** |
| Go-live | **Senin 7 Des 2026** (hypercare 7–11 Des) |
| Tim | 1 developer, 5 hari efektif/minggu (Senin–Jumat) yang dipakai untuk rencana. **Sabtu sore (setelah UAT) dan Minggu tetap kerja = buffer ±1 hari/minggu** (tidak masuk hitungan 40 hari; dipakai mengejar keterlambatan dan bug UAT, sehingga tanggal ke klien tetap aman) |
| Beban | ±32 hari scope + ±8 hari stabilisasi/buffer = **40 hari rencana** (8 minggu) |
| Frontend | Sudah lengkap (demo localStorage). Pekerjaan FE = pindah store ke API, bukan membangun ulang |
| Google Calendar (F8) | Setelah go-live (mulai 14 Des, ±2–3 hari) |

**Kenapa bergeser dari `sprint_plan.md` (go-live 13 Nov).** Beban naik dari 25,5 menjadi ±32 hari karena revisi R9–R30 (cuti 30 hari/tahun, credit leave per paket, refund, utilization, Therapist Off rate, rekap harian, KODE alasan, libur berentang, kode asesmen tanpa invoice, dll.) belum dihitung di sana. Selain itu UAT klien hanya Sabtu 3 jam, sehingga tiap modul butuh satu Sabtu sendiri. Mempertahankan 13 Nov berarti menambah developer atau memangkas scope (lihat §8).

## 2. Kalender gabungan

Kolom **Progres** = kumulatif hari rencana ÷ 40 (dasar penagihan Termin 2, lihat §6).

| Minggu | Tanggal (Sen–Jum) | Fokus | Hari | Progres | UAT Sabtu | Fokus UAT |
|---|---|---|---|---|---|---|
| Pra | 10 Okt (Sab) | Review timeline & requirement final | — | 0% | — | — |
| **D1** | 12–16 Okt | Fondasi, DB, seeder, inti, auth, RBAC & master (backend) | 5 | 12,5% | — (17 Okt tanpa UAT) | Prototype sudah direview klien; backend belum bisa diuji |
| **D2** | 19–23 Okt | Master Cabang, libur, FE auth/master, Client, status, mesin asesmen, kode & kuesioner publik | 5 | 25% | **#1 — 24 Okt** | Login asli, RBAC, master data, cabang |
| **D3** | 26–30 Okt | FE inquiry/asesmen, jadwal, aksi sesi, revert & bulk, cuti (mulai) | 5 | 37,5% | **#2 — 31 Okt** | Inquiry, client, asesmen & kuesioner ortu |
| **D4** | 2–6 Nov | Cuti selesai, FE jadwal, Finance inti, ledger | 5 | **50%** | **#3 — 7 Nov** | Penjadwalan lengkap + preview Finance → **Checkpoint Termin 2** |
| **D5** | 9–13 Nov | Void/pengganti, konversi, refund, credit leave, cuti Finance, FE finance | 5 | 62,5% | **#4 — 14 Nov** | Finance & kredit |
| **D6** | 16–20 Nov | Test kredit, portal, dashboard, job, env UAT final, bug fix | 5 | 75% | **#5 — 21 Nov** | **UAT ronde 1 menyeluruh** (semua role + portal + dashboard) |
| **D7** | 23–27 Nov | Hapus cabang & uji FK, hardening, skrip migrasi, panduan, perbaikan ronde 1 | 5 | 87,5% | **#6 — 28 Nov** | **UAT ronde 2 (regresi) + sign-off** → **Termin 3** |
| **D8** | 30 Nov–4 Des | Regresi akhir, training, freeze (3–4 Des), backup + uji restore, migrasi produksi | 5 | 100% | 5 Des (cadangan) | Verifikasi migrasi / re-test bug Kritis |
| — | **Senin 7 Des** | **Go-live**, hypercare 7–11 Des | | | 12 Des | Review pasca go-live |

Libur nasional 12 Okt–7 Des 2026 tidak ada menurut kalender yang saya ketahui (Natal 25 Des di luar rentang). **Cek SKB cuti bersama resmi sebelum jadwal dikunci ke klien.**

## 3. Rincian per minggu

Rujukan modul = `implementation_detail.md` §2. Estimasi harian ±; sisa/kelebihan hari digeser ke hari berikutnya dalam minggu yang sama, bukan ke minggu lain, kecuali tertulis.

### D1 — 12–16 Okt: Fondasi, auth, master (backend) · 5 hari · progres 12,5%
**Tujuan:** API berjalan di env UAT; login staf dan ortu serta master data bisa dites via Postman. Frontend belum disentuh.

| Hari | Pekerjaan | Hari |
|---|---|---|
| Sen | Repo Laravel 12 baru (bukan `backend/` legacy), Sanctum, `.env` (`CACHE/SESSION=database`, `QUEUE=sync`, tanpa Redis), struktur `Actions/`, CI (lint + test), deploy otomatis ke env UAT (satu-satunya lingkungan; tanpa staging) + HTTPS. Mulai migration | 0,5 + 0,5 |
| Sel | Migration lanjut: 37 tabel `schema.md` §09, FK CASCADE/RESTRICT/SET NULL §6.7, generated column WIB, CHECK, 6 view, `invoice_logs`, `package_conversions`. Seeder wajib: cabang, role, `access_modules`, `role_permissions` (dari `domain/rbac.js`), layanan, alasan Cancel/Off (+KODE, flag Therapist Off), alasan discharge, paket (`leaveQuota`, `invoice_code`), akun master | 0,5 + 0,5 |
| Rab–Kam | Inti: trait `created_by/updated_by`, `BranchScope`, `PermissionService` + policy (akses modul; hapus client & cabang hanya `master`), optimistic lock (`version` → 409), format error + kode domain (§1.2, §17.3) cocok dengan `ApiError`, Resource camel/snake, pagination `page/per_page` (default 10) + keyset, pencarian prefix nama/ortu/kode | 1,25 |
| Kam–Jum | Auth: login staf (throttle), password sementara + `must_change_password`, OTP email (sinkron, 5 percobaan, kedaluwarsa), reset oleh Master, login ortu (`client_code` + tgl lahir, throttle/lockout, pesan generik), logout, `me` | 0,75 |
| Jum | Master & akses: user staf (nonaktif, 1 cabang), role + matriks RBAC, CRUD layanan/alasan/paket | 1,0 |
| Jum 14.00 | Deploy ke env UAT, Postman collection M1–M3, catatan rilis ke klien | — |

**Selesai bila:** login semua role di env UAT via API, master tersimpan di MySQL, kolom pelaku terisi, test backend M1–M3 hijau.

### D2 — 19–23 Okt: Cabang, FE auth/master, inquiry, asesmen · 5 hari · progres 25%
**Tujuan:** login asli di UI; intake → layanan → kode kuesioner → ortu isi berjalan di env UAT.

| Hari | Pekerjaan | Hari |
|---|---|---|
| Sen | Master Cabang (CRUD, aktif/nonaktif, pratinjau dampak hapus), hari libur (input **berentang** → 1 baris/tanggal, UNIQUE), pengaman master dipakai (409 `in_use`) | 0,25 + 0,25 |
| Sen–Sel | FE: `tokenStore` + `setUnauthorizedHandler`, form login ortu + tgl lahir, `authStore`/`masterDataStore`/`therapistsStore` → API (react-query), `VITE_DATA_SOURCE=api` per modul | 0,75 |
| Sel–Rab | Client: CRUD, kode `AE-00001` dari `client_code_counters`, sinkron `client_services`, link GDrive (`client_documents`), pencarian prefix (Q5), list pipeline per cabang (Q4), cek duplikat, **hapus permanen cascade** (`DeleteClientAction`, file bukti dihapus sinkron) | 1,0 |
| Rab | Status: transisi otomatis maju, manual ke tahap mana pun (hanya status terakhir, tanpa tabel riwayat), discontinue + `date_of_discontinue`, reaktivasi | 0,5 |
| Kam | Mesin asesmen: kategori/section/soal (12 tipe incl. `birth_date`), 409 bila dipakai | 0,75 |
| Jum | Kode kuesioner (`type_code` + acak, masa berlaku opsional, `invoice_required`), endpoint publik ambil form + submit (sekali isi, expiry, consent, throttle), daftar awaiting questionnaire + drop-off | 1,0 |
| Jum | FE client dimulai (`clientsStore`, `useClientOutcomeActions`) | 0,5 |

**Selesai bila:** login asli di UI untuk semua role; skenario intake → kode → ortu isi lolos di env UAT.

### D3 — 26–30 Okt: Jadwal & aksi sesi · 5 hari · progres 37,5%
**Tujuan:** kalender, aksi sesi, ledger kredit dasar benar dan transaksional.

| Hari | Pekerjaan | Hari |
|---|---|---|
| Sen | FE: `assessmentsStore`, `branchesStore`, `AssessmentFill`, `useQuestionnaireCodeActions`, `useClientDeleteActions`, list inquiry `page/per_page`. Test: pipeline (tidak mundur), submit ulang kuesioner | 0,75 + 0,5 |
| Sel | Jadwal: CRUD sesi, seri berulang (`schedule_series`, lewati libur), bentrok terapis (lock, 409, `force`), sesi asesmen/re-assessment memajukan pipeline, query kalender per minggu (Q1–Q3) | 1,0 |
| Rab–Kam | Aksi sesi: complete (ledger `used`, idempotency, FIFO paket), **Cancel/Off** (alasan ber-KODE, `deduct_credit` wajib, credit leave dulu baru kredit, Therapist Off), reschedule, pending, drop pending, `session_reports` | 1,25 |
| Jum | Revert 1x (completed/cancel/reschedule/pending; ledger `reversal`) + bulk complete/cancel/reschedule/revert (bulk reschedule atomik) | 0,75 |
| Jum | Cuti client (mulai): `client_leaves`, `planLeave` (sesi pertama–terakhir di rentang) | 0,75 |

**Selesai bila:** kalender mingguan + aksi sesi jalan di env UAT; saldo kredit = Σ ledger pada skenario test.

### D4 — 2–6 Nov: Cuti, FE jadwal, Finance inti · 5 hari · progres **50%** (Checkpoint Termin 2)
**Tujuan:** penjadwalan lengkap di UI; Finance inti (invoice → bukti → verifikasi → paket aktif) berjalan.

| Hari | Pekerjaan | Hari |
|---|---|---|
| Sen | Cuti selesai: akhiri lebih awal/void (sesi kembali `scheduled`), blok jadwal saat cuti (422 `client_on_leave`), cuti lintas tahun | 0,75 |
| Sen–Sel | FE: `schedulesStore`, `useSessionActions`, monitoring unreported (`v_unreported_sessions`), halaman libur, kalender terapis. Test jadwal (bentrok, libur, revert 1x, bulk parsial) | 0,75 + 0,25 |
| Sel–Rab | Finance inti: invoice paket/assessment (`INV-{KODE}-{YYYYMMDD}-{NNN}`, `invoice_counters`), upload bukti (≤5 MB, JPG/PNG/PDF, re-upload ≤3x), verifikasi approve/reject, aktivasi paket (`invoice_id` UNIQUE) + relink jadwal mendatang, renewal 2 jalur (invoice baru / langsung lunas + alasan + justifikasi), hapus invoice belum lunas | 1,25 |
| Kam | Ledger riwayat keyset (Q10), Log Kredit & Saldo per paket (catatan bisa diedit, kolom Oleh) | 0,5 |
| Kam | Perbaikan bug UAT #1–#2 | 0,5 |
| Jum | FE finance dasar: `creditsStore`, `usePackageActivationActions`, upload via `api.upload`, status `pending_verification`/`rejected` | 1,0 |
| Jum 14.00 | Build dibekukan untuk UAT #3; **Checkpoint 50%** dicatat (§6) | — |

**Selesai bila:** M0–M6 lengkap + Finance inti tampil di UAT #3; progres 20/40 hari.

### D5 — 9–13 Nov: Finance lanjutan · 5 hari · progres 62,5%
**Tujuan:** semua fitur Finance dan kredit selesai dan terintegrasi.

| Hari | Pekerjaan | Hari |
|---|---|---|
| Sen–Sel | Void (alasan wajib, hanya kredit belum dipakai) + **invoice pengganti** (`replaces_invoice_id`), `void-preview`, `replacement-candidates`, tab Saldo Lebihan (Q23) | 1,0 |
| Rab–Kam | Konversi paket (otomatis/manual, lebihan → `clients.leftover_balance`, catatan Finance wajib, jadwal mendatang dihapus, ledger `converted_out/in`), `convert-preview`, `package_conversions`, `invoice_logs` + endpoint log | 1,0 |
| Kam | Refund (`invoices.refund_*`, ledger `refund`, Verified vs Gross) | 0,5 |
| Kam | Credit leave per paket (`leave_total/used`, reset saat renewal paket satuan) | 0,5 |
| Jum | Cuti Finance: jatah 30 hari/tahun, Reset Cuti Tahunan, invoice cuti (`invoices.leave_id`), detail log cuti | 1,0 |
| Jum | FE finance lanjut: `useInvoiceVoidActions`, dialog Void/pengganti, tab Saldo Lebihan & Cuti | 0,5 |
| Jum 14.00 | Build dibekukan untuk UAT #4 | — |

**Selesai bila:** semua alur Finance dari `docs/guide/06` dapat dijalankan di UI via API.

### D6 — 16–20 Nov: Portal, dashboard, job · 5 hari · progres 75%
**Tujuan:** semua modul ada; lingkungan UAT final siap untuk ronde 1.

| Hari | Pekerjaan | Hari |
|---|---|---|
| Sen | Test kredit wajib: complete → revert → complete, approve tidak dobel, void, pengganti tanpa kredit dobel, hapus invoice lunas ditolak, relink jadwal, konversi tanpa kekurangan, `credits:reconcile` | 0,75 |
| Sel–Rab | Portal: terapis (jadwal sendiri, summary `v_therapist_sessions`, laporan, rekap harian + filter periode, detail/cetak), ortu (`/portal/*`: tagihan tanpa void, kredit, riwayat + laporan, kuesioner + gating bukti, export laporan harian), Active Client (roster, profil, birthday, analitik, re-assessment) | 1,25 |
| Kam | Dashboard: revenue (Gross vs Verified, refund), inquiry (Total Discharge + alasan), schedule (Cancellation Rate, Therapist Off Rate), branch, utilization terapis/cabang, client-analytics (`v_daily_*`, periode custom) | 1,5 |
| Jum | Job: `credits:reconcile` 02:00, housekeeping 04:00, backup harian + arsip 6 bulan, `db:analyze` | 0,5 |
| Jum | **Bersihkan env UAT**: hapus data uji developer/tester yang tidak dipakai, pastikan data seed klien (`UAT-…`) lengkap, akun per role, Postman → Swagger | 0,5 |
| Sen–Jum | Perbaikan bug UAT #3–#4 | 0,5 |
| Jum 14.00 | Build dibekukan untuk UAT #5 | — |

**Selesai bila:** semua role bisa menjalankan semua skenario di `TIMELINE_UAT_KLIEN.md` §5 di env UAT.

### D7 — 23–27 Nov: Hardening & perbaikan ronde 1 · 5 hari · progres 87,5%
| Hari | Pekerjaan | Hari |
|---|---|---|
| Sen | Hapus cabang atomik sinkron (batch, timeout rute dinaikkan, ketik kode) + **uji integritas FK** (tidak ada baris yatim setelah hapus client/cabang; master terpakai ditolak) | 0,5 |
| Sel | Hardening: rate limit, CORS, HTTPS, uji policy per role, `EXPLAIN ANALYZE` Q1–Q23 pada ±50 ribu sesi | 0,5 |
| Rab | Skrip migrasi data lama (G1) memakai template CSV klien + panduan pengguna singkat per role | 0,5 + 0,5 |
| Kam | Bug bash semua role + mobile 375px (portal ortu, `/assessment`) | 0,5 |
| Sen–Jum | **Perbaikan temuan UAT #5** (Kritis ≤1 hari kerja, Mayor minggu ini) | 2,5 |
| Jum 14.00 | Build regresi dibekukan untuk UAT #6 | — |

### D8 — 30 Nov–4 Des: Training, freeze, cutover · 5 hari · progres 100%
| Hari | Pekerjaan | Hari |
|---|---|---|
| Sen | Tagih Termin 3 (setelah sign-off 28 Nov). Perbaikan temuan UAT #6 | 1,0 |
| Sen–Rab | Training staf per role (sesi + panduan), rekam singkat | 1,5 |
| Rab | Cek hasil migrasi data bersama klien | 0,5 |
| Kam–Jum | **Freeze** (tidak ada perubahan kode). Backup penuh + **uji restore**, migrasi produksi, `credits:reconcile`, uji asap produksi | 1,0 |
| Jum | Cutover: arahkan domain, `VITE_DATA_SOURCE=api`, matikan mode demo, cek SSL/CORS | 0,5 |
| Cadangan | 0,5 hari untuk sisa; Sabtu 5 Des untuk re-test bug Kritis | 0,5 |

**Go-live Senin 7 Des.** Hypercare 7–11 Des: standby, SLA Kritis ≤ 4 jam kerja.

## 4. Peta modul → minggu

| Modul | Minggu | Modul | Minggu |
|---|---|---|---|
| M0 fondasi, DB, seeder | D1 | M8 Active client | D6 |
| M1 Auth | D1 | M9 Portal terapis | D6 |
| M2 User, RBAC, cabang | D1–D2 | M10 Portal ortu | D6 |
| M3 Master & libur | D1–D2 | M11 Dashboard | D6 |
| M4 Inquiry & Client | D2 | M12 Hapus data | D2 (client), D5 (invoice), D7 (cabang + uji FK) |
| M5 Asesmen | D2 | M13 Job & sinkron | D6 (+ restore D8) |
| M6 Penjadwalan & cuti | D3–D4 | M14 Google Calendar | setelah go-live |
| M7 Finance & kredit | D4–D5 | | |

## 5. Ritme mingguan (siklus UAT Sabtu)

| Kapan | Kegiatan |
|---|---|
| Senin pagi | Planning: pecah task harian, triase bug UAT Sabtu lalu |
| Selasa–Kamis | Build + perbaikan |
| **Jumat 14.00** | **Build dibekukan** → deploy ke env UAT (setelah backup), pulihkan data seed klien bila perlu dengan pemberitahuan, kirim **catatan rilis** + daftar skenario Sabtu ke klien (paling lambat Jumat 16.00) |
| Jumat sore | Smoke test env UAT; review sprint, perbarui risiko |
| **Sabtu (kisaran 10.00–13.00, jam pasti disepakati)** | UAT: developer hadir (lihat agenda di `TIMELINE_UAT_KLIEN.md` §3) |
| Sabtu sore | Triase bug (Kritis/Mayor/Minor/Saran), masukkan ke minggu depan; hotfix Kritis yang memblokir bila perlu |

**Satu lingkungan (UAT) dipakai bersama developer, tester, dan klien — tanpa staging.** Konsekuensi dan aturannya:
- Deploy hanya **Senin–Kamis** dan diumumkan (nomor build) ke tester; **Jumat 14.00 sampai UAT selesai: freeze** (kecuali hotfix Kritis yang diumumkan).
- **Backup database sebelum setiap deploy besar dan sebelum setiap pemulihan data.** Migration yang mengubah struktur dijalankan hanya Senin–Kamis, bukan Jumat/Sabtu.
- Seed disiapkan **dua set**: client khusus `QA-…` (tester) dan `UAT-…` (klien); data tester diberi akhiran `(QA)`. Tidak ada reset mingguan otomatis; pemulihan data hanya oleh developer, diumumkan dulu.
- Uji massal/merusak (Reset Cuti Tahunan, hapus cabang) dikoordinasikan agar tidak merusak data klien.
- Developer **tidak** menguji coba fitur baru di data `UAT-…`; gunakan data sendiri atau `(QA)`.
- Risiko: bug di build baru bisa mengganggu sesi tester atau klien. Mitigasi: smoke Jumat 14.00–15.30, rollback ke build sebelumnya bila gagal.

**Aturan bug:** Kritis ≤ 1 hari kerja (Sabtu bila memblokir UAT) · Mayor di minggu yang sama · Minor dikumpulkan · Saran fitur baru = change request (fase 2 kecuali kritis). Bug di luar scope: catat di `docs/guide/11-known-issues.md` (aturan `CLAUDE.md`).

## 6. Pengukuran progres & Termin

**Progres** = hari rencana kumulatif yang selesai ÷ 40. Diperbarui tiap Jumat sore di tabel §7.

| Termin | Porsi | Pemicu | Tanggal target |
|---|---|---|---|
| 1 (DP) | 30% | Awal pekerjaan | Sebelum/di Senin 12 Okt (**konfirmasi sudah dibayar?**) |
| **2 (Progres 50%)** | 30% | **Checkpoint 50%**: akhir D4 | Jumat 6 Nov dicapai · diverifikasi di UAT #3 **Sabtu 7 Nov** · **tagih Senin 9 Nov** |
| 3 (Pelunasan) | 40% | UAT disetujui + siap go-live | Sign-off **Sabtu 28 Nov** · tagih Senin 30 Nov · dibayar sebelum go-live (target ≤ 4 Des) |

Rincian nilai dan pajak ada di dokumen invoice terpisah (tidak disimpan di repo).

**Kriteria Checkpoint 50% (objektif, agar tidak diperdebatkan):**
1. Progres tertimbang ≥ 20/40 hari rencana di tabel §7 (D1–D4 selesai).
2. Modul **Auth, RBAC, Master (+Cabang, libur), Inquiry/Client, Asesmen/Kuesioner, Penjadwalan** berjalan di env UAT dan lolos UAT #1–#3 tanpa bug Kritis terbuka.
3. **Finance inti** (invoice → tandai lunas → paket aktif → renewal) dapat didemokan di UAT #3.
4. `npm run lint` 0 error · `npm test` · `npm run build` · test backend hijau.
5. Catatan rilis D1–D4 terkirim ke klien.

Bila UAT #3 batal (penguji tidak hadir), Checkpoint tetap dicatat berdasarkan butir 1, 3, 4 dan demo dijadwalkan ulang paling lambat Sabtu 14 Nov; klien diberi tahu tertulis.

## 7. Tracker progres (isi tiap Jumat sore)

| Minggu | Rencana kum. | Aktual kum. | Selisih hari | Status | Catatan |
|---|---|---|---|---|---|
| D1 | 5 (12,5%) | | | ☐ | |
| D2 | 10 (25%) | | | ☐ | |
| D3 | 15 (37,5%) | | | ☐ | |
| D4 | 20 (**50%**) | | | ☐ | Checkpoint Termin 2 |
| D5 | 25 (62,5%) | | | ☐ | |
| D6 | 30 (75%) | | | ☐ | |
| D7 | 35 (87,5%) | | | ☐ | Sign-off → Termin 3 |
| D8 | 40 (100%) | | | ☐ | Go-live |

Bila selisih > 1 hari di akhir minggu: jalankan urutan pemindahan di §8 sebelum menggeser tanggal UAT.

## 8. Jika molor — urutan pemindahan

Tanggal UAT Sabtu dan go-live dijaga. Geser berurutan (dari paling rendah risikonya):
1. Konversi paket, bulk revert → D6–D7 (UAT #5 sebagai demo pertama).
2. Tab Saldo Lebihan, riwayat ledger keyset → D6.
3. Utilization & Therapist Off Rate dashboard, rekap harian terapis → D6–D7.
4. Export laporan harian ortu → D7.
5. Sisanya mengambil dari buffer 8 hari (D6–D8). Google Calendar tetap pasca go-live.

**Opsi mempertahankan go-live 16 Nov** (tidak dipilih): tambah 1 developer backend mulai D1, atau pindahkan konversi paket, refund, utilization, rekap harian, dan cuti Finance ke fase 2 (menghemat ±5 hari) **dan** lembur Sabtu/Minggu. UAT menyeluruh Sab 7 Nov, regresi Sab 14 Nov.

## 9. Definition of Done

**Per fitur:** endpoint sesuai `docs/guide/10-api-migration.md` + `schema.md`; aksi lintas tabel dalam satu transaksi; kolom pelaku terisi, log khusus (`credit_ledger`, `invoice_logs`, `package_conversions`) di transaksi yang sama; list `page/per_page` (default 10) atau keyset; hapus permanen + uji "tanpa baris yatim"; feature test aturan bisnis; frontend: interface store/hook tetap, `lint`/`test`/`build` lolos; docs `docs/guide/*` diperbarui.

**Build siap UAT (tiap Jumat):** lint 0 error · `npm test` · `npm run build` · test backend hijau · backup env UAT diambil · data klien (`UAT-…`) utuh · catatan rilis terkirim · tidak ada bug Kritis diketahui.

**UAT-ready penuh (Jum 20 Nov):** HTTPS · akun & data per role · skenario tertulis · backup harian aktif + restore teruji sekali · uji FK lolos (uji FK final D7).

## 10. Risiko

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| 1 | Backend belum mulai per 10 Okt (asumsi) | Semua tanggal bergeser | Konfirmasi titik awal sebelum dikirim ke klien; P3/P4 (server UAT, repo) Senin 12 Okt |
| 2 | UAT hanya Sabtu (±3 jam) | Cakupan skenario terbatas, bug ditemukan lambat | Satu modul per Sabtu, skenario tertulis dikirim Jumat, klien boleh uji mandiri di env UAT di luar Sabtu |
| 3 | Penguji tidak hadir | UAT molor, Checkpoint 50% / sign-off tertunda | PIC + cadangan per role (P5), konfirmasi Kamis, Sabtu 5 Des cadangan |
| 4 | D4–D5 sangat padat (Finance) | Checkpoint 50% bergeser | Urutan §8; kerja Finance dimulai D4 Selasa |
| 5 | Bug kredit (saldo ≠ Σ ledger) | Kepercayaan finansial | Test skenario kredit D6 Senin, `credits:reconcile` harian, ledger append-only |
| 6 | Server belum siap | Deploy tertunda | P3 Senin 12 Okt; fallback VPS developer |
| 7 | Scope baru setelah requirement final | Estimasi 40 hari tak cukup | Change request, masuk fase 2 kecuali kritis; dibahas Sabtu sesudah sesi |
| 8 | Data lama klien berantakan / terlambat | Migrasi D8 gagal | Template CSV dikirim 31 Okt, data bersih paling lambat 20 Nov |
| 9 | Hapus permanen salah klik | Data hilang | Konfirmasi tegas, invoice lunas = Void, backup + uji restore sebelum go-live |
| 10 | Satu developer berhalangan | Semua jalur berhenti | Buffer 8 hari; prioritaskan M1–M7 |

## 11. Di luar scope sekarang
Google Calendar (pasca go-live), WhatsApp Business API otomatis, satu login ortu banyak anak, upload dokumen ke server, klasifikasi skor otomatis, form landing → intake otomatis, diskon/DP/cicilan (klien: tidak ada). Detail: `sprint_plan.md` §7.

## 12. Rujukan
`implementation_detail.md` (API + tabel per modul) · `schema.md` (DB FINAL) · `technical_workflow.md` · `docs/guide/12-keputusan-klien.md` (R1–R30) · `docs/guide/10-api-migration.md` · `docs/guide/11-known-issues.md` · `sprint_plan.md` (rincian task, jadwal digantikan dokumen ini).
