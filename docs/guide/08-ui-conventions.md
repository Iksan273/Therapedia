# 08 — Konvensi UI

## Design tokens (sumber kebenaran: `frontend/src/index.css` + `frontend/tailwind.config.js`)
- **Primary: `#007AFF`** (Therapedia Royal Blue).
- CSS vars brand: `--color-primary`, `--color-primary-dark`, `--color-primary-light`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-surface`, `--color-success|warning|danger|info` (+ `-light`).
- Token shadcn (HSL): `--primary`, `--background`, `--muted`, `--accent`, `--destructive`, `--ring`, `--chart-1..5`, `--radius: 0.75rem`.
- Tailwind: palet `sky` di-override ke biru brand (`sky-500/600 = #007AFF`), `brand.*`, `surface`, shadow `shadow-clinical`, `shadow-clinical-hover`, `shadow-clinical-lg`.
- Font: **Plus Jakarta Sans** → Poppins → system. Angka/kode memakai `font-mono` (JetBrains Mono, `tnum`).
- Utility class global: `.clinical-card`, `.clinical-card-hover`, `.glass-header`, `.page-container`, `.filter-card-bar`, `.dialog-modal-content` / `.dialog-modal-body` (dialog dengan body scroll), `.touch-target-chip` (min-height 40px).
- Gaya umum yang sudah dipakai: kartu `rounded-2xl border-slate-200 bg-white shadow-2xs`, label kecil `text-xs font-bold`, judul `font-extrabold`. Ikuti gaya halaman tetangga.
- Warna status **jangan dibuat baru**. Pakai `STATUS_META[status].cls` lewat `<StatusBadge status=… />`.

## Komponen
### `shared/ui/*.jsx`: shadcn/Radix (generated)
button, card, dialog, sheet, drawer, select, tabs, table, popover, calendar, tooltip, badge, input, textarea, checkbox, switch, dll. Config di `frontend/components.json`. **Jangan diubah** kecuali memang perlu mengubah perilaku global. Komposisi dan styling dilakukan di pemanggil lewat `className` + `cn()` (`shared/lib/utils.js`).

### `shared/components/*.js`: komponen app yang wajib dipakai ulang
| Komponen | Kegunaan |
|---|---|
| `StatusBadge` | badge status dari `STATUS_META` |
| `EmptyState` | state kosong, selalu dengan langkah berikutnya |
| `useConfirm()` (`ConfirmDialog.js`) | pengganti `window.confirm`; `const { confirm, confirmDialog } = useConfirm()` |
| `FilterBar`, `FilterField`, `SearchInput` | bar filter list |
| `BranchFilter`, `BranchTag` | pilih/tampil cabang |
| `PeriodFilter`, `DateFilterPicker` | filter periode dashboard / tanggal |
| `usePagination`, `TablePagination` | pagination client-side, **10 data per halaman** (default) |
| `StatCard` | kartu KPI |
| `CreditBar`, `LeaveInfo` | progres kredit & kuota cancel |
| `ServiceChips` | chip layanan client |
| `PageSkeleton` | loading (juga fallback Suspense) |
| `PaymentProofViewerModal` | viewer bukti bayar gambar/PDF |

Komponen domain: `features/schedule/components/calendar/*`, `features/therapist/components/*`, `features/schedule/components/analytics/*`, `features/landing/components/*`, `app/layout/AppLayout.js`.

## List & pagination (wajib)
Semua list, tabel, dan feed yang bisa memanjang memakai **pagination 10 data per halaman**, **bukan infinite scroll** dan bukan daftar penuh yang di-scroll ke bawah:
- Pakai `usePagination(items, 10, resetKey)` + `<TablePagination .../>` (`shared/components/TablePagination.js`); `resetKey` = gabungan filter/pencarian supaya kembali ke halaman 1 saat filter berubah. Hook dipanggil sebelum early return.
- Untuk feed kartu (mis. Session Feed, Rangkuman Client di Summary Laporan) kirim `pageItems` ke komponen presentasi dan taruh `TablePagination` di bawahnya.
- Sudah dipaginasi: semua tabel Finance, Roster/Active Client, Analytics, Unreported Sessions, User Management, tab Inquiry, riwayat sesi client (admin & terapis), Session Feed + Rangkuman Client terapis, drawer riwayat laporan, Hari Libur, tabel transaksi Revenue. Kanban pipeline memuat bertahap per kolom.
- Fase API: client-side slice diganti `page`/`per_page` (atau cursor untuk keyset) ke endpoint list; UI tidak berubah. Lihat `technical_workflow.md` §0 dan `schema.md` §07.

