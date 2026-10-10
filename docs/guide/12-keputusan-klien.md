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
| B7b | **Hapus di semua modul**: tombol delete hanya untuk role dengan `can_delete` (+ akses modul). **Hapus permanen dengan cascade** (4 Okt 2026, ADR 0005): hapus client/invoice/cabang menghapus semua data terkait; master ber-FK yang pernah dipakai tidak bisa dihapus. Aksi non-hapus mengikuti akses modul (Manager boleh edit, tidak lagi read-only) | ✅ | ✅ (client, invoice, sesi, kode kuesioner, master asesmen/layanan/alasan; hari libur hard delete). Staf: nonaktif |
| B8 | Pencarian client: awal nama, nama ortu, kode client | ✅ | ✅ `matchesClientSearch` |
| B9 | Form jadwal asesmen/terapi **tanpa pilih service** (diturunkan dari client) | ✅ | ✅ |
| — | Dokumen client = link Google Drive; tanpa kolom sumber client; form landing tetap ke WhatsApp; 1 client = 1 ortu | ✅ | ✅ |
| — | **Tanpa audit log** (diubah 3 Okt 2026, ADR 0004): semua modul memakai `created_by`/`updated_by`; hanya invoice punya log sendiri (`invoice_logs`) | ✅ | ✅ halaman & store audit dihapus; log invoice di tab Billing |
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
| F9b | Finance: **Void invoice lunas** (alasan wajib; kredit dipertahankan, hanya bila kredit belum dipakai — 7 Okt 2026, lihat R17) + **Refund** (R16) + **invoice pengganti** memakai ulang paket void; hapus invoice hanya untuk yang belum lunas (4 Okt 2026, ADR 0005) | ✅ | ✅ tab Semua Tagihan: Void/Refund; Buat Tagihan: pilihan pengganti |
| — | Master asesmen: tipe soal selengkap Google Form termasuk `birth_date`; Finance menerbitkan invoice assessment | ✅ | ✅ |

## C. Tafsir tim teknis yang perlu konfirmasi klien
- Grup kode client ditentukan dari huruf **pertama** nama.
- "Revert 1x" = satu langkah mundur per aksi (setelah revert tidak bisa revert lagi sampai ada aksi baru), bukan sekali seumur sesi.
- Pilihan potong/tidak hanya pada **cancel** (termasuk drop pending); reschedule/pending tidak memotong kredit. Cancel sesi asesmen: "potong" memotong paket aktif client (bila ada).
- Kode login ortu berurutan (mudah ditebak) → diamankan throttle/lockout (backend); tanggal lahir satu-satunya faktor kedua.
- **Hapus client (diputuskan 4 Okt 2026)**: seluruh data client hilang dari semua modul (client dihapus permanen, ADR 0005). Tanpa syarat revert sesi `completed`; sesi, invoice, riwayat kredit, jadwal, kuesioner, dan angka dashboard client itu tidak tampil lagi; invoice `paid` keluar dari omzet. Pemulihan client terhapus & data lama go-live (G1) dibahas setelah development selesai.
- Gating kuesioner (diubah 6 Okt 2026): invoice Assessment terbit **otomatis saat kode dibuat**; ortu wajib **upload bukti transfer** sebelum mengisi kuesioner (cukup terunggah, tidak menunggu lunas). Nominal otomatis = harga layanan (master paket) yang **dipilih admin saat generate kode** (wajib); Finance bisa melihat bukti upload di Menunggu Pembayaran & Semua Tagihan.
- Renewal **langsung lunas** (4 Okt 2026, permintaan tim): wajib alasan (teks bebas) + justifikasi (min. 10 karakter). Alasan berupa string, bukan enum, jadi tidak perlu daftar kategori.
- Invoice yang pernah dikonversi diberi badge **Dikonversi** di Semua Tagihan (diturunkan dari log, tanpa kolom baru); tetap 1 invoice.
- **Retensi & backup (F1)**: rencana backup arsip berkala **tiap 6 bulan atau 1 tahun** (di samping backup harian); tanpa hapus permanen otomatis. Interval final dan lama simpan minimum menunggu keputusan klien/regulasi.
- Kode demo `TDC-1009` kini `AE-00006`; kode kuesioner seed lama `ASM-xxxx` tetap valid (`SEED_VERSION` = `demo-2026-10-v8`).

