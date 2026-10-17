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

Komponen domain: `features/schedule/components/calendar/*`, `features/therapist/components/*`, `features/schedule/components/analytics/*`, `app/layout/AppLayout.js`.

## List & pagination (wajib)
Semua list, tabel, dan feed yang bisa memanjang memakai **pagination 10 data per halaman**, **bukan infinite scroll** dan bukan daftar penuh yang di-scroll ke bawah:
- Pakai `usePagination(items, 10, resetKey)` + `<TablePagination .../>` (`shared/components/TablePagination.js`); `resetKey` = gabungan filter/pencarian supaya kembali ke halaman 1 saat filter berubah. Hook dipanggil sebelum early return.
- Untuk feed kartu (mis. Session Feed, Rangkuman Client di Summary Laporan) kirim `pageItems` ke komponen presentasi dan taruh `TablePagination` di bawahnya.
- Sudah dipaginasi: semua tabel Finance, Roster/Active Client, Analytics, Unreported Sessions, User Management, tab Inquiry, riwayat sesi client (admin & terapis), Session Feed + Rangkuman Client terapis, drawer riwayat laporan, Hari Libur, tabel transaksi Revenue. **Pengecualian: papan kanban pipeline memakai infinite scroll per kolom** (bukan tabel; kolom bertahap 10 kartu, halaman berikutnya dimuat saat kolom di-scroll sampai dasar lewat `useInfiniteSentinel`, `shared/hooks/useInfiniteSentinel.js`). Mode API: halaman pertama dari `GET /clients/board?per_stage=10`, halaman berikutnya `GET /clients?status[]=<tahap>&page=N&per_page=10` dengan filter yang sama; gagal memuat menampilkan tombol "Coba lagi" (tidak mengulang otomatis); browser tanpa IntersectionObserver mendapat tombol "Muat lebih banyak".
- Fase API: client-side slice diganti `page`/`per_page` (atau cursor untuk keyset) ke endpoint list; UI tidak berubah. Lihat `technical_workflow.md` §0 dan `schema.md` §07.

## Loading data (shimmer) — WAJIB di semua tampilan yang fetch data
**Aturan keras:** setiap tampilan yang datanya diambil dari API (mode `VITE_DATA_SOURCE=api`) — halaman, tab, tabel, kartu, daftar di dalam dialog — menampilkan **kerangka shimmer** selama muat pertama kali, bukan layar kosong, `EmptyState`, tabel 0 baris, atau sekadar teks "Memuat…". Contoh kegagalan yang pernah terjadi: tab *Client Roster* menampilkan daftar kosong / sebagian tanpa indikasi bahwa data sedang diambil.
- Primitif: `<Skeleton/>` (`shared/ui/skeleton.jsx`, kelas `.skeleton-shimmer` di `index.css`; mati otomatis bila pengguna memilih *reduced motion*, ada padanan mode gelap).
- Bentuk siap pakai di `shared/components/LoadingSkeletons.js`: `TableSkeleton` (tabel), `CardGridSkeleton` (kartu/paket), `ListSkeleton` (daftar alasan, role), `DetailSkeleton` (halaman detail). Halaman lazy memakai `PageSkeleton`.
- Pola: store/hook mengekspos `isLoading` (muat pertama, belum ada data; `isLoading && enabled` agar tidak menggantung saat belum login) dan, bila perlu, `isFetching` (muat ulang di latar: tampilkan data lama + teks "memperbarui…", jangan kosongkan). Mode demo (localStorage) selalu `isLoading: false`.
- Muat ulang (filter, halaman, pencarian berubah): data lama **tetap terlihat tetapi diredupkan** (`opacity-50`) + teks "memperbarui…"; jangan dikosongkan. Tabel server-side: `placeholderData: keepPreviousData`.
- Tab yang datanya hanya diperlukan saat dibuka (mis. Birthday Hub) baru mengambil data saat tab aktif, dengan shimmer-nya sendiri.
- Sudah terpasang: Active Clients (roster & birthday), papan & detail pipeline, Master Cabang, User Management, Role & Hak Akses, Master Data Inquiry (layanan, alasan), Hari Libur, katalog paket Finance. **Modul yang baru terintegrasi API wajib memasangnya** (checklist integrasi di `10-api-migration.md`).
- Tombol aksi yang menyimpan ke server: nonaktifkan + ubah label ("Menyimpan…") selama proses.
- **Pencarian / filter yang memanggil server** (mis. pipeline): beri tahu bahwa pencarian sedang berjalan. (tanpa spinner di kotak pencarian); daftar lama tetap terlihat tetapi diredupkan + bar progres tipis (`PipelineBoard` prop `refreshing`); teks hasil di filter bar menjadi "Mencari…". Jangan mengosongkan daftar selama mencari.

