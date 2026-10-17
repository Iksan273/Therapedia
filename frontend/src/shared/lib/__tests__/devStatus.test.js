import { FINANCE_TABS_READY, matchesDevPath } from "@/shared/lib/devStatus";

describe("devStatus: modul yang belum tersambung API", () => {
  test("halaman Sprint 2+ ditandai dev, termasuk rute berparameter", () => {
    ["/master/revenue", "/manager/revenue", "/master/branch-performance", "/admin-schedule", "/admin-schedule/calendar", "/admin-schedule/clients/12",
      "/admin-schedule/unreported-reports", "/admin-schedule/therapist-utilization", "/admin-inquiry", "/admin-inquiry/dashboard", "/therapist", "/therapist/summary", "/therapist/clients/5", "/client", "/print/client/9"]
      .forEach((p) => expect(matchesDevPath(p), p).toBe(true));
  });

  test("halaman M1–M5 (dan roster/hari libur) TIDAK ditandai dev", () => {
    ["/master/branches", "/master/users", "/master/rbac", "/admin-inquiry/pipeline", "/admin-inquiry/pipeline/3", "/admin-inquiry/assessments",
      "/admin-inquiry/master-data", "/admin-inquiry/parent-assessment/3", "/admin-schedule/clients", "/admin-schedule/holidays", "/finance", "/assessment", "/login"]
      .forEach((p) => expect(matchesDevPath(p), p).toBe(false));
  });

  test("tab Finance yang sudah API: Menunggu Pembayaran dan Master Paket", () => {
    expect(FINANCE_TABS_READY).toEqual(["verification", "packages"]);
  });
});
