# 06 — Flow Finance (Invoice, Bukti Bayar, Renewal)

> Keputusan klien 3 Okt 2026 yang menyentuh dokumen ini sudah diimplementasi di frontend; register keputusan + status: [12-keputusan-klien.md](12-keputusan-klien.md).

## Tujuan & role
Menerbitkan tagihan (jenis **Paket Sesi** atau **Assessment**), menerima bukti transfer dari orang tua, memverifikasinya, dan menambah kredit sesi client (Paket Sesi).
Role dengan akses modul `finance` (Finance, Master): void, renewal langsung, dan koreksi saldo = aksi modul finance. **Orang tua** mengunggah bukti di `/client`. Admin Inquiry melihat invoice di Client Detail (read-only).

## Alur utama

```mermaid
sequenceDiagram
  participant F as Finance (/finance)
  participant P as Ortu (/client)
  participant C as creditsStore
  F->>C: issueInvoice({ type: package | assessment }) → invoice status "unpaid"
  P->>C: uploadPaymentProof() → proofUrl (dataURL), fileName/type/size
  F->>C: verifyPaymentProof(status "paid", creditsToAdd)
  C-->>C: invoice paid; jenis Paket Sesi → paket baru di records[].packages (+N kredit dari SNAPSHOT invoice, history "renewed"); jenis Assessment → hanya lunas (membuka kuesioner ortu)
  Note over F,C: Reject = verifyPaymentProof(status "unpaid") → invoice tetap unpaid, kredit tidak berubah
```
Jalur pintas: **Renewal langsung** (`renewClientCredit`) membuat invoice `paid` dan paket kredit sekaligus, tanpa langkah upload/verifikasi. Dipakai untuk pembayaran yang sudah diterima di kasir.

## Layar: `/finance`
`features/finance/pages/FinancePortal.js` dengan 4 tab di `features/finance/components/`:

| Tab | Komponen | Isi / aksi |
|---|---|---|
| `verification` | `VerificationTab.js` | Antrean semua invoice yang belum `paid` (`pendingInvoices`, dengan atau tanpa bukti). Lihat bukti (`shared/components/PaymentProofViewerModal.js`, mendukung gambar/PDF), lalu Approve (`handleApprovePayment`) atau Reject (`handleRejectPayment`) |
| `billing` | `BillingTab.js` + `CreateInvoiceDialog.js` + `RenewalDialog.js` | Daftar invoice (badge jenis). Terbitkan invoice: pilih **jenis** Paket Sesi (pilih paket) atau Assessment (nominal bebas, tanpa paket) → `issueInvoice`. Renewal langsung (`renewClientCredit`). Tombol hapus invoice (juga di antrean `verification`; hanya role `canDelete`, soft delete + log invoice `deleted`). Kolom **Aksi**: **Log** (`InvoiceLogDialog`, log milik invoice) dan **Konversi** (`ConvertPackageDialog`, hanya invoice paket lunas yang paketnya masih punya sisa sesi) |
| `history` | `HistoryTab.js` | Gabungan semua `records[].history` dari semua client, diurutkan berdasarkan tanggal, dengan pagination 10 |
| `packages` | `PackagesTab.js` + `NewPackageDialog.js` | Master paket (`masterPackages`). Tambah paket (`addMasterPackage`) dengan **kode paket** (`invoiceCode`, unik, `ASM` dicadangkan) untuk nomor invoice. **Belum ada** edit/hapus |

## Upload bukti (ortu): `/client`
`features/parent/pages/ClientDashboard.js` → `handleUploadSubmit`
- Target: invoice **Paket Sesi** terbaru (banner tagihan) atau invoice **Assessment** yang belum lunas (kartu Kuesioner Asesmen, `uploadInvoiceId`). Jika belum ada invoice → error toast.
- Aturan klien (`domain/credit.js`): **JPG/PNG/PDF maks 5 MB** (`validateProofFile`, dipakai `processProofFile`), **upload sekali + re-upload maks 3x** (total `MAX_PROOF_UPLOADS = 4`; `proofUploadCount`, `canUploadProof`, tombol menampilkan sisa kesempatan). Gambar dikompres (`compressImage`), PDF dibaca sebagai dataURL.
- Disimpan sebagai **dataURL di localStorage** (`proofUrl`). Batasan demo; di backend file ke storage privat (lihat 10).

