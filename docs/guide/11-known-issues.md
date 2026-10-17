# 11 — Known Issues & Tech Debt

Diperbarui 2026-10-03 (keputusan klien) setelah restrukturisasi enterprise 2026-10-02. Hapus baris yang sudah diperbaiki.

## Sudah diperbaiki
| # | Masalah lama | Perbaikan |
|---|---|---|
| B1 | Bulk Complete & Bulk Cancel "leave" di Weekly Calendar memanggil fungsi yang tidak ada (TypeError) | `useSessionActions.bulkComplete` / `bulkCancel` (aturan sama dengan aksi tunggal) + test regresi |
| B2 | Tombol cetak terapis ke `/print/client/:id` tanpa route | Route mandiri di `STANDALONE_ROUTES` |
| B3 | Role kustom tidak bisa melewati guard | `RequireAccess` / `RequireModule` berbasis modul RBAC |
| B4 | Approve pembayaran tanpa record kredit tidak menambah kredit | `VERIFY_PAYMENT_PROOF` membuat record baru |
| B5 (sebagian) | Nomor invoice bisa duplikat | `nextInvoiceNumber` berbasis nomor terbesar |
| — | Tidak ada test runner & lint | Vitest (`npm test`), ESLint + batas lapisan (`npm run lint`) |
| B5 (kode) | Kode `TDC-`/`ASM-` acak 4 karakter tanpa cek unik | 3 Okt 2026: kode client berurutan per grup (`nextClientCode`, tanpa bentrok) dan kode kuesioner dicek unik (`buildQuestionnaireCode`) |
| — | Form jadwal berulang: dropdown "Service" per hari menimpa `type` sesi dengan nilai layanan (mis. `b_ota`) | 3 Okt 2026: dropdown service dihapus (keputusan klien); `type` tetap `therapy` |
| — | Modal laporan portal ortu menampilkan teks placeholder palsu bila laporan kosong | 3 Okt 2026: View Report nonaktif bila laporan kosong; bagian kosong tampil "Belum diisi" |

## Masih terbuka
| # | Lokasi | Masalah | Dampak |
|---|---|---|---|
| N1 | Google Calendar (keputusan klien, fase paling akhir) | Belum dikerjakan: butuh OAuth Google + backend (tabel `google_calendar_integrations`, `schedules.google_event_id`) | Dikerjakan setelah backend siap; lihat [12-keputusan-klien.md](12-keputusan-klien.md) F8 |
| N2 | Auth demo | Password staf & OTP disimpan polos di localStorage (`staffUsers`, `passwordResets`); email OTP disimulasikan (kode tampil di layar) | Hanya untuk demo. Backend: hash password, OTP ter-hash + email nyata, throttle (`schema.md` §04-A, §10) |
| N3 | Hapus client (demo) | **Diputuskan 4 Okt 2026:** seluruh data client hilang dari semua modul (tanpa syarat revert). **Diubah 4 Okt 2026 (ADR 0005): hapus permanen dengan cascade**; tidak ada pemulihan selain backup | Selesai |
| N4 | Landing dua bahasa | Modal detail program yang sedang terbuka tidak ikut berganti bahasa sampai dibuka ulang; bio/artikel sudah diterjemahkan, nama orang & istilah teknis (SI, NDT) tetap | Minor |
| N5 | Frontend lama di browser | `staffUsers`/`rolesList`/`rbacPermissions` tersimpan dan tidak ikut reset `SEED_VERSION`; akun master memakai fallback (preset demo, default role) | Tombol Reset Demo Data / hapus localStorage bila perlu data bersih |
| N6 | Weekly Calendar belum dibatasi cabang | `CalendarPage` (Week Grid, Day Agenda) menampilkan sesi dan terapis semua cabang; hanya tampilan *Day All Therapist* yang memakai `inBranchScope(activeBranch)`. Dilaporkan 13 Okt 2026, belum diubah (di luar scope) | Samakan semua tampilan dengan `inBranchScope` bila disetujui; backend sudah dibatasi `BranchScope` |
| N7 | Hari libur (mode API) | Mode demo membatalkan sesi di tanggal libur (alasan `H`) saat libur ditambah; backend M3 (14 Okt 2026) baru menyimpan libur dan menghitung `affected_sessions`, pembatalan sesi dipasang Sprint 2 hari 2 | Sampai itu, di mode API sesi tetap `scheduled` pada tanggal libur; halaman Hari Libur menampilkan jumlah sesi terdampak (`affectedSessions`) agar dibatalkan manual |
| N8 | Kuesioner: opsi "Other:" | Pilihan ganda/checkbox belum punya opsi "Lainnya" berisian teks (form Google asli: soal 5, 30, 32, 34, 40, 45–47, 146) | Pakai opsi "Lainnya"/"Ya" + soal pendamping `free_text` opsional ("Jika Ya, sebutkan") |
| N9 | Kuesioner: dokumen Google & percabangan | (a) Dokumen section hanya tampil bila dibagikan "Siapa saja yang memiliki link"; `/preview` tak bisa dibuka di halaman tertentu (pecah jadi dua section/dokumen). (b) Belum ada skip logic antar-section dan belum ada pemetaan jawaban identitas (nama anak, tgl lahir, kontak ortu) ke data client | Layanan/BOT-A/FOT-A ditentukan lewat kategori + kode yang diterbitkan, bukan soal routing |
| I1 | Status invoice | Prototype hanya `unpaid`/`paid`; bukti terunggah tetap `unpaid` | Diselaraskan saat integrasi (lihat 10) |
| I2 | Bukti bayar | Disimpan dataURL di localStorage | Mudah melewati kuota ~5MB; fase API pakai upload multipart |

