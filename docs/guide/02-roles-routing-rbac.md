# 02 — Role, Routing & RBAC

> Keputusan klien 3 Okt 2026 yang menyentuh dokumen ini sudah diimplementasi di frontend; register keputusan + status: [12-keputusan-klien.md](12-keputusan-klien.md).

## Login demo (tanpa password nyata)
Auth saat ini **simulasi**, tetapi alurnya mengikuti keputusan klien: staf login dengan **email + password** (`domain/auth.js`: `checkStaffCredentials`; akun lama tanpa password memakai password demo), password sementara dari Master **wajib diganti** saat login pertama (`ForcePasswordChangeDialog`), **lupa password** lewat OTP email (`ForgotPasswordDialog`; email disimulasikan, OTP tampil di layar), Master dapat mereset password, dan staf **dinonaktifkan** (bukan dihapus). `login(payload)` di `stores/authStore.js` menyimpan `{ role, therapistId, clientId, staffName, branchId }` ke localStorage. Fase API: Sanctum (guard `staff` & `client`, lihat 10 dan `schema.md` §10).

| Pintu masuk | Route | Cara |
|---|---|---|
| Pintu masuk `/` | `/` | `features/auth/pages/RootRedirect.js`: **tidak ada halaman beranda**. Belum login → `/login`; sudah login → halaman awal role (`homePathFor` di `domain/auth.js`; role kustom → modul pertama yang terbuka) |
| Pilih role cepat (**hanya mode demo**, tidak terdaftar bila `VITE_DATA_SOURCE=api`) | `/roles` | `features/auth/pages/RoleSelect.js`: kartu role; manager, admin inquiry, admin schedule, dan finance **pilih cabang penugasan atau "Semua Cabang"** (`branchId` kosong/`null` = semua cabang; terisi = terikat 1 cabang); terapis pilih nama; ortu masukkan **kode client** (`clientCode`, mis. `AE-00006`) |
| Login form | `/login` | `features/auth/pages/Login.js`: email + password staf; ortu dengan kode client + tanggal lahir anak. **Mode API**: `POST /auth/login` / `/auth/client-login` lewat `useAuthActions`, token Sanctum di `tokenStore`, matriks modul dari server (`auth.permissions`), password sementara → dialog ganti password wajib, lupa password via OTP email. **Mode demo**: akun demo (preset 1-klik, password `Therapedia2026!`). Sesi API dipulihkan saat refresh lewat `GET /auth/me`; 401 → sesi dibersihkan → `/login` |
| Kuesioner ortu (publik) | `/assessment` | `features/assessment/pages/AssessmentFill.js`, kode kuesioner `{kode jenis asesmen}-{acak}` (mis. `SP2-K7M4QX`); `?code=` mengisi kolom kode |
| Landing marketing | — (project terpisah `landing/`) | Tidak ada di router `frontend/`. Tombol "Go to Landing Page" di `/` membuka `VITE_LANDING_URL` |

## 7 role sistem
| Role id | Label | Scope cabang | Landing route |
|---|---|---|---|
| `master` | Master Director | Semua cabang, bisa ganti `activeBranch` | `/master/revenue` |
| `manager` | Branch Manager | Terkunci ke `auth.branchId` | `/manager/revenue` |
| `admin_inquiry` | Admin Inquiry | Terkunci | `/admin-inquiry/pipeline` |
| `admin_schedule` | Admin Schedule | Terkunci | `/admin-schedule/calendar` |
| `finance` | Finance | Terkunci | `/finance` |
| `therapist` | Therapist | Data miliknya (`auth.therapistId`) | `/therapist` |
| `client` | Orang tua | Data anaknya (`auth.clientId`) | `/client` |