## Mode gelap
- **Tombol**: ikon bulan/matahari di header `AppLayout` (`shared/components/ThemeToggle.js`, state di `shared/hooks/useAppTheme.js`). Tanpa preferensi tersimpan, ikut pengaturan sistem (`prefers-color-scheme`); pilihan disimpan di key `ui_theme`.
- **Cakupan**: hanya area aplikasi (`AppLayout`). Class `dark` dipasang di `<html>` saat layout tampil dan dilepas saat keluar, jadi landing, `/assessment`, `/roles`, dan halaman cetak tetap terang.
- **Cara kerja**: token shadcn (`--background`, `--card`, …) punya nilai gelap di `index.css` (`.dark`). Class warna Tailwind yang dipakai di kode (`bg-white`, `*-slate-*`, warna `-50…-300` untuk latar, `-600…-950` untuk teks, border/ring) dipetakan otomatis oleh `scripts/gen-dark-css.cjs` ke `src/styles/dark-utilities.css`. Skrip jalan otomatis sebelum `npm run dev` dan `npm run build`; jalankan `npm run gen:dark` bila perlu cek manual.
- **Tidak tercakup otomatis**: hex arbitrary (`bg-[#…]`), inline style, dan varian arbitrary (`[&_tr]:…`). Untuk itu tambahkan varian `dark:` pada class atau aturan `.dark …` di `index.css` (contoh: kartu tabel mobile di `shared/ui/table.jsx`, tooltip/grid recharts).
- **Menambah komponen**: pakai class warna Tailwind biasa atau token; hindari warna hex di inline style.

## Struktur halaman
- Halaman besar dipecah menjadi folder sub-komponen di samping file halaman. Contoh: `features/inquiry/pages/ClientDetailInquiry.js` + `features/inquiry/components/clientDetail/*Card.js`, `features/finance/pages/FinancePortal.js` + `features/finance/components/*Tab.js`.
- Halaman (state + handler + orkestrasi context) tinggal di file halaman, sedangkan sub-komponen menerima props (presentational).
- Konfigurasi statis halaman ditaruh di file `*Config.js` (contoh `pipeline/pipelineConfig.js`, `assessment/assessmentConfig.js`).

## Mobile-friendly (wajib)
- Breakpoint utama `md` (768px). Sidebar `hidden md:flex`; di mobile menu muncul lewat `Sheet` dari kiri.
- Kalender: di bawah 768px default ke **day view** (`DayAgenda`), dengan pola `window.innerWidth < 768 ? "day" : "week"`.
- Dialog: batasi tinggi `max-h-[calc(100dvh-2.5rem)]`, susun `flex flex-col`, dan buat body yang bisa di-scroll. Detail panjang memakai `Sheet` (contoh `SessionDetailModal`).
- Tabel: bungkus dengan `overflow-x-auto`, atau ganti ke list kartu di mobile.
- Target sentuh minimal ~40px (`.touch-target-chip`, `h-10`). Grid memakai `grid-cols-1 sm:grid-cols-2 lg:…`, dan header aksi memakai `flex-col sm:flex-row`.
- Portal ortu & kuesioner publik **paling sering dibuka dari HP**, jadi uji di lebar 375px.

## Feedback & interaksi
- Toast: `import { toast } from "sonner"` → `toast.success|error|info|warning("…")`. Pesan dalam bahasa Indonesia dan spesifik (sebut nama client / jumlah).
- Konfirmasi aksi destruktif: `useConfirm()` atau dialog khusus (contoh `DiscontinueDialog`).
- Validasi form: manual di handler submit (`if (!x.trim()) { toast.error(...); return; }`). Pola ini yang dipakai sekarang.
- Filter list yang perlu bertahan saat refresh/share: `useUrlFilters(defaults)` (`shared/hooks/useUrlFilters.js`).
- Ikon: `lucide-react` saja.

## Test ID
- Semua elemen interaktif & kontainer halaman diberi `data-testid` kebab-case: `<feature>-<element>[-<qualifier>]`. Contoh: `client-detail-inquiry-page`, `add-schedule-conflict-warning`, `nav-master-revenue`.
- Registry terpusat `shared/constants/testIds/` (contoh `LOGIN` di `auth.js`) baru dipakai di `Login.js`; halaman lain memakai string inline. Untuk fitur baru, **boleh** inline asal konsisten kebab-case. Jika fitur sudah punya file registry, pakai registry-nya.

## Microcopy
- Bahasa UI: **Indonesia**, dengan istilah klinis/operasional dalam English bila memang itu yang dipakai klinik (Active Client, Discharge, Reschedule, Frozen, Inquiry).
- Nada netral dan suportif ("Perlu perhatian", bukan "Gagal"). Empty state selalu menunjukkan langkah berikutnya.
- Format tampilan: tanggal `dd/MM/yyyy` (`fmtDate`), uang `Rp` (`fmtCurrency`), usia `calcAge`/`calcAgeDetailed`.