## Inkonsistensi data
- `clients[].serviceType` (legacy) dan `serviceTypes[]` berdampingan → selalu `getClientServiceIds()`.
- `schedules[].progressNote` duplikat `noteSection` (dijaga `buildReportPatch`).
- Invoice punya `proofUrl` dan `proofOfPaymentUrl` (duplikat).
- `credits.renewals` selalu `[]`.
- Alias konstanta `CLINICAL_SERVICES = ASSESSMENT_SERVICES = THERAPY_SERVICES = SESSION_TYPES = INTAKE_SERVICES`.
- `frontend/README.md` masih template Create React App.

## Code health
- `npm run lint`: 0 error, ±124 warning `no-unused-vars` (import/variabel sisa kode lama). Bersihkan saat file disentuh.
- File besar: `AssessmentFill.js` (~740 baris), `AppLayout.js` (~600), `CalendarPage.js` (~670), `DashboardRevenue.js` (~680), `ClientDashboard.js` (~650), `DashboardSchedule.js` (~650). Pecah ke sub-komponen saat disentuh.
- `migrateRawState` (`services/storage/localStore.js`) melakukan string-replace pada seluruh JSON tersimpan.
- `therapist` boleh masuk grup `/admin-inquiry` (untuk hasil asesmen) tanpa menu ke sana.
- `packageManager` menyebut yarn, repo memakai `package-lock.json` (npm).

## Repo hygiene
- Sisa Emergent: `backend/server.py`, `.emergent/`, `frontend/plugins/health-check/`, devDependency `@emergentbase/visual-edits`, folder `frontend/build/`.
- `docs/` sudah bersih (4 Okt 2026): file temp Office dan `generate_requirement.py` (generator `.docx`, tak direferensikan) dihapus. Sisa non-guide hanya `Therapedia_Final_Requirement_v1.0.docx` (dokumen bisnis, jangan diedit tanpa diminta).

## Catatan revisi 7 Okt 2026
- **Sesi cuti susulan di luar jendela hitung**: hari cuti yang dipotong dari saldo ditetapkan saat log dicatat (`countedStart–countedEnd` = sesi pertama–terakhir). Cuti di Finance hanya bisa bila ada sesi di rentang; sesi yang dijadwalkan belakangan lalu dibatalkan sebagai cuti dan jatuh di luar jendela itu **tidak menambah hari** (keputusan klien 7 Okt 2026: cukup mengikuti aturan "harus ada sesi pada rentang yang dipilih").
- **Saldo cuti data lama**: client tanpa `leaveGranted` (belum pernah membeli paket berjatah) memakai jatah bawaan 30 hari (`LEAVE_QUOTA_DAYS`).
- **Diperbaiki (di luar permintaan, tetapi satu fungsi dengan perubahan revenue)**: Dashboard Revenue sebelumnya memasukkan invoice `void` ke *Gross Invoiced* dan *Pending Settlements*; sekarang void keluar dari semua angka (`revenueMetrics`).
- **Refund & invoice pengganti**: invoice yang sudah direfund tidak bisa di-void maupun direfund lagi; paket yang direfund berstatus `voided` + `refunded` sehingga tidak muncul sebagai kandidat paket aktif.