Sumber utama: `pertanyaan_klien.md`, `schema.md` §04–§06, `technical_workflow.md` (F1–F28), ADR `docs/adr/0002-hak-akses-modul-hapus-per-role-dan-audit-terbatas.md` (butir audit digantikan ADR 0004), `docs/adr/0003-…`, `docs/adr/0004-hapus-audit-log.md`.

## Revisi lanjutan (5 Okt 2026) — status frontend
| Revisi | Status |
|---|---|
| Catatan Finance wajib saat konversi paket (tampil di log invoice) | Selesai: `ConvertPackageDialog`, `creditsStore` `CONVERT_PACKAGE` |
| Akun semua role (termasuk terapis & role kustom) bisa **Akses semua cabang** (User Management) | Selesai: `allBranches`, `hasAllBranchAccess` |
| Combobox pencarian client (nama/ortu/kode) seragam | Selesai: `shared/components/ClientCombobox.js` (Create Invoice, Renewal, Jadwal, Generate Kode, Dashboard Schedule, portal terapis) |
| Riwayat sesi: alasan cancel + kolom Catatan yang bisa ditimpa | Selesai: `ActiveClientDetail` (`historyNote`) |
| Monitoring laporan per client di detail client | Selesai: `ClientReportMonitoringCard` |
| Tombol edit di data master | Selesai: paket master (Finance), hari libur, akun staff (+ yang sudah ada: layanan, kuadran, alasan, asesmen, cabang, role) |
| Tanpa upload bukti ortu; Finance langsung lunas (renewal & create invoice paket pertama) | Selesai |
| Portal ortu tidak menampilkan kode kuesioner | Selesai |
| Status sesi **Off** (OL/S/SCA/MCU/FM/TI/H/manual; potong kredit atau tidak pilihan admin) + alasan Off di Master Data Layanan | **Digabung dengan Cancel (7 Okt 2026, R18)**: satu status `cancelled`, satu daftar alasan Cancel / Off |
| Riwayat sesi: nama paket tanpa "(10x)"; konversi mengubah nama paket di invoice (log tetap memuat paket asal) + pratinjau paket client sebelum → sesudah | Selesai. Layanan client (BOT-A/FOT-A/dst) **tidak** diubah: tidak ada relasi paket Regular/Senior ke layanan intake di data |
| Finance: modul **Log Kredit & Saldo** per client dalam rupiah (sesi completed mengurangi saldo sebesar harga per sesi) | Selesai: tab `ledger` di `/finance`, `domain/creditLedger.js`. Kolom "Oleh" pada contoh Excel belum ada karena ledger tidak mencatat pelaku per sesi |
| Master melihat semua modul; role lain mengikuti RBAC (menu + akses halaman); kolom **Oleh** di Log Kredit & Saldo (`history[].by`) | Selesai: `guards.js`, `navConfig.js`, `useActingTherapist`; test `navConfig.test.js` |
| Data dummy log kredit & saldo sinkron dengan jadwal, top up/renewal, dan penjadwalan baru | Selesai: `reconcileDemoCredits`, baris Terjadwal di ledger, `SEED_VERSION` v10 |

## Revisi 6 Okt 2026
| # | Permintaan | Status FE |
|---|---|---|
| R1 | Generate kode kuesioner otomatis membuat invoice assessment; ortu wajib upload bukti transfer sebelum isi kuesioner | ✅ |
| R2 | Hapus menu Perlu Renewal di Advanced Analytics Active Client | ✅ |
| R3 | Finance: tab baru Perlu Renewal (kredit < 3) + tombol Add Renewal (invoice paket sama → Menunggu Pembayaran) | ✅ |
| R4 | Finance: Log Kredit & Saldo per paket (1 baris = 1 paket + 1 client) | ✅ |
| R5 | Log Kredit: kolom Catatan (= catatan sesi di detail client), bisa diedit semua peran termasuk Finance, tampil juga di detail sesi kalender | ✅ |

Dikonfirmasi klien: batas renewal "kurang dari 3" dihitung dari **total** sisa kredit semua paket client aktif (sudah benar).

