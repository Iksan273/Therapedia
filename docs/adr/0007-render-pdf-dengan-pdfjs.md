# ADR 0007: Render dokumen PDF sendiri dengan pdf.js

- Status: Diterima (uji coba, 16 Okt 2026)
- Konteks: dokumen section kuesioner (mis. kesepakatan) ditampilkan lewat iframe Google Docs/Drive. Di HP tampilannya
  "ter-zoom" (Docs me-reflow, font judul besar, tabel sempit) dan viewer Drive tidak bisa di-scroll sampai halaman akhir.
  PDF di `<iframe>` browser juga tidak andal di HP (iOS hanya halaman pertama, Android mengunduh).
- Keputusan: tambah dependency `pdfjs-dist` (4.10.38, kompatibel Node 20). PDF disimpan di aplikasi
  (`frontend/public/documents/*.pdf`, link `/documents/nama.pdf`) dan dirender per halaman ke `<canvas>` selebar kontainer
  oleh `shared/components/PdfViewer.js`. Mengalir di halaman biasa (tanpa scroll bersarang), scroll & pinch-zoom normal.
  Dimuat lazy (dynamic import) sehingga bundel utama tidak membesar.
- Batasan: hanya path same-origin `/documents/*.pdf` (`isLocalPdfUrl`, `domain/assessment.js`); URL PDF luar ditolak
  (CORS + keamanan). Link Google tetap didukung.
- **Arah backend (disepakati 16 Okt 2026, detail dibahas saat M5)**: admin mengunggah PDF per section; file disimpan di
  **storage privat** server (bukan `public/`), path-nya disimpan di DB (`assessment_sections.document_path`, + `document_name`,
  `document_size`; saling eksklusif dengan `document_url`). File hanya dilayani lewat endpoint ber-otorisasi (staf
  `assessment_master`; ortu lewat kode kuesioner), lalu dirender `PdfViewer`. File ikut dihapus sinkron setelah commit saat
  diganti/dihapus, dan ikut backup arsip. Spesifikasi: `schema.md` (`assessment_sections`), `implementation_detail.md` §7.1 (5.4a–5.4c),
  `docs/guide/10-api-migration.md`. Catatan: `implementation_detail.md` 4.8 ("dokumen = link saja") hanya untuk `client_documents`
  (folder Drive klien) dan tidak berubah.
- Implementasi penyimpanan memakai **Laravel Storage** (`Storage::disk('local')`, `storage/app/private`); disk dapat diganti lewat config tanpa ubah kode. Di Docker, `storage/app/private` harus berada di **volume persisten** dan ikut backup (`docs/guide/13-docker-deploy.md`).
- Belum diputuskan (M5): batas ukuran final, apakah ortu masih boleh membuka dokumen setelah kode `submitted`, versi dokumen
  (apakah jawaban perlu mengikat ke versi file yang disetujui), dan migrasi `lead_text → description` bersamaan dengan kolom baru.