## Fetch hanya yang diperlukan (wajib, semua modul)
Setiap halaman di mode API hanya memanggil endpoint untuk data yang **benar-benar dibacanya**. Store tidak lagi mengambil semua daftar saat login; tiap daftar punya kunci permintaan dan baru di-fetch ketika ada komponen yang membacanya.

**Cara kerja** (`shared/hooks/useDemand.js`, dipakai `masterDataStore`, `therapistsStore`, `holidaysStore`, `creditsStore` (katalog paket), `clientsStore` (cache)):
- Daftar (array) = **getter** di nilai context: membaca `const { services } = useMasterData()` meminta daftar `services`. Mengambil properti lain tidak memicu apa pun.
- Fungsi pembantu (`getTherapist`, `getClient`, `getService`, `getActiveMasterPackages`, ...) meminta data **saat dipanggil**, bukan saat diambil dari context. Mengambil fungsinya di level atas tanpa memanggilnya tidak men-fetch.
- Query react-query `enabled` hanya setelah kunci diminta; `isLoading` bernilai true sejak diminta sampai data tiba (tidak ada kilatan "data kosong"). Catatan permintaan dibuang saat logout.
- Tetap eager (dipakai hampir semua halaman): cabang (`branchesStore`), sesi.

**Aturan untuk kode halaman / hook**
1. Baca daftar di tempat ia dipakai. Bila hanya untuk dialog / tab / handler, jangan destruktur di level atas komponen: ambil objek store (`const master = useMasterData()`) lalu baca `master.activeDischargeReasons` hanya saat dialog terbuka (contoh `ClientDetailInquiry`).
2. Komponen berat yang membaca banyak store (modal jadwal, dll.) dipasang saat pertama dibuka, bukan selalu terpasang tersembunyi.
3. Hook use-case mode API tidak boleh membaca store lain "untuk jaga-jaga". Baca di dalam fungsi yang memerlukannya (contoh `useQuestionnaireCodeActions`).
4. Halaman yang punya hook server sendiri (pipeline, detail client, daftar staf) tidak ikut mengaktifkan cache global.
5. **Setiap halaman / modul yang diintegrasikan ke API wajib punya tes loading (shimmer tampil selama request tertahan) dan tes daftar endpoint** yang dipanggil (mock `api`, hitung URL): contoh `features/inquiry/__tests__/lazyFetch.test.js` (pipeline = `/clients/board` + `/branches` + `/master/services`; detail client tidak memanggil terapis, hari libur, alasan cancel/discharge, atau daftar client).
6. Store baru yang mengambil daftar dari server: pakai `useDemand`; jangan memasang `useQuery` yang langsung `enabled` saat login.

## Mode gelap
- **Tombol**: ikon bulan/matahari di header `AppLayout` (`shared/components/ThemeToggle.js`, state di `shared/hooks/useAppTheme.js`). Tanpa preferensi tersimpan, ikut pengaturan sistem (`prefers-color-scheme`); pilihan disimpan di key `ui_theme`.
- **Cakupan**: hanya area aplikasi (`AppLayout`). Class `dark` dipasang di `<html>` saat layout tampil dan dilepas saat keluar, jadi landing, `/assessment`, `/roles`, dan halaman cetak tetap terang.
- **Cara kerja**: token shadcn (`--background`, `--card`, …) punya nilai gelap di `index.css` (`.dark`). Class warna Tailwind yang dipakai di kode (`bg-white`, `*-slate-*`, warna `-50…-300` untuk latar, `-600…-950` untuk teks, border/ring) dipetakan otomatis oleh `scripts/gen-dark-css.cjs` ke `src/styles/dark-utilities.css`. Skrip jalan otomatis sebelum `npm run dev` dan `npm run build`; jalankan `npm run gen:dark` bila perlu cek manual.
- **Tidak tercakup otomatis**: hex arbitrary (`bg-[#…]`), inline style, dan varian arbitrary (`[&_tr]:…`). Untuk itu tambahkan varian `dark:` pada class atau aturan `.dark …` di `index.css` (contoh: kartu tabel mobile di `shared/ui/table.jsx`, tooltip/grid recharts).
- **Kalender**: satu palet pastel untuk semua status di `shared/constants/sessionColors.js` (`SESSION_COLORS` + `sessionColorKey`), dipakai `WeeklyCalendar`, `DayAgenda`, `TeamDayGrid`, dan legend. Asesmen scheduled/completed = fuchsia; Cuti = abu; pending = outline oranye putus-putus; bentrok = putih + bingkai merah tebal.
- **Date picker**: semua input tanggal memakai `DateFilterPicker` (rutinitas, hari libur, cuti, filter; `minDate`/`maxDate` menonaktifkan hari di luar rentang) di atas `shared/ui/calendar.jsx`: dropdown bulan & tahun (lompat tahun langsung; rentang −25/+10 tahun dari sekarang atau tahun terpilih).
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