Tambahan 6 Okt 2026: generate kode wajib memilih layanan (master paket) → harganya jadi nominal invoice assessment; Finance bisa melihat bukti upload assessment.

Tambahan 6 Okt 2026 (3): setelah generate, admin mendapat tautan kuesioner (`/assessment?code=XXX`) yang membuka kuesioner dengan kode terisi otomatis; bisa dikirim sebagai kode atau tautan.

Tambahan 6 Okt 2026 (2): Finance bisa upload bukti manual per invoice (yang belum punya bukti) dan mengganti bukti yang sudah ada (re-upload/replace).

## Revisi 6 Okt 2026 (lanjutan)
| # | Permintaan | Status FE |
|---|---|---|
| R6 | Admin Schedule: ganti / hapus jadwal recurring (per hari atau ganti keseluruhan) dari detail client dan list Active Client; sesi lama yang tersambung otomatis terhapus dan terganti jadwal baru | ✅ |

Tafsir: hanya sesi `scheduled` (belum disentuh) pada pola lama yang diganti; sesi yang sudah selesai/dibatalkan/dipindah dibiarkan. Mengganti pola cukup akses modul; hapus rutin permanen hanya role `canDelete`.

| # | Permintaan | Status FE |
|---|---|---|
| R7 | Schedule: Off/cuti bisa langsung menerbitkan invoice cuti (opsional) — **dibatalkan 7 Okt 2026 (R19)**; diganti R26 (Finance yang menerbitkan) | ↩︎ |

| # | Permintaan | Status FE |
|---|---|---|
| R8 | Portal ortu: riwayat invoice anak untuk tracking pembayaran — **dibatalkan 7 Okt 2026 (R15: Riwayat Invoice dihapus)** | ↩︎ |

## Revisi 7 Okt 2026 — Cuti client
| # | Keputusan / permintaan | Schema | FE |
|---|---|---|---|
| R9 | **Jatah cuti 30 hari per tahun kalender per client.** Finance mencatat cuti sebagai rentang tanggal (log berdiri sendiri, tab **Cuti** di `/finance`); sesi terapi terjadwal di rentang jadi **Off** (cuti = Off, tanpa status baru). **Satuan jatah = per sesi ("hari sesi")**: tanggal unik sesi Off-cuti (dari log Finance atau Off manual yang dipilih admin "Hitung sebagai cuti"), bukan panjang rentang; rentang hanya penampung (cuti tanpa sesi belum memakai jatah; dua sesi di hari sama = 1; cuti lintas tahun terpecah mengikuti tanggal sesi). Asumsi tim teknis: "30 hari" = 30 tanggal sesi (bukan 30 pertemuan) — konfirmasi klien | ✅ `client_leaves`, `schedules.leave_id/counts_as_leave`, §6.8 | ✅ `domain/leave.js`, `leavesStore`, `useLeaveActions`, tab Cuti, `LeaveQuotaCard` |
| R9b | **Anak masuk lebih awal → akhiri/void cuti**: sisa sesi kembali **`scheduled`** (jadwal aktif) sehingga hari sesinya kembali ke jatah (tidak terbuang); slot terisi dilewati dan dilaporkan | ✅ | ✅ `endLeaveEarly` / `voidLeave` |
| R9c | Jatah lewat 30 hari **tidak diblokir**: admin tetap bisa memilih opsi cuti dan potong kredit (hanya peringatan). **Kredit tetap keputusan admin/Finance** (potong atau tidak, wajib dipilih), tidak otomatis. Off manual **boleh memakai jatah atau tidak** (switch) agar fleksibel | ✅ | ✅ |
| R9d | **Jadwal di masa cuti**: Admin Schedule **tidak bisa** menambah jadwal aktif di tanggal cuti (diblokir + peringatan); Finance harus **menyelesaikan cuti lebih awal** dulu (7 Okt 2026). Jadwal berulang / ganti rutin melewati tanggal cuti seperti hari libur | ✅ (422 `client_on_leave`, §6.8 butir 6) | ✅ |
| — | Tafsir tim teknis (konfirmasi klien): Off alasan lain (Sick/MCU/Holiday) tidak memakai jatah kecuali switch dinyalakan; hanya sesi **terapi** yang otomatis jadi Off saat cuti dicatat (asesmen/konsultasi tidak disentuh); invoice cuti (`type = leave`) tetap terpisah dan tidak terhubung ke log cuti | — | — |

