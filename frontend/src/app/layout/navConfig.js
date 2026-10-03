import {
  BarChart3,
  CalendarDays,
  CalendarOff,
  FileWarning,
  ClipboardList,
  Database,
  FileCheck2,
  FileQuestion,
  Home,
  KanbanSquare,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  TrendingUp,
  UserCog,
  Users,
} from "lucide-react";

// Konfigurasi menu sidebar per role sistem.
// `module` = key RBAC (string atau array, salah satu cukup). Item tanpa `module` selalu tampil.
const INQUIRY_ANY = ["inquiry_dashboard", "inquiry_pipeline"];
const ASSESSMENT_FILL = { to: "/assessment", label: "Parent Questionnaire Portal", icon: FileQuestion, testid: "nav-assessment-fill" };

export const NAV_CONFIG = {
  master: {
    title: "Master Headquarter",
    shortRole: "Master Director",
    items: [
      { to: "/master/revenue", label: "Revenue All-Branch", icon: TrendingUp, end: true, module: "revenue", testid: "nav-master-revenue" },
      { to: "/master/branch-performance", label: "Performa Inquiry All-Branch", icon: BarChart3, module: "revenue", testid: "nav-master-branch-performance" },
      { to: "/admin-inquiry", label: "Inquiry Dashboard", icon: LayoutDashboard, module: INQUIRY_ANY, testid: "nav-master-inquiry-dashboard" },
      { to: "/admin-inquiry/pipeline", label: "Inquiry Pipeline", icon: KanbanSquare, module: "inquiry_pipeline", testid: "nav-master-pipeline" },
      { to: "/admin-inquiry/master-data", label: "Master Layanan & Kuadran", icon: Database, module: INQUIRY_ANY, testid: "nav-master-inquiry-master-data" },
      { to: "/admin-schedule/calendar", label: "Weekly Calendar", icon: CalendarDays, module: "weekly_calendar", testid: "nav-master-calendar" },
      { to: "/admin-schedule/clients", label: "Active Clients", icon: Users, module: "active_clients", testid: "nav-master-clients" },
      { to: "/admin-schedule/unreported-reports", label: "Monitoring Laporan Sesi", icon: FileWarning, module: "unreported_reports", testid: "nav-master-unreported" },
      { to: "/admin-schedule/holidays", label: "Hari Libur", icon: CalendarOff, module: "holidays", testid: "nav-master-holidays" },
      { to: "/finance", label: "Finance & Invoices", icon: Receipt, module: "finance", testid: "nav-master-finance" },
      { to: "/master/users", label: "User Management", icon: UserCog, module: "user_management", testid: "nav-master-users" },
      { to: "/master/rbac", label: "RBAC Module Access", icon: ShieldCheck, module: "rbac", testid: "nav-master-rbac" },
    ],
    extras: [ASSESSMENT_FILL],
  },
  manager: {
    title: "Branch Manager",
    shortRole: "Operations Manager",
    items: [
      { to: "/manager/revenue", label: "Revenue Overview", icon: TrendingUp, end: true, module: "revenue", testid: "nav-manager-revenue" },
      { to: "/admin-inquiry", label: "Inquiry Dashboard", icon: LayoutDashboard, module: INQUIRY_ANY, testid: "nav-manager-inquiry-dashboard" },
      { to: "/admin-inquiry/pipeline", label: "Inquiry Pipeline", icon: KanbanSquare, module: "inquiry_pipeline", testid: "nav-manager-pipeline" },
      { to: "/admin-schedule/calendar", label: "Weekly Calendar", icon: CalendarDays, module: "weekly_calendar", testid: "nav-manager-calendar" },
      { to: "/admin-schedule/clients", label: "Active Clients", icon: Users, module: "active_clients", testid: "nav-manager-clients" },
      { to: "/admin-schedule/unreported-reports", label: "Monitoring Laporan Sesi", icon: FileWarning, module: "unreported_reports", testid: "nav-manager-unreported" },
      { to: "/admin-schedule/holidays", label: "Hari Libur", icon: CalendarOff, module: "holidays", testid: "nav-manager-holidays" },
    ],
    extras: [ASSESSMENT_FILL],
  },
  admin_inquiry: {
    title: "Admin — Inquiry",
    shortRole: "Inquiry & Intake Admin",
    items: [
      { to: "/admin-inquiry", label: "Inquiry Dashboard", icon: LayoutDashboard, end: true, module: INQUIRY_ANY, testid: "nav-inquiry-dashboard" },
      { to: "/admin-inquiry/pipeline", label: "Inquiry Pipeline", icon: KanbanSquare, module: "inquiry_pipeline", testid: "nav-inquiry-pipeline" },
      { to: "/admin-inquiry/assessments", label: "Assessment Master Data", icon: ClipboardList, module: INQUIRY_ANY, testid: "nav-assessment-master" },
      { to: "/admin-inquiry/master-data", label: "Master Layanan & Kuadran", icon: Database, module: INQUIRY_ANY, testid: "nav-inquiry-master-data" },
    ],
    extras: [ASSESSMENT_FILL],
  },
  admin_schedule: {
    title: "Admin — Schedule",
    shortRole: "Schedule & Timetable Admin",
    items: [
      { to: "/admin-schedule", label: "Schedule Dashboard", icon: LayoutDashboard, end: true, module: "schedule_dashboard", testid: "nav-schedule-dashboard" },
      { to: "/admin-schedule/calendar", label: "Weekly Calendar", icon: CalendarDays, module: "weekly_calendar", testid: "nav-weekly-calendar" },
      { to: "/admin-schedule/clients", label: "Active Clients", icon: Users, module: "active_clients", testid: "nav-active-clients" },
      { to: "/admin-schedule/unreported-reports", label: "Monitoring Laporan Sesi", icon: FileWarning, module: "unreported_reports", testid: "nav-unreported-reports" },
      { to: "/admin-schedule/holidays", label: "Hari Libur", icon: CalendarOff, module: "holidays", testid: "nav-holidays" },
    ],
    extras: [],
  },
  finance: {
    title: "Role Finance",
    shortRole: "Billing & Verification Specialist",
    items: [
      { to: "/finance", label: "Finance Hub", icon: Receipt, end: true, module: "finance", testid: "nav-finance-hub" },
      { to: "/admin-schedule/clients", label: "Active Clients Roster", icon: Users, module: "active_clients", testid: "nav-finance-clients" },
    ],
    extras: [],
  },
  therapist: {
    title: "Therapist Portal",
    shortRole: "Clinical Practitioner",
    items: [
      { to: "/therapist", label: "My Clinical Schedule", icon: CalendarDays, end: true, module: "therapist_module", testid: "nav-my-schedule" },
      { to: "/therapist/summary", label: "Summary & Laporan Sesi", icon: FileCheck2, end: false, module: "therapist_module", testid: "nav-therapist-summary" },
    ],
    extras: [],
  },
  client: {
    title: "Parent Portal",
    shortRole: "Family Care Account",
    items: [{ to: "/client", label: "My Child Portal", icon: Home, end: true, testid: "nav-client-dashboard" }],
    extras: [{ ...ASSESSMENT_FILL, label: "Fill Questionnaire" }],
  },
};