Role sistem = `SYSTEM_ROLE_IDS` di `domain/rbac.js`. Role lain = **role kustom** buatan Master di `/master/rbac`. Cakupan cabang akun ditentukan **hanya oleh `branchId`** (padanan `users.branch_id`): terisi = terikat 1 cabang, **kosong (`null`) = semua cabang**. Berlaku untuk semua role (termasuk Master, terapis, dan role kustom); Master mengaturnya di User Management lewat pilihan *Semua cabang* pada Penugasan Cabang. Tidak ada flag `allBranches`. Akun `branchId` kosong berperilaku seperti Master untuk cabang (filter semua cabang, ganti `activeBranch`) lewat `hasAllBranchAccess(auth)` di `domain/auth.js` (ortu `client` tidak pernah masuk kategori ini).

## Konfigurasi route (`frontend/src/app/router/routes.js`)
Router dibangun dari data, bukan JSX manual. `AppRouter.js` membaca tiga daftar:

| Daftar | Isi | Guard |
|---|---|---|
| `PUBLIC_ROUTES` | `/` (redirect), `/roles` (hanya mode demo), `/login`, `/assessment` | tanpa guard, tanpa layout |
| `STANDALONE_ROUTES` | `/print/client/:id` (PrintClientReport) | `RequireAccess` (semua role staf), tanpa `AppLayout` |
| `PROTECTED_GROUPS` | grup ber-`AppLayout`: `/master`, `/manager`, `/finance`, `/admin-inquiry`, `/admin-schedule`, `/therapist`, `/client` | `RequireAccess` per grup + `RequireModule` per halaman |

| Grup | `roles` (sistem) | Halaman → `module` RBAC |
|---|---|---|
| `/master` | master | `revenue`→revenue, `branch-performance`→revenue, `branches`→branch_master, `users`→user_management, `rbac`→rbac |
| `/manager` | manager | `revenue`→revenue |
| `/finance` | master, finance | index→finance |
| `/admin-inquiry` | master, manager, admin_inquiry, therapist | index/`dashboard`→inquiry_dashboard; `pipeline`, `pipeline/:id`, `clients/:id`, `assessments`, `master-data`, `parent-assessment/:id`→inquiry_pipeline |
| `/admin-schedule` | master, manager, admin_schedule, finance | index→schedule_dashboard, `calendar`→weekly_calendar, `clients`, `clients/:id`→active_clients, `unreported-reports`→unreported_reports (monitoring laporan sesi), `holidays`→holidays, `therapist-utilization`→therapist_utilization (jam kerja & Availability/Utilization) |
| `/therapist` | therapist | semua→therapist_module (index My Schedule, `summary`, `team-calendar` = Kalender Tim read-only, `clients/:id`, `parent-assessment/:id`) |
| `/client` | client | index (tanpa modul) |

## Guard (`app/router/guards.js`)
- **`RequireAccess({ roles, modules })`** — grup. Lolos bila role ada di `roles` grup (akses bawaan role sistem) **atau** role staf mana pun (sistem maupun kustom, selain client) punya permission **salah satu** `modules` grup (`groupModules(group)`). Jadi modul yang diberikan Master di `/master/rbac` ikut terbuka. Tanpa sesi (atau mode API dengan password sementara) → redirect `/login`; sudah login tapi tidak berhak → halaman "tidak ada akses" (`shared/components/AccessDenied`), bukan redirect, agar tidak berputar bila halaman awal role juga ditutup.
- **`RequireModule({ module })`** — per halaman. Semua role wajib punya permission modul halaman itu (Master selalu lolos). Mencabut modul di RBAC menutup halamannya, bukan hanya menyembunyikan menu.
- **Menu sidebar** (`buildNavConfig`): menu bawaan role disaring permission, lalu ditambah menu modul lain yang diizinkan RBAC (`CUSTOM_ROLE_ITEMS`, daftar semua menu per modul). **Master melihat semua modul** (termasuk Schedule Dashboard, Assessment Master Data, Finance, dan modul Terapis). Modul terapis untuk non-terapis = mode simulasi: `ViewAsTherapistBar` + `useActingTherapist` (pilih terapis yang dilihat; key `viewAsTherapistId`).
- Hak **aksi** mengikuti **akses modul** (keputusan klien): punya akses modul = boleh semua aksi di modul itu, termasuk hapus operasional (hapus client & cabang khusus master). Mis. `canManageSchedule(hasPermission)` (`domain/schedule.js`) = akses `weekly_calendar`, sehingga Manager yang diberi modul itu ikut boleh mengubah status sesi. Hapus operasional (invoice belum lunas, sesi, jadwal rutin, libur, master data, kode kuesioner) juga cukup akses modul; hapus **data penting** (client inquiry/aktif dan cabang) dikunci `masterOnly` = hanya role `master` (`canDeleteIn` di `domain/rbac.js`). Tidak ada flag `canDelete` per role (revisi 13 Okt 2026).