## Revisi 7 Okt 2026 (lanjutan) — cuti per paket, dashboard, refund
| # | Permintaan | Schema | FE |
|---|---|---|---|
| R10 | **Cuti range Finance**: hitung dari **sesi terapi pertama sampai terakhir** di rentang (rentang 07–14 Okt, sesi 08 & 12 Okt → **5 hari**); Finance **hanya bisa** input cuti bila client punya jadwal di rentang. Cuti satuan dari kalender tidak berubah | ✅ `client_leaves.counted_start/end` | ✅ `planLeave` |
| R11 | ~~Notify Finance + catatan~~ — **dihapus (R19)**: cuti hanya dari Finance dan harus ada jadwal pada rentang | ↩︎ |
| R12 | **Credit leave per paket** di master paket + flag **satuan** & **asesmen**. Paket satuan: credit leave **tidak reset otomatis** → tombol **Reset credit leave** saat renewal Finance; **total credit leave juga disimpan di client**. Dipakai saat Cancel / Off: pilihan potong memakai credit leave paket dulu | ✅ `master_packages.leave_quota`, `client_packages.leave_total/used`, `clients.leave_credit_balance`, `invoices.reset_leave` | ✅ |
| R13 | Dashboard Inquiry: **Total Discharge** + **report per alasan** | ✅ (turunan) | ✅ |
| R14 | **Availability & Utilization Rate** per terapis dan cabang. Perhitungan (revisi): **jumlah sesi terjadwal ÷ maks sesi per bulan** (1 sesi = 1 jam); yang diisi per terapis **total jam/sesi sebulan**, bukan jam kerja per hari; kapasitas ikut **disesuaikan dengan filter periode** | ✅ `users.max_sessions_per_month` | ✅ `/admin-schedule/therapist-utilization` |
| R14b | Terapis boleh **melihat kalender terapis lain** (read-only, halaman terpisah, nama client boleh tampil). **Tampilan Hari = satu kalender berisi semua terapis; tampilan Minggu = per terapis saja** agar tidak terlalu banyak | — | ✅ `/therapist/team-calendar` |
| R14c | Active Client: **Re-assessment** (terbitkan kode) + Admin Schedule bisa **menjadwalkan asesmen tanpa potong kredit** seperti di Inquiry | — | ✅ `ReassessmentCard` |
| R15 | Portal ortu: **hapus Riwayat Invoice** | — | ✅ |
| R16 | **Refund** di Finance: bagian invoice yang kreditnya sudah terpakai tetap **Verified Revenue**; yang direfund tetap masuk **Gross Revenue**. Nominal bisa otomatis atau diatur manual oleh Finance | ✅ `invoices.refund_*`, ledger `refund` | ✅ |
| R17 | **Void**: tidak ada lagi pilihan cabut sisa kredit; hanya void invoice dengan kredit dipertahankan, dan **hanya untuk invoice yang kreditnya belum dipakai** | ✅ | ✅ |
| — | Keputusan klien 7 Okt 2026: saldo cuti bawaan **30 hari** untuk client lama (tanpa paket berjatah) tidak masalah; Dashboard Revenue mengikuti aturan asli: invoice void tidak dimasukkan; refund tetap di Gross tetapi hanya yang benar-benar masuk menjadi Verified Revenue | | |

