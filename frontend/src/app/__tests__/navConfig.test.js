import { buildNavConfig } from "@/app/layout/navConfig";
import { ACCESS_MODULES, DEFAULT_PERMISSIONS, roleHasPermission, withDefaultPermissions } from "@/domain/rbac";

const navFor = (role, overrides = {}) => {
  const permissions = withDefaultPermissions({ [role]: overrides });
  const hasPermission = (m) => roleHasPermission(role, permissions, m);
  return buildNavConfig({ role, roleObj: null, hasPermission }).items.map((i) => i.to);
};

describe("menu sidebar mengikuti RBAC", () => {
  test("master melihat semua modul (dashboard schedule, asesmen, finance, terapis, dst)", () => {
    const tos = navFor("master");
    [
      "/master/revenue", "/master/branch-performance", "/admin-inquiry", "/admin-inquiry/pipeline", "/admin-inquiry/assessments",
      "/admin-inquiry/master-data", "/admin-schedule", "/admin-schedule/calendar", "/admin-schedule/clients",
      "/admin-schedule/unreported-reports", "/admin-schedule/holidays", "/admin-schedule/therapist-utilization", "/finance", "/master/branches", "/master/users",
      "/master/rbac", "/therapist", "/therapist/summary", "/therapist/team-calendar",
    ].forEach((to) => expect(tos).toContain(to));
  });

  test("setiap modul RBAC punya minimal satu menu bagi master", () => {
    expect(ACCESS_MODULES.length).toBeGreaterThan(0);
    expect(navFor("master").length).toBeGreaterThanOrEqual(ACCESS_MODULES.length);
  });

  test("role sistem mendapat menu modul yang diberikan lewat RBAC, dan kehilangan menu yang dicabut", () => {
    expect(navFor("finance")).not.toContain("/admin-schedule/holidays");
    expect(navFor("finance", { holidays: true, schedule_dashboard: true })).toEqual(expect.arrayContaining(["/admin-schedule/holidays", "/admin-schedule"]));
    expect(navFor("admin_schedule")).toContain("/admin-schedule/holidays");
    expect(navFor("admin_schedule", { holidays: false })).not.toContain("/admin-schedule/holidays");
    expect(navFor("admin_inquiry", { finance: true })).toContain("/finance");
  });

  test("Utilisasi Terapis: default untuk master, manager, admin_schedule; terapis punya Kalender Tim lewat modul therapist_module", () => {
    expect(navFor("admin_schedule")).toContain("/admin-schedule/therapist-utilization");
    expect(navFor("manager")).toContain("/admin-schedule/therapist-utilization");
    expect(navFor("finance")).not.toContain("/admin-schedule/therapist-utilization");
    expect(navFor("finance", { therapist_utilization: true })).toContain("/admin-schedule/therapist-utilization");
    expect(navFor("therapist")).toContain("/therapist/team-calendar");
  });

  test("default admin_inquiry tidak punya menu finance", () => {
    expect(DEFAULT_PERMISSIONS.admin_inquiry.finance).toBe(false);
    expect(navFor("admin_inquiry")).not.toContain("/finance");
  });
});
