# Therapedia Developmental Center — Frontend-only MVP Plan

## 1) Objectives
- Deliver a **stakeholder-demo MVP** for an OT clinic with **role-simulated** navigation (Admin Inquiry, Admin Schedule, Therapist, Client).
- Implement the **full core clinic flow** end-to-end using **React Context + localStorage persistence** (seed JSON → mutate in app → survive refresh).
- Provide key modules: **Inquiry pipeline**, **assessment codes + form**, **weekly scheduling + recurring**, **credit/leave rules**, **renewals**, **discharge**, and **dashboards**.
- Maintain a consistent UI system (Tailwind, Poppins, lucide icons, recharts) and include **Reset Demo Data**.

## 2) Implementation Steps

### Phase 1 — Core data + routing foundation (NO POC; proceed directly)
**Goal:** prove the app’s backbone: contexts + reducers + localStorage + protected routes.

**User stories (Phase 1)**
1. As a stakeholder, I can pick a role on a landing page and immediately see the correct sidebar/routes.
2. As an admin, I can refresh the page and all demo changes remain (localStorage persistence).
3. As a developer/demo host, I can click “Reset Demo Data” to restore the original seed.
4. As an admin, I can open any seeded client and see consistent data across pages.
5. As a therapist, I only see therapist-appropriate navigation and cannot access admin routes.

**Build**
- Add Google Font **Poppins**, placeholder logo.
- Create seed JSON files under `src/data/*.seed.json` for clients/therapists/schedules/credits/assessment categories.
- Implement `useLocalStorageState(key, seed)` hook: load on mount; write-through on every reducer update.
- Create contexts (one per domain): `AuthContext`, `ClientsContext`, `SchedulesContext`, `CreditsContext`, `AssessmentsContext`.
- Create role-based routing with React Router v6: `RequireRole` wrapper; sidebar layout per role.
- Add shared UI primitives: `Button`, `Badge`, `Card`, `Modal`, `Table`, `EmptyState`, `Tabs`, `Select`, `Input`.

---

### Phase 2 — V1 App Development (all modules, core flows)
**Goal:** implement the complete stakeholder demo flows; finish with 1 round of E2E testing.

**User stories (Phase 2)**
1. As a parent, I can submit a public inquiry and receive a generated client access code.
2. As Admin Inquiry, I can move a client through the pipeline from inquiry → admitted/discontinued.
3. As Admin Inquiry, I can generate an assessment access code and the parent can fill the assessment via that code.
4. As Admin Schedule, I can add sessions (including recurring) and see them in the weekly calendar instantly.
5. As Admin Schedule, when I mark a session completed/cancelled/rescheduled, credits/leave update correctly.

**Build (Module-by-module, but keep code cohesive)**
- **Inquiry Management**
  - Public inquiry form → create client with `status=inquiry`, generate `clientAccessCode`.
  - Inquiry pipeline view (simple kanban or grouped columns) by status; card click → client detail.
  - Client detail (inquiry flow) checklist actions:
    - Set service type + assessment category.
    - Generate/display `assessmentAccessCode`.
    - Offer assessment schedule (therapist + time) → write schedule.
    - Report note editor (enabled after assessment completed).
    - Invoice create + mark paid (simulated).
    - Set recurring therapy schedule (12 weeks).
    - Admit → set `status=admitted`, `dateOfJoin=today`, create initial credits.
    - Discontinue → require reason + note.
  - Assessment master data CRUD for categories + questions.
  - Assessment fill page: enter access code → render questions → submit → save answers to client.

- **Scheduling / Weekly Calendar (custom grid)**
  - Weekly grid (day × time) + therapist filter.
  - Add schedule modal from empty slot; searchable active-client picker.
  - Slot detail modal from existing schedule:
    - Edit/reschedule/cancel/complete.
    - Conflict check vs therapist availability + existing bookings (warn but allow force).
    - Credit/leave rules:
      - Completed: decrement remainingCredit by 1, add credit history.
      - Cancelled/Rescheduled with reason=leave: no credit decrement; increment leaveUsed (warn if over quota).

- **Active Client Management**
  - Active clients list (admitted, not discharged) with tabs: All / Birthday / Analytic.
  - Client detail for schedule/credits/discharge.
  - Discharge flow: reason + note → set status discharged + date.

- **Credit & Renewal**
  - Credit progress + badges (low/zero), leave badges (over-quota warning).
  - Renew package: create renewal invoice → mark paid → increase total+remaining and log history.

- **Dashboards (recharts)**
  - Admin Inquiry dashboard: pipeline counts; “assessment not filled” list; monthly discontinued chart.
  - Admin Schedule dashboard: active count; session status chart by month; low/out-of-credit list; birthdays list; discharge-reason pie.

- **Client Portal**
  - Access code login → client dashboard.
  - Client dashboard: remaining credit + therapy history list.

**Conclude Phase 2**
- Run 1 round of end-to-end testing with the testing agent against the Definition of Done flows.
- Fix all blocking UX/state bugs found.

---

### Phase 3 — Comprehensive testing, polish, and hardening
**Goal:** stabilize demo quality; improve edge cases and UX without expanding scope.

**User stories (Phase 3)**
1. As a stakeholder, I can complete the full flow without encountering broken links, empty screens, or inconsistent state.
2. As an admin, I can see clear warnings for conflicts/over-quota/low credit without being blocked.
3. As a therapist, I can reliably view only my sessions and open read-only client details.
4. As an admin, I can quickly locate clients via search/filter in tables/modals.
5. As a demo host, I can reset data and rerun the demo flow repeatedly.

**Test & refine**
- Add/verify defensive reducers (no negative credits; handle missing IDs; safe date parsing).
- Ensure all cross-domain updates stay consistent (schedule completion → credits history; discharge → active lists; admit → credits created).
- Validate persistence boundaries (seed only when localStorage empty; version key strategy if needed).
- Improve UI/UX: loading states, empty states, confirmation dialogs for destructive actions.
- Run testing agent again; fix regressions.

## 3) Next Actions
1. Create `plan.md` (this document).
2. Scaffold contexts/reducers + `useLocalStorageState` + seed data wiring.
3. Implement router + role-based sidebar layout.
4. Build core screens in this order for fastest end-to-end validation:
   - Public inquiry → pipeline → client detail (admit)
   - Weekly calendar (add + complete) → credits update
   - Client portal access code → view history
5. Implement dashboards last, once data flows are stable.

## 4) Success Criteria
- **Local-first persistence:** any mutation persists via localStorage and survives refresh; Reset restores seed.
- **Role simulation works:** routes and navigation reflect chosen role; client access-code login works.
- **Definition of Done flows pass (no reload needed):** inquiry → assessment → scheduling (recurring) → session updates affect credits → renew → discharge → dashboards → client portal.
- **UI consistency:** Tailwind design system applied; clear badges, tables, empty states; desktop-first responsive.
- **Stability:** no console errors during core demo paths; conflict checks/warnings behave as specified.
