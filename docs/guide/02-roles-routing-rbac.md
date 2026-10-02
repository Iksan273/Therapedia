# 02 — Role, Routing & RBAC

## Login demo (tanpa password nyata)
Auth saat ini **simulasi**. `login(payload)` di `stores/authStore.js` menyimpan `{ role, therapistId, clientId, staffName, branchId }` ke localStorage. Fase API: Sanctum (guard `staff` & `client`, lihat 10 dan `schema.md` §10).

| Pintu masuk | Route | Cara |
|---|---|---|
| Welcome (pemilih portal) | `/` | `features/auth/pages/Welcome.js` |
| Pilih role cepat | `/roles` | `features/auth/pages/RoleSelect.js`: kartu role; manager pilih cabang; terapis pilih nama; ortu masukkan `clientAccessCode` |
| Login form | `/login` | `features/auth/pages/Login.js`: preset email per role / email di `staffUsers`; ortu dengan kode akses |
| Kuesioner ortu (publik) | `/assessment` | `features/assessment/pages/AssessmentFill.js`, kode `ASM-xxxx` |
| Landing marketing | `/landing`, `/home` | `features/landing/pages/Home.js` |

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

Role sistem = `SYSTEM_ROLE_IDS` di `domain/rbac.js`. Role lain = **role kustom** buatan Master di `/master/rbac`.

## Konfigurasi route (`frontend/src/app/router/routes.js`)
Router dibangun dari data, bukan JSX manual. `AppRouter.js` membaca tiga daftar:

| Daftar | Isi | Guard |
|---|---|---|
| `PUBLIC_ROUTES` | `/`, `/landing`, `/home`, `/roles`, `/login`, `/assessment` | tanpa guard, tanpa layout |
| `STANDALONE_ROUTES` | `/print/client/:id` (PrintClientReport) | `RequireAccess` (semua role staf), tanpa `AppLayout` |
| `PROTECTED_GROUPS` | grup ber-`AppLayout`: `/master`, `/manager`, `/finance`, `/admin-inquiry`, `/admin-schedule`, `/therapist`, `/client` | `RequireAccess` per grup + `RequireModule` per halaman |

| Grup | `roles` (sistem) | Halaman → `module` RBAC |
|---|---|---|
| `/master` | master | `revenue`→revenue, `branch-performance`→revenue, `users`→user_management, `rbac`→rbac, `audit-logs`→audit_logs |
| `/manager` | manager | `revenue`→revenue, `audit-logs`→audit_logs |
| `/finance` | master, finance | index→finance |
| `/admin-inquiry` | master, manager, admin_inquiry, therapist | index/`dashboard`→inquiry_dashboard; `pipeline`, `pipeline/:id`, `clients/:id`, `assessments`, `master-data`, `parent-assessment/:id`→inquiry_pipeline |
| `/admin-schedule` | master, manager, admin_schedule, finance | index→schedule_dashboard, `calendar`→weekly_calendar, `clients`, `clients/:id`→active_clients |
| `/therapist` | therapist | semua→therapist_module |
| `/client` | client | index (tanpa modul) |

## Guard (`app/router/guards.js`)
- **`RequireAccess({ roles, modules })`** — grup. Role sistem lolos bila ada di `roles`. Role kustom lolos bila punya permission **salah satu** `modules` grup (`groupModules(group)`). Gagal → redirect `/roles`.
- **`RequireModule({ module })`** — per halaman. Role sistem selalu lolos (sudah dibatasi grup); role kustom wajib punya permission modul halaman.
- Hak **aksi** (bukan halaman) dicek di domain, mis. `canManageSchedule(role)` (`domain/schedule.js`): hanya `master` & `admin_schedule` mengubah status sesi.

## Navigasi (`app/layout/navConfig.js`)
- `NAV_CONFIG[role]`: menu statis per role sistem (`to`, `label`, `icon`, `module`, `testid`). `module` boleh string atau array (salah satu cukup).
- `buildNavConfig({ role, roleObj, hasPermission })`: master & client tidak difilter; role sistem lain difilter `module`; role kustom memakai `CUSTOM_ROLE_ITEMS` yang difilter permission.
- `AppLayout.js` hanya memanggil `buildNavConfig` dan merender. Mobile: sidebar `hidden md:flex`, menu via `Sheet` (`mobile-menu-button`).

## RBAC
| Bagian | Lokasi |
|---|---|
| Modul (`ACCESS_MODULES`), role default (`DEFAULT_ROLES`), matriks default (`DEFAULT_PERMISSIONS`) | `domain/rbac.js` |
| Cek permission pure: `roleHasPermission(role, permissions, module)` (master selalu boleh; key legacy `inquiry`/`schedule`/`therapist` dipetakan; key modul yang belum pernah disimpan memakai default role) | `domain/rbac.js` |
| Matriks efektif `withDefaultPermissions(stored)` — modul baru otomatis memakai default tanpa Reset Demo Data | `domain/rbac.js`, dipakai `authStore` |
| State: `rolesList`, `rbacPermissions`, CRUD role, `updateRolePermission`, `hasPermission(module)` | `stores/authStore.js` |
| UI matriks & role kustom | `features/master/pages/RoleModuleAccess.js` |
| Tabel backend | `roles`, `access_modules`, `role_permissions` (`schema.md` §04-A) |

## Scoping cabang
- `activeBranch` (`"all"` atau id cabang) di `useAuth()`. Non-master otomatis dikunci ke `auth.branchId`.
- Pola standar halaman list/dashboard:
  ```js
  const defaultBranch = isMaster ? (activeBranch || "all") : (auth?.branchId || activeBranch || "branch-sby-timur");
  ```
  Dipakai di `InquiryPipeline`, `ActiveClients`, `DashboardSchedule`, `DashboardRevenue`, `UserManagement`, `ClientAnalyticsTab`. Filter UI: `shared/components/BranchFilter.js`.
- Daftar cabang: `BRANCHES` di `domain/branch.js`. Backend: global scope `BranchScope`.