## Revisi 7 Okt 2026 (batch 2)
| # | Permintaan | Schema | FE |
|---|---|---|---|
| R18 | **Cancel dan Off digabung** (hanya beda alasan): satu aksi *Cancel / Off Sesi*, satu status `cancelled`, **satu daftar alasan** di Master Data (tab *Alasan Cancel / Off*, gabungan alasan cancel + OL/S/SCA/MCU/FM/TI/H) | ✅ `schedules.status` tanpa `off`; `off_reasons`/`off_reason` dihapus | ✅ |
| R19 | **Cuti hanya dari Finance** dan harus ada sesi pada rentang yang dipilih. Dihapus: Notify Finance, invoice cuti dari Admin Schedule, switch "Hitung sebagai cuti" (Off manual), dan **tombol Hapus log cuti** di Finance (hanya Void / Akhiri Lebih Awal) | ✅ `counts_as_leave`, `notify_note` dihapus | ✅ |
| R20 | **Kode asesmen**: saat generate pilih **masuk invoice atau tidak** (mis. *School Companion* gratis → tanpa invoice dan tanpa form bayar) | ✅ `assessment_access_codes.invoice_required` | ✅ Inquiry, Master Asesmen, Re-assessment |
| R21 | Modul terapis: **rekap harian sesi completed** dengan filter periode (custom range) seperti filter lain, contoh "Kamis 25 Oktober • 3 Hours • daftar client", untuk report terapis | — (turunan) | ✅ Summary & Laporan Sesi → tab *Rekap Harian* |

## Revisi 7 Okt 2026 (batch 3) — cuti tahunan & detail
| # | Permintaan | Schema | FE |
|---|---|---|---|
| R22 | **Cuti 30 hari per tahun per client; sisa hangus.** Tombol **Reset Cuti Tahunan** (Finance, awal tahun): hanguskan seluruh cuti tersisa dan reset semua client jadi 30. Jatah per paket di master hanya menambah (bawaan 0) | ✅ `clients.leave_granted` dasar 30, `leave_resets` | ✅ |
| R23 | Form Catat Cuti: **hilangkan "Kredit sesi"** — cuti otomatis memotong saldo cuti (30 hari/tahun), bukan kredit sesi | ✅ | ✅ |
| R24 | Tombol **Detail** di log cuti (riwayat pengajuan, selesai lebih awal, void). **Void ≠ hapus**: void mempertahankan log; hapus sudah dihilangkan | ✅ `returned_at/by`, `client_leave_sessions` | ✅ |
| R25 | **Dua jatah berbeda** (klarifikasi 7 Okt 2026): (1) **cuti 30 hari/tahun** per client — hanya Finance yang menambah/mereset; (2) **credit leave per paket** — dipakai saat Cancel / Off dengan pilihan potong (yang dipotong credit leave paket, bukan kredit sesi; habis baru kredit sesi). Kuota cancel 3x per paket **diganti** credit leave | ✅ | ✅ |
| R26 | **Finance bisa menerbitkan invoice cuti** (nominal manual, tanpa efek kredit) dan **opsional menyambungkannya ke log cuti** yang sudah dibuat (tab Cuti: kolom Invoice Cuti + tombol Terbitkan Invoice; Detail cuti menampilkan invoice terkait) | ✅ `invoices.leave_id` | ✅ |
| R27 | **Alasan Cancel / Off memakai CODE** (7 Okt 2026): tiap alasan di Master Data punya KODE (S, OL, SCA, …); yang disimpan/dikirim saat submit adalah KODE (teks "Lainnya" tetap boleh); riwayat & detail sesi di semua modul menampilkan KODE (nama panjang = tooltip) | ✅ `cancelReasonCode`, `ReasonListTab codeMode`, seed v16 | ⏳ `schema.md` `cancel_reasons`: kolom `code` jadi kunci tampil (perlu lewat skill `database-design`) |
| R28 | **Admin Schedule bisa menjadwalkan Asesmen / Re-assessment langsung dari kalender** (toggle *Jenis Sesi* di `AddScheduleModal`), membantu Admin Inquiry; sesi asesmen tanpa kuota kredit dan memajukan pipeline ke `assessment_scheduled` | ✅ | ✅ (`schedules.type = assessment`) |

## Revisi 10 Okt 2026
| # | Permintaan | Schema | FE |
|---|---|---|---|
| R29 | Hari libur boleh diinput **berentang tanggal** (Dari – Sampai); disimpan satu baris per tanggal, aturan libur lain tidak berubah | — (tabel `holidays` tetap) | ✅ |
| R30 | **Master Therapist Off** (daftar alasan ber-CODE) + **Cancellation Rate** keseluruhan dan **Therapist Off Rate** di Schedule Dashboard; cancel Therapist Off tetap dihitung di rate keseluruhan | ✅ `cancel_reasons.is_therapist_off`, view `v_daily_sessions` (`sessions_cancel_counted`, `sessions_cancel_therapist_off`) | ✅ |

