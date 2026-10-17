import { buildNavConfig, navItemEnd } from "@/app/layout/navConfig";
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

describe("modul akses terpisah: Assessment Master Data, Master Layanan, Performa All-Branch", () => {
  const NEW_MODULES = ["assessment_master", "inquiry_master_data", "branch_performance"];

  test("terdaftar di ACCESS_MODULES dan setiap role punya nilai untuk semuanya", () => {
    const keys = ACCESS_MODULES.map((m) => m.key);
    NEW_MODULES.forEach((m) => expect(keys).toContain(m));
    Object.entries(DEFAULT_PERMISSIONS).forEach(([role, perms]) => {
      keys.forEach((key) => expect(typeof perms[key], `${role}.${key}`).toBe("boolean"));
    });
  });

  test("default: admin_inquiry tetap membuka dua halaman master inquiry, manager tidak, Performa All-Branch hanya master", () => {
    expect(navFor("admin_inquiry")).toEqual(expect.arrayContaining(["/admin-inquiry/assessments", "/admin-inquiry/master-data"]));
    expect(navFor("manager")).not.toContain("/admin-inquiry/assessments");
    expect(navFor("manager")).not.toContain("/admin-inquiry/master-data");
    expect(navFor("master")).toContain("/master/branch-performance");
    ["manager", "admin_inquiry", "admin_schedule", "finance", "therapist"].forEach((role) => expect(navFor(role)).not.toContain("/master/branch-performance"));
  });

  test("tiga modul dapat diberikan/dicabut terpisah dari inquiry_pipeline dan revenue", () => {
    // Punya inquiry_pipeline TIDAK otomatis membuka halaman master inquiry
    const noMaster = navFor("admin_inquiry", { assessment_master: false, inquiry_master_data: false });
    expect(noMaster).toContain("/admin-inquiry/pipeline");
    expect(noMaster).not.toContain("/admin-inquiry/assessments");
    expect(noMaster).not.toContain("/admin-inquiry/master-data");

    // Hanya assessment_master: menu Assessment Master Data saja
    const onlyAssessment = navFor("admin_inquiry", { inquiry_master_data: false });
    expect(onlyAssessment).toContain("/admin-inquiry/assessments");
    expect(onlyAssessment).not.toContain("/admin-inquiry/master-data");

    // Punya revenue TIDAK membuka Performa All-Branch; sebaliknya modul barunya tidak membuka Revenue
    expect(navFor("manager")).toContain("/manager/revenue");
    expect(navFor("manager")).not.toContain("/master/branch-performance");
    expect(navFor("manager", { branch_performance: true })).toContain("/master/branch-performance");
    const onlyPerformance = navFor("finance", { revenue: false, branch_performance: true });
    expect(onlyPerformance).toContain("/master/branch-performance");
    expect(onlyPerformance).not.toContain("/master/revenue");
  });

  test("role kustom mendapat menu dari modul barunya sendiri", () => {
    const hasPermission = (m) => m === "inquiry_master_data";
    const items = buildNavConfig({ role: "koordinator", roleObj: { id: "koordinator", label: "Koordinator", badge: "K" }, hasPermission }).items.map((i) => i.to);
    expect(items).toEqual(["/admin-inquiry/master-data"]);
  });
});

// Highlight menu: tidak boleh ada dua menu aktif sekaligus. Menu induk (mis. /admin-inquiry) yang `to`-nya awalan dari menu lain
// harus dicocokkan persis (end), kalau tidak ia ikut menyala di /admin-inquiry/pipeline (bug QA 17 Okt 2026).
describe("highlight menu sidebar (end)", () => {
  const allRoles = ["master", "manager", "admin_inquiry", "admin_schedule", "finance", "therapist", "client"];
  const allowAll = () => true;
  const { matchPath } = require("react-router-dom");

  const activeItems = (items, pathname) =>
    items.filter((item) => matchPath({ path: item.to, end: navItemEnd(item, items) }, pathname));

  test("di /admin-inquiry/pipeline hanya Inquiry Pipeline yang aktif (master, manager, admin_inquiry)", () => {
    ["master", "manager", "admin_inquiry"].forEach((role) => {
      const items = buildNavConfig({ role, roleObj: null, hasPermission: allowAll }).items;
      expect(activeItems(items, "/admin-inquiry/pipeline").map((i) => i.to), role).toEqual(["/admin-inquiry/pipeline"]);
      expect(activeItems(items, "/admin-inquiry/pipeline/c-009").map((i) => i.to), `${role} detail`).toEqual(["/admin-inquiry/pipeline"]);
      expect(activeItems(items, "/admin-inquiry").map((i) => i.to), `${role} dashboard`).toEqual(["/admin-inquiry"]);
    });
  });

  test("untuk setiap role dan setiap rute menu: tepat satu menu aktif (tidak pernah dua menu menyala)", () => {
    allRoles.forEach((role) => {
      const items = buildNavConfig({ role, roleObj: null, hasPermission: allowAll }).items;
      items.forEach((target) => {
        // Menu dengan `end` (halaman dashboard tunggal) hanya aktif di rutenya sendiri; menu lain juga aktif di sub-rutenya (mis. detail)
        const paths = navItemEnd(target, items) ? [target.to] : [target.to, `${target.to}/contoh-id`];
        paths.forEach((pathname) => {
          const active = activeItems(items, pathname).map((i) => i.to);
          expect(active, `${role} @ ${pathname}`).toEqual([target.to]);
        });
      });
    });
  });

  test("role kustom (semua modul) juga tepat satu menu aktif", () => {
    const items = buildNavConfig({ role: "koordinator", roleObj: { id: "koordinator", label: "K", badge: "K" }, hasPermission: allowAll }).items;
    items.forEach((target) => {
      expect(activeItems(items, target.to).map((i) => i.to), target.to).toEqual([target.to]);
    });
  });

  test("end eksplisit tetap menang; tanpa end diturunkan dari menu lain", () => {
    const items = [{ to: "/a" }, { to: "/a/b" }, { to: "/c", end: false }, { to: "/c/d" }];
    expect(navItemEnd(items[0], items)).toBe(true);
    expect(navItemEnd(items[1], items)).toBe(false);
    expect(navItemEnd(items[2], items)).toBe(false); // eksplisit
  });
});
