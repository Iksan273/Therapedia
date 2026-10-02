---
name: react-architecture
description: Pola arsitektur React Therapedia (feature-based + domain layer + store Context/reducer + hook use-case + lapisan HTTP siap Laravel). Pakai saat membuat/mengubah halaman, komponen, store, hook, route, atau saat memindahkan data dari localStorage ke API (react-query).
---

# React Architecture Pattern — Therapedia

Stack: React 19 · react-router 7 · Vite 6 · Tailwind 3 + shadcn · Vitest. Aturan teknis lengkap: `frontend/CLAUDE.md`. Batas lapisan ditegakkan `npm run lint`.

## 1. Struktur

```
src/
  app/            App.js · providers/AppProviders.js · router/{routes,guards,AppRouter}.js · layout/{AppLayout,navConfig}.js
  features/<m>/   pages/ · components/<sub>/ · hooks/use<X>Actions.js · index.js (public API) · __tests__/
  stores/         <domain>Store.js  (Provider + use<Domain>() + reducer tipis)
  domain/         client · schedule · credit · rbac · branch · status  (+ __tests__)
  services/       storage/localStore.js · http/{httpClient,apiError,tokenStore}.js · api/endpoints.js
  shared/         ui/ (shadcn) · components/ · hooks/ · lib/ · constants/testIds/
  config/env.js   data/ (seed demo)
```
Modul feature: `auth`, `landing`, `inquiry`, `assessment`, `schedule`, `finance`, `therapist`, `parent`, `master`, `audit`.

## 2. Pola per lapisan

### Domain (pure)
```js
// domain/schedule.js
export const canManageSchedule = (role) => SCHEDULE_MANAGER_ROLES.includes(role);
export function applySessionCompleted(record, { packageId, scheduleId, date }) { /* return record baru */ }
```
- Tanpa React, tanpa I/O, tanpa `Date.now()` tersembunyi bila bisa (terima `now` sebagai argumen).
- Setiap fungsi aturan punya test di `domain/__tests__/`.

### Store (state domain)
```js
function clientsReducer(state, action) {           // tipis: rangkai state, panggil domain
  switch (action.type) {
    case "UPDATE": return state.map((c) => (c.id === action.id ? { ...c, ...action.patch, updatedAt: nowIso() } : c));
    default: return state;
  }
}
export const ClientsProvider = ({ children }) => {
  const [clients, dispatch] = usePersistentReducer("clients", clientsReducer, () => getSeedLoader().loadClientsSeed());
  const updateClient = (id, patch) => dispatch({ type: "UPDATE", id, patch });
  return <ClientsContext.Provider value={{ clients, updateClient, getClient }}>{children}</ClientsContext.Provider>;
};
```
- Satu entity = satu store. Store **tidak** memanggil store lain.
- Interface value (`clients`, `updateClient`, …) adalah kontrak: saat pindah ke API, implementasinya berubah, interface tetap.

### Hook use-case (orkestrasi lintas store)
```js
// features/schedule/hooks/useSessionActions.js
export function useSessionActions() {
  const { updateSchedule } = useSchedules();
  const { spendPackageCredit } = useCredits();
  const completeSession = (schedule, report) => {
    updateSchedule(schedule.id, { status: "completed", ...buildReportPatch(report) });
    // efek kredit & pipeline …
    return { creditSpent, assessmentDone };     // hasil untuk toast di komponen
  };
  return { completeSession, cancelSession, bulkComplete /* … */ };
}
```
- Aturan: aksi yang menyentuh >1 store **wajib** lewat hook use-case. Aksi 1 store boleh langsung.
- Hook mengembalikan hasil; **toast/navigate tetap di komponen**.
- Contoh yang ada: `useSessionActions` (schedule), `useClientOutcomeActions` (inquiry).
- Aksi penting dicatat ke audit: `const { record } = useAuditLogger()` (dari `@/features/audit`), satu `record([...])` per aksi user agar berbagi `batchId`.

### Halaman & komponen
- Halaman (`pages/`) = state UI + handler + memanggil hook/store. Sub-komponen (`components/`) = presentational via props.
- Konfigurasi statis halaman di `components/<sub>/<x>Config.js`.
- Halaman > ~500 baris → pecah.
- Data turunan dengan `useMemo`; filter list yang perlu dibagikan via URL → `useUrlFilters`.

### Routing & akses
- Tambah halaman: entry di `app/router/routes.js` (`PROTECTED_GROUPS[].children` dengan `module` RBAC) + menu di `app/layout/navConfig.js`. Jangan menyentuh `AppRouter.js`.
- Guard: `RequireAccess` (role sistem / role kustom via modul) dan `RequireModule` (per halaman untuk role kustom).
- Aksi sensitif dicek per role di domain (`canManageSchedule(role)`), bukan string literal di komponen.

### Public API feature
```js
// features/schedule/index.js
export { SessionDetailModal } from "@/features/schedule/components/calendar/SessionDetailModal";
export { useSessionActions } from "@/features/schedule/hooks/useSessionActions";
```
Feature lain: `import { SessionDetailModal } from "@/features/schedule";`

## 3. Migrasi store ke API (pola target)

Saat `ENV.DATA_SOURCE === "api"`, ganti isi Provider dengan react-query; **halaman tidak berubah**.

```js
// stores/clientsStore.js (fase API) — sketsa
const useClientsQuery = (params) =>
  useQuery({ queryKey: ["clients", params], queryFn: () => api.list(ENDPOINTS.clients.list, params) });

export const ClientsProvider = ({ children }) => {
  const qc = useQueryClient();
  const { activeBranch } = useAuth();
  const { data } = useClientsQuery({ branchId: activeBranch });
  const update = useMutation({
    mutationFn: ({ id, patch }) => api.patch(ENDPOINTS.clients.detail(id), patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
  const value = { clients: data?.items ?? [], updateClient: (id, patch) => update.mutateAsync({ id, patch }), getClient: (id) => /* … */ };
  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
};
```
Hook use-case berubah menjadi satu mutation ke endpoint transaksional:
```js
const completeSession = (schedule, report) => api.post(ENDPOINTS.schedules.complete(schedule.id), { report, version: schedule.version });
```
- `httpClient` sudah menangani: token Sanctum, camelCase↔snake_case, `ApiError` (422 `fieldErrors`, 409 konflik versi, 401 logout).
- Kirim `version` untuk entity yang bisa diedit bersamaan (optimistic lock).
- Query key konvensi: `[entity, params]`; invalidasi per entity setelah mutation.
- Loading: `PageSkeleton`; error: toast `error.message` (sudah bahasa Indonesia).

## 4. Testing
- `npm test` (Vitest). Domain: unit test pure. Hook use-case: render dalam `AppProviders` + seed (lihat `features/schedule/__tests__/useSessionActions.test.js`).
- Smoke route semua role: `app/__tests__/routes.smoke.test.js` — tambahkan route baru ke `CASES`.

## 5. Checklist PR React
- [ ] Kode di lapisan yang benar; `npm run lint` tanpa error (batas lapisan)
- [ ] Aksi lintas store lewat hook use-case; aturan bisnis di `domain/` + test
- [ ] Route/menu lewat `routes.js` & `navConfig.js` (dengan `module` RBAC)
- [ ] Data cabang mengikuti `activeBranch`; mobile ≤768px dicek
- [ ] `npm test` & `npm run build` lolos; docs `docs/guide/*` diperbarui