## Aturan bisnis
- **Jenis invoice**: `package` (Paket Sesi) dan `assessment` (`invoiceType(inv)`; invoice lama tanpa `type` = paket). Tanpa diskon manual, DP, cicilan, refund, dan jatuh tempo (satu-satunya pengurang nominal = saldo lebihan konversi) (pengingat tagihan manual lewat WhatsApp oleh admin).
- Nomor invoice: `nextInvoiceNumber(invoices, { typeCode, now })` → **`INV-{KODE}-{YYYYMMDD}-{NNN}`**; KODE = `ASM` untuk assessment, `invoiceCode` master paket untuk paket (`packageInvoiceCode`); increment reset harian per kode (mis. `INV-REG-20261003-001`). Nomor lama (`INV-yyyy-xxx`) tetap valid.
- **Snapshot**: invoice menyimpan `credits`, `amount`, `packageName` saat terbit; paket kredit menyimpan `price`. Mengubah harga master paket tidak memengaruhi invoice/paket yang sudah ada. Kredit yang ditambah saat approve = `invoice.credits` (master hanya cadangan untuk invoice lama tanpa snapshot, fallback 10).
- Setiap approve/renewal paket **menambah paket baru** (`newClientPackage` + `applyPackageAdded`), bukan menambah ke paket lama. Sisa kredit total = jumlah semua paket. Invoice **assessment** tidak membuat paket/kredit.
- **Gating kuesioner**: selama client punya invoice assessment yang belum `paid` (`hasPendingAssessmentInvoice`), ortu tidak bisa membuka kuesioner (portal ortu mengunci tombol, `/assessment` menolak kode; lihat 04/07).
- Jika client belum punya record kredit, `VERIFY_PAYMENT_PROOF` maupun `RENEW_CREDIT` membuat record baru (`newCreditRecord`), jadi pembayaran paket yang disetujui selalu menghasilkan kredit.
- Status invoice di prototype hanya `unpaid` | `paid` (label di `STATUS_META`). Backend v2 memakai `unpaid → pending_verification → paid | rejected | void` (lihat `schema.md` 04-F & 08.2).
- Nama paket dinormalisasi via `formatPackageName` (legacy "Paket Reguler/VIP" → "Regular/Senior Therapist").
- Metode bayar = teks bebas (renewal tunai oleh Finance). Void/renewal/koreksi saldo mengikuti akses modul `finance`.

## Konversi paket (Finance)
Contoh: sisa sesi paket **Senior** dikonversi ke **Regular**. Dari tab `billing` → tombol **Konversi** pada invoice paket lunas. Hook use-case: `features/finance/hooks/usePackageConversionActions.js` (store kredit + jadwal).
- **Yang dikonversi = paket kredit client**, bukan invoice. Nominal invoice asal tidak berubah; invoice hanya mendapat baris log `converted`.
- **Otomatis (default)**: `nilai sisa = sisa sesi × (harga bayar paket asal ÷ total kredit)`; `sesi baru = floor(nilai sisa ÷ harga per sesi paket tujuan)`; `lebihan = nilai sisa − sesi baru × harga per sesi tujuan` (`computePackageConversion`).
- **Manual**: Finance mengisi jumlah sesi, **alasan wajib**. Jumlah sesi **tidak boleh melebihi** hasil otomatis (tidak boleh ada kekurangan bayar); boleh lebih sedikit (lebihan membesar). Konversi ke paket yang nilainya tidak cukup untuk 1 sesi ditolak.
- **Lebihan = saldo rupiah client** (`credits.records[].balance`). Otomatis mengurangi nominal invoice **paket** berikutnya (terbit invoice atau renewal langsung): `amount = grossAmount − balanceApplied`, tercatat log `balance_applied`; dialog menampilkan `BalanceHint`. Saldo hanya memotong sampai nominal invoice (sisanya tetap). Invoice yang **belum lunas** lalu dihapus mengembalikan saldonya (`balance_restored`). Paket dari invoice itu memakai harga **gross** sebagai nilai paket.
- **Kuota cancel (penalti) ikut pindah** dari paket lama ke paket baru (`cancelCount` disalin).
- **Semua jadwal terapi mendatang client dihapus** (`scheduled`/`reschedule_pending`, soft delete) agar admin schedule menjadwalkan ulang sesuai paket & terapis baru; sesi riwayat (completed/cancelled/rescheduled) dan asesmen tidak disentuh. Dialog menampilkan jumlah jadwal yang akan terhapus.
- Ledger: `converted_out` (−sisa, paket lama berstatus `converted`) + `converted_in` (+sesi, paket baru) berbagi `conversionId` (tab Riwayat: "Konversi Keluar/Masuk"). Paket hasil konversi tidak punya `invoiceId` sendiri tetapi tetap bisa dikonversi lagi dari invoice asal (`resolveInvoicePackage` mengikuti rantai `convertedToId`).
- **Tanpa revert** (jadwal yang dihapus tidak dipulihkan otomatis); koreksi lewat konversi ulang / penyesuaian manual.
- Jejak: log invoice `converted` + `package_conversions` + ledger; jadwal yang dihapus menyimpan `deletedBy`. Akses: modul `finance` (bukan `canDelete`).

## Log invoice
Setiap invoice punya **log sendiri** (`invoice.logs`, append-only, `appendInvoiceLog`) — satu-satunya jejak per invoice (tidak ada audit log). Diisi reducer `creditsStore` pada: terbit (`issued`), upload bukti (`proof_uploaded`), verifikasi (`verified`/`rejected`), renewal langsung (`renewal_paid`), pemakaian/pengembalian saldo, konversi (`converted`, memuat mode, alasan, sisa, sesi baru, lebihan), dan hapus (`deleted`). Tampil di tombol **Log** (terbaru di atas). Invoice dari seed lama tanpa log menampilkan baris dasar (terbit, lunas).

## Revenue
`features/master/pages/DashboardRevenue.js` (Master: `/master/revenue`, Manager: `/manager/revenue`) menghitung omzet dari `invoices` berstatus `paid` per cabang/periode (lihat 07).

## File terkait
`frontend/src/features/finance/pages/`, `frontend/src/stores/creditsStore.js`, `frontend/src/shared/lib/fileUpload.js`, `frontend/src/shared/components/PaymentProofViewerModal.js`, `frontend/src/features/parent/pages/ClientDashboard.js`