## Seed demo saling tersambung (7 Okt 2026)
- **Satu seed untuk semua orang**: data demo ada di `frontend/src/data/*.seed.json` (+ `leaves.seed.json`) dan dibangun relatif ke hari ini oleh `seedLoader.js`; semua pengunjung (termasuk di Vercel) memulai dari data yang **sama**. Perubahan yang dibuat user tetap tersimpan **per browser** (localStorage) — belum ada data bersama antar orang sampai backend Laravel + MySQL jadi. `SEED_VERSION` (`data/seedRegistry.js`) dinaikkan setiap seed berubah agar browser lama memakai seed baru.
- **Keterkaitan antar modul dijaga test** `data/__tests__/seedIntegrity.test.js`: client ↔ sesi ↔ terapis ↔ cabang ↔ akun staf ↔ record kredit ↔ invoice ↔ kode kuesioner ↔ log cuti, status pipeline ↔ tanggal/alasan/sesi, saldo paket ↔ ledger, credit leave, discharge, dan utilisasi terapis. Ubah seed → test ini wajib tetap lolos.
- **Generator lama tertinggal**: `frontend/scripts/generate_demo_seed.py` belum memuat data baru (riwayat client discharged, paket konsultasi client done_consult, invoice assessment per kode + 1 kode gratis + 1 belum bayar, log cuti seed, `maxSessionsPerMonth` terapis). JANGAN dijalankan menimpa JSON sekarang; ubah JSON langsung (atau perbarui generator lebih dulu).
- Tidak ada contoh refund / void di seed (fitur ada dan teruji di unit test), jadi kartu Refund/void di Dashboard Revenue awalnya 0.

## Catatan revisi 8 Okt 2026
- **Kuesioner lama**: jawaban sebelum 8 Okt 2026 tidak punya `code`; `listQuestionnaireResults` memasangkannya ke kode sekategori yang sudah terisi. Sebelumnya jawaban kode kedua sekategori menimpa yang pertama (kini tidak lagi).

## Catatan deploy Docker (12 Okt 2026)
- **Dependency eksternal Emergent**: `frontend/package.json` (devDependencies) memuat `@emergentbase/visual-edits` dari `https://assets.emergent.sh/...` dan tidak dipakai kode mana pun. `npm ci` (Docker build & CI) mengunduhnya; bila URL itu mati, build image `web` dan job test-frontend gagal. Belum diubah (di luar scope); solusi: hapus dependency + perbarui `package-lock.json`.
- **`phpunit.xml` memaksa SQLite** (default Laravel). CI menimpa dengan env `DB_CONNECTION=mysql`, tetapi `make test` lokal tetap SQLite; skema nanti memakai fitur MySQL, ganti sebelum migration kompleks ditambahkan.

## Catatan template hasil section & penghapusan kuadran (17 Okt 2026)
- **Kuadran dihapus total**: master data kuadran, endpoint `/master/quadrants`, tabel `sensory_quadrants` / `assessment_quadrant_scores`, kolom `quadrant_code`, dan field `quadrant` di soal/jawaban/seed. Hasil asesmen hanya **skor mentah per section** (section ber-template). Database yang sudah terlanjur dimigrasi dibersihkan migration `2026_10_17_000200_drop_quadrant_structures`.
- **Seed Child Sensory Profile 2 (`cat-001`) belum sama dengan PDF**: seed punya 7 section (termasuk vestibular/proprioception), formulir PDF punya 9 (Auditori, Visual, Sentuhan, Gerakan, Posisi Tubuh, Sensori Oral, Tabiat, Sosial-Emosional, Atensional; 86 butir). Seed School Companion (`cat-002`) juga memakai butir contoh. Sinkronkan lewat Master Asesmen atau seed bila klinik ingin teks resmi. Contoh Toddler (`TDL`, 54 butir) sudah mengikuti PDF.
- Header tabel psikologi School Companion (nama guru, sekolah, kelas) belum ditampilkan karena data itu belum disimpan di client/jawaban.

## Catatan M5 backend (17 Okt 2026)
- Dokumen spek tidak konsisten soal nomor section (§7/§8) dan akses 5.2–5.5 (`inquiry_*` vs `assessment_master`); backend memakai `assessment_master` untuk tulis dan `assessment_master`/`inquiry_pipeline` untuk baca (sesuai rute `routes/api.php`).
- (Header School Companion: guru/sekolah/kelas kini tersimpan lewat Data Pengisi profil `teacher`, 17 Okt 2026.)
- File bukti transfer hanya bisa dilihat role Finance (tab Menunggu Pembayaran, mode API); admin inquiry hanya melihat jumlah unggahan di kartu invoice client. Di mode API baru invoice ASESMEN yang bisa ditandai lunas; invoice paket/cuti (aktivasi kredit), Semua Tagihan, void, refund, renewal, log invoice menunggu M7.
- (PDF section kini bisa diunggah dari dialog section di mode API; file yang dibekukan dipertahankan sampai kuesioner dikirim.) File beku dari kuesioner yang tidak pernah dikirim (draft ditinggalkan) tetap tersimpan sampai kode/client dihapus.
- Seed demo FE belum punya client dengan kode TDL; input tanggal di `/assessment` masih `<input type=date>` bawaan.