## Navigasi (`app/layout/navConfig.js`)
- `NAV_CONFIG[role]`: menu statis per role sistem (`to`, `label`, `icon`, `module`, `testid`). `module` boleh string atau array (salah satu cukup).
- `buildNavConfig({ role, roleObj, hasPermission })`: master & client tidak difilter; role sistem lain difilter `module`; role kustom memakai `CUSTOM_ROLE_ITEMS` yang difilter permission.
- `AppLayout.js` hanya memanggil `buildNavConfig` dan merender. Mobile: sidebar `hidden md:flex`, menu via `Sheet` (`mobile-menu-button`).

## RBAC
| Bagian | Lokasi |
|---|---|
| Modul (`ACCESS_MODULES`), role default (`DEFAULT_ROLES`), matriks default (`DEFAULT_PERMISSIONS`) | `domain/rbac.js` |
| Cek permission pure: `roleHasPermission(role, permissions, module)` (master selalu boleh; key legacy `inquiry`/`schedule`/`therapist` dipetakan; key modul yang belum pernah disimpan memakai default role). **Hapus**: `canDeleteIn({ roleId, permissions, moduleKey, masterOnly })` (master selalu boleh; `masterOnly` = hanya master; selain itu cukup akses modul) | `domain/rbac.js` |
| Matriks efektif `withDefaultPermissions(stored)` — modul baru otomatis memakai default tanpa Reset Demo Data | `domain/rbac.js`, dipakai `authStore` |
| State: `rolesList`, `rbacPermissions`, CRUD role, `updateRolePermission`, `hasPermission(module)`, `canDelete(module, { masterOnly })`; akun: `addStaffUser`, `setStaffActive`, `changeStaffPassword`, `resetStaffPassword`, `requestPasswordOtp`, `resetPasswordWithOtp` | `stores/authStore.js` |
| UI matriks & role kustom (termasuk baris "Boleh menghapus data") | `features/master/pages/RoleModuleAccess.js` |
| Tombol hapus: `DeleteButton` / `IfCanDelete` (prop `masterOnly` untuk client & cabang; tersembunyi bila tidak boleh) | `shared/components/DeleteControls.js` |
| Modul baru: `unreported_reports` (monitoring laporan sesi), `holidays` (hari libur), `therapist_utilization` (utilisasi & jam kerja terapis; default master, manager, admin_schedule) | `domain/rbac.js` (`ACCESS_MODULES`, `DEFAULT_PERMISSIONS`) |
| Tabel backend | `roles`, `access_modules`, `role_permissions` (`schema.md` §04-A) |

## Scoping cabang
- `activeBranch` (`"all"` atau id cabang) di `useAuth()`. Akun ber-`branchId` terisi otomatis dikunci ke `auth.branchId`. Pada halaman, `isMaster = hasAllBranchAccess(auth)`.
- Pola standar halaman list/dashboard:
  ```js
  const defaultBranch = isMaster ? (activeBranch || "all") : (auth?.branchId || activeBranch || "branch-sby-timur");
  ```
  Dipakai di `InquiryPipeline`, `ActiveClients`, `DashboardSchedule`, `DashboardRevenue`, `UserManagement`, `ClientAnalyticsTab`. Filter UI: `shared/components/BranchFilter.js`.
- Daftar cabang: `BRANCHES` di `domain/branch.js`. Backend: global scope `BranchScope`.
