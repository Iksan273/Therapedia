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
| `billing` | `BillingTab.js` + `CreateInvoiceDialog.js` + `RenewalDialog.js` | Daftar invoice (badge jenis). Terbitkan invoice: pilih **jenis** Paket Sesi (pilih paket) atau Assessment (nominal bebas, tanpa paket) → `issueInvoice`. Renewal langsung (`renewClientCredit`). Tombol hapus invoice (juga di antrean `verification`; hanya role `canDelete`, soft delete + audit `invoice.deleted`) |
| `history` | `HistoryTab.js` | Gabungan semua `records[].history` dari semua client, diurutkan berdasarkan tanggal, dengan pagination 10 |
| `packages` | `PackagesTab.js` + `NewPackageDialog.js` | Master paket (`masterPackages`). Tambah paket (`addMasterPackage`) dengan **kode paket** (`invoiceCode`, unik, `ASM` dicadangkan) untuk nomor invoice. **Belum ada** edit/hapus |

## Upload bukti (ortu): `/client`
`features/parent/pages/ClientDashboard.js` → `handleUploadSubmit`
- Target: invoice **Paket Sesi** terbaru (banner tagihan) atau invoice **Assessment** yang belum lunas (kartu Kuesioner Asesmen, `uploadInvoiceId`). Jika belum ada invoice → error toast.
- Aturan klien (`domain/credit.js`): **JPG/PNG/PDF maks 5 MB** (`validateProofFile`, dipakai `processProofFile`), **upload sekali + re-upload maks 3x** (total `MAX_PROOF_UPLOADS = 4`; `proofUploadCount`, `canUploadProof`, tombol menampilkan sisa kesempatan). Gambar dikompres (`compressImage`), PDF dibaca sebagai dataURL.
- Disimpan sebagai **dataURL di localStorage** (`proofUrl`). Batasan demo; di backend file ke storage privat (lihat 10).

## Aturan bisnis
- **Jenis invoice**: `package` (Paket Sesi) dan `assessment` (`invoiceType(inv)`; invoice lama tanpa `type` = paket). Tanpa diskon, DP, cicilan, refund, dan jatuh tempo (pengingat tagihan manual lewat WhatsApp oleh admin).
- Nomor invoice: `nextInvoiceNumber(invoices, { typeCode, now })` → **`INV-{KODE}-{YYYYMMDD}-{NNN}`**; KODE = `ASM` untuk assessment, `invoiceCode` master paket untuk paket (`packageInvoiceCode`); increment reset harian per kode (mis. `INV-REG-20261003-001`). Nomor lama (`INV-yyyy-xxx`) tetap valid.
- **Snapshot**: invoice menyimpan `credits`, `amount`, `packageName` saat terbit; paket kredit menyimpan `price`. Mengubah harga master paket tidak memengaruhi invoice/paket yang sudah ada. Kredit yang ditambah saat approve = `invoice.credits` (master hanya cadangan untuk invoice lama tanpa snapshot, fallback 10).
- Setiap approve/renewal paket **menambah paket baru** (`newClientPackage` + `applyPackageAdded`), bukan menambah ke paket lama. Sisa kredit total = jumlah semua paket. Invoice **assessment** tidak membuat paket/kredit.
- **Gating kuesioner**: selama client punya invoice assessment yang belum `paid` (`hasPendingAssessmentInvoice`), ortu tidak bisa membuka kuesioner (portal ortu mengunci tombol, `/assessment` menolak kode; lihat 04/07).
- Jika client belum punya record kredit, `VERIFY_PAYMENT_PROOF` maupun `RENEW_CREDIT` membuat record baru (`newCreditRecord`), jadi pembayaran paket yang disetujui selalu menghasilkan kredit.
- Status invoice di prototype hanya `unpaid` | `paid` (label di `STATUS_META`). Backend v2 memakai `unpaid → pending_verification → paid | rejected | void` (lihat `schema.md` 04-F & 08.2).
- Nama paket dinormalisasi via `formatPackageName` (legacy "Paket Reguler/VIP" → "Regular/Senior Therapist").
- Metode bayar = teks bebas (renewal tunai oleh Finance). Void/renewal/koreksi saldo mengikuti akses modul `finance`.

## Revenue
`features/master/pages/DashboardRevenue.js` (Master: `/master/revenue`, Manager: `/manager/revenue`) menghitung omzet dari `invoices` berstatus `paid` per cabang/periode (lihat 07).

## File terkait
`frontend/src/features/finance/pages/`, `frontend/src/stores/creditsStore.js`, `frontend/src/shared/lib/fileUpload.js`, `frontend/src/shared/components/PaymentProofViewerModal.js`, `frontend/src/features/parent/pages/ClientDashboard.js`