### Menu sidebar: satu menu aktif
`NavLink` menandai menu aktif lewat awalan rute, jadi menu induk (mis. `/admin-inquiry`) ikut menyala di `/admin-inquiry/pipeline` kecuali dicocokkan persis (`end`). `navItemEnd(item, items)` (`app/layout/navConfig.js`) menurunkan `end` otomatis untuk item yang `to`-nya adalah awalan dari `to` item lain di menu yang sama; `end` eksplisit di konfigurasi tetap menang. Menu baru tidak perlu mengingat `end: true`. Tes `navConfig.test.js` memastikan untuk setiap role (termasuk role kustom) tepat satu menu aktif di setiap rute menu dan sub-rutenya.

### Input tanggal (`DateFilterPicker`)
Format tampil standar `DD/MM/YYYY`. Opsi: `iconPosition="left"` (ikon kalender di kiri, sejajar ikon pada input lain), `displayFormat="spaced"` (`DD / MM / YYYY`, pemisah otomatis saat mengetik angka, keypad numerik di ponsel), `size="lg"` (tinggi 44px) dan `clearOnInvalid` (ketikan belum lengkap mengosongkan nilai induk agar tanggal lama tidak terkirim). Dipakai di form login ortu (tanggal lahir anak). **Kalender terbuka saat kolom diklik** (tidak harus mengeklik ikon), fokus tetap di kolom sehingga bisa langsung mengetik; ikon kalender, panah bawah (buka), dan Esc (tutup) juga bekerja, tanggal lengkap yang valid menutup kalender. Matikan dengan `openOnInputClick={false}` bila kalender menutupi isi form. Jangan memakai `<input type="date">` bawaan browser: formatnya mengikuti locale perangkat.

### Cegah zoom otomatis iOS pada input (ponsel)
iOS Safari memperbesar halaman bila input yang difokuskan berfont < 16px. Kontainer yang memuat form input untuk ponsel diberi class `no-input-zoom` (`index.css`: input/textarea/select 16px di bawah `md`; layar lebih besar tetap ukuran kecil bawaan). Sudah dipasang di halaman Login dan dialog Lupa Password / Ganti Password (dialog di-portal, jadi class dipasang di `DialogContent`). Zoom pinch pengguna tetap hidup (tidak memakai `maximum-scale`). Pasang juga di `/assessment` dan portal ortu bila form-nya terasa melompat di iPhone.

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

## Pemilih client (ClientCombobox)

Aturan 18d. Semua combo box pilih + cari client memakai `shared/components/ClientCombobox.js` (Finance buat tagihan & renewal, Penjadwalan, Generate Kode, filter client Portal Terapis, Master Asesmen, dll.).

- **Infinite scroll 10 per halaman** (`useInfiniteSentinel`, tombol "Muat lebih banyak" bila IntersectionObserver tak ada); pencarian per kata (nama anak / ortu / kode) tetap tersedia dan mengulang dari halaman 1.
- **Mode API**: `source={{ statuses: [...], branchId }}`; `GET /clients` (10/halaman, `q` ke server dengan jeda 300 ms). Daftar **baru diambil saat popover dibuka** (22b); shimmer `ListSkeleton` selama muat pertama, "Memuat client lainnya…" saat halaman berikut. Label nilai awal yang belum termuat diambil dari `GET /clients/{id}`.
- **Mode demo / daftar turunan**: `clients={...}` disaring di klien (`matchesClientSearch`), tampil 10 per 10.
- `onChange(id, client)`: argumen kedua = objek client terpilih; pemanggil mode API memakainya (client tidak ada di store lokal). Opsi "semua" lewat `allOption`.
- Tes: `shared/components/__tests__/ClientCombobox.{local,api}.test.js`.