// Menu untuk role kustom (dibuat di /master/rbac): dibangun dari permission modul.
const CUSTOM_ROLE_ITEMS = [
  { module: "revenue", to: "/master/revenue", label: "Dashboard Revenue", icon: TrendingUp, end: true, testid: "nav-custom-revenue" },
  { module: "inquiry_dashboard", to: "/admin-inquiry", label: "Inquiry Dashboard", icon: LayoutDashboard, end: true, testid: "nav-custom-inquiry-dash" },
  { module: "inquiry_pipeline", to: "/admin-inquiry/pipeline", label: "Inquiry Pipeline", icon: KanbanSquare, testid: "nav-custom-pipeline" },
  { module: "weekly_calendar", to: "/admin-schedule/calendar", label: "Weekly Calendar", icon: CalendarDays, testid: "nav-custom-calendar" },
  { module: "schedule_dashboard", to: "/admin-schedule", label: "Schedule Dashboard", icon: LayoutDashboard, end: true, testid: "nav-custom-sched-dash" },
  { module: "active_clients", to: "/admin-schedule/clients", label: "Active Clients", icon: Users, testid: "nav-custom-clients" },
  { module: "finance", to: "/finance", label: "Finance & Invoices", icon: Receipt, testid: "nav-custom-finance" },
  { module: "user_management", to: "/master/users", label: "User Management", icon: UserCog, testid: "nav-custom-users" },
  { module: "rbac", to: "/master/rbac", label: "RBAC Module Access", icon: ShieldCheck, testid: "nav-custom-rbac" },
  { module: "therapist_module", to: "/therapist", label: "Therapist Module", icon: CalendarDays, testid: "nav-custom-therapist" },
  { module: "unreported_reports", to: "/admin-schedule/unreported-reports", label: "Monitoring Laporan Sesi", icon: FileWarning, testid: "nav-custom-unreported" },
  { module: "holidays", to: "/admin-schedule/holidays", label: "Hari Libur", icon: CalendarOff, testid: "nav-custom-holidays" },
];

const itemAllowed = (item, hasPermission) => {
  if (!item.module) return true;
  const modules = Array.isArray(item.module) ? item.module : [item.module];
  return modules.some(hasPermission);
};

// Konfigurasi nav final untuk user aktif. Master & client tidak difilter permission.
export function buildNavConfig({ role, roleObj, hasPermission }) {
  const base = NAV_CONFIG[role];
  if (!base) {
    if (!role) return { title: "", shortRole: "", items: [], extras: [] };
    return {
      title: roleObj?.label || "Custom Staff Role",
      shortRole: roleObj?.badge || "Operasional Cabang",
      items: CUSTOM_ROLE_ITEMS.filter((i) => itemAllowed(i, hasPermission)),
      extras: [],
    };
  }
  if (role === "master" || role === "client") return base;
  return { ...base, items: base.items.filter((i) => itemAllowed(i, hasPermission)) };
}
