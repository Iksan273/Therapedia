import { lazy } from "react";
import Welcome from "@/features/auth/pages/Welcome";

// Semua halaman (kecuali Welcome) di-lazy agar tiap modul jadi chunk terpisah.
const Home = lazy(() => import("@/features/landing/pages/Home"));
const Login = lazy(() => import("@/features/auth/pages/Login"));
const RoleSelect = lazy(() => import("@/features/auth/pages/RoleSelect"));
const AssessmentFill = lazy(() => import("@/features/assessment/pages/AssessmentFill"));
const AssessmentMasterData = lazy(() => import("@/features/assessment/pages/AssessmentMasterData"));
const ParentAssessmentView = lazy(() => import("@/features/assessment/pages/ParentAssessmentView"));
const DashboardInquiry = lazy(() => import("@/features/inquiry/pages/DashboardInquiry"));
const InquiryPipeline = lazy(() => import("@/features/inquiry/pages/InquiryPipeline"));
const ClientDetailInquiry = lazy(() => import("@/features/inquiry/pages/ClientDetailInquiry"));
const InquiryMasterData = lazy(() => import("@/features/inquiry/pages/InquiryMasterData"));
const DashboardSchedule = lazy(() => import("@/features/schedule/pages/DashboardSchedule"));
const ActiveClients = lazy(() => import("@/features/schedule/pages/ActiveClients"));
const ActiveClientDetail = lazy(() => import("@/features/schedule/pages/ActiveClientDetail"));
const CalendarPage = lazy(() => import("@/features/schedule/pages/CalendarPage"));
const UnreportedSessions = lazy(() => import("@/features/schedule/pages/UnreportedSessions"));
const Holidays = lazy(() => import("@/features/schedule/pages/Holidays"));
const MySchedule = lazy(() => import("@/features/therapist/pages/MySchedule"));
const TherapistSummary = lazy(() => import("@/features/therapist/pages/TherapistSummary"));
const TherapistClientDetail = lazy(() => import("@/features/therapist/pages/TherapistClientDetail"));
const PrintClientReport = lazy(() => import("@/features/therapist/pages/PrintClientReport"));
const ClientDashboard = lazy(() => import("@/features/parent/pages/ClientDashboard"));
const DashboardRevenue = lazy(() => import("@/features/master/pages/DashboardRevenue"));
const BranchPerformance = lazy(() => import("@/features/master/pages/BranchPerformance"));
const BranchManagement = lazy(() => import("@/features/master/pages/BranchManagement"));
const UserManagement = lazy(() => import("@/features/master/pages/UserManagement"));
const RoleModuleAccess = lazy(() => import("@/features/master/pages/RoleModuleAccess"));
const FinancePortal = lazy(() => import("@/features/finance/pages/FinancePortal"));

const STAFF_ROLES = ["master", "manager", "admin_inquiry", "admin_schedule", "finance", "therapist"];

// Route publik (tanpa AppLayout & tanpa guard)
export const PUBLIC_ROUTES = [
  { path: "/", Component: Welcome },
  { path: "/landing", Component: Home },
  { path: "/home", Component: Home },
  { path: "/roles", Component: RoleSelect },
  { path: "/login", Component: Login },
  { path: "/assessment", Component: AssessmentFill },
];

// Route terproteksi tanpa AppLayout (halaman cetak)
export const STANDALONE_ROUTES = [
  { path: "/print/client/:id", roles: STAFF_ROLES, modules: ["therapist_module", "active_clients"], Component: PrintClientReport },
];

// Grup route ber-layout. `roles` = role sistem yang boleh masuk grup; `module` per halaman = key RBAC
// (dipakai untuk role kustom). `redirect` = index route yang mengarahkan ke halaman lain.
export const PROTECTED_GROUPS = [
  {
    path: "/master",
    roles: ["master"],
    children: [
      { index: true, redirect: "/master/revenue" },
      { path: "revenue", Component: DashboardRevenue, module: "revenue" },
      { path: "branch-performance", Component: BranchPerformance, module: "revenue" },
      { path: "branches", Component: BranchManagement, module: "branch_master" },
      { path: "users", Component: UserManagement, module: "user_management" },
      { path: "rbac", Component: RoleModuleAccess, module: "rbac" },
    ],
  },
  {
    path: "/manager",
    roles: ["manager"],
    children: [
      { index: true, redirect: "/manager/revenue" },
      { path: "revenue", Component: DashboardRevenue, module: "revenue" },
    ],
  },
  {
    path: "/finance",
    roles: ["master", "finance"],
    children: [{ index: true, Component: FinancePortal, module: "finance" }],
  },
  {
    path: "/admin-inquiry",
    roles: ["master", "manager", "admin_inquiry", "therapist"],
    children: [
      { index: true, Component: DashboardInquiry, module: "inquiry_dashboard" },
      { path: "dashboard", Component: DashboardInquiry, module: "inquiry_dashboard" },
      { path: "pipeline", Component: InquiryPipeline, module: "inquiry_pipeline" },
      { path: "pipeline/:id", Component: ClientDetailInquiry, module: "inquiry_pipeline" },
      { path: "clients/:id", Component: ClientDetailInquiry, module: "inquiry_pipeline" },
      { path: "assessments", Component: AssessmentMasterData, module: "inquiry_pipeline" },
      { path: "master-data", Component: InquiryMasterData, module: "inquiry_pipeline" },
      { path: "parent-assessment/:id", Component: ParentAssessmentView, module: "inquiry_pipeline" },
    ],
  },
  {
    path: "/admin-schedule",
    roles: ["master", "manager", "admin_schedule", "finance"],
    children: [
      { index: true, Component: DashboardSchedule, module: "schedule_dashboard" },
      { path: "calendar", Component: CalendarPage, module: "weekly_calendar" },
      { path: "clients", Component: ActiveClients, module: "active_clients" },
      { path: "clients/:id", Component: ActiveClientDetail, module: "active_clients" },
      { path: "unreported-reports", Component: UnreportedSessions, module: "unreported_reports" },
      { path: "holidays", Component: Holidays, module: "holidays" },
    ],
  },
  {
    path: "/therapist",
    roles: ["therapist"],
    children: [
      { index: true, Component: MySchedule, module: "therapist_module" },
      { path: "summary", Component: TherapistSummary, module: "therapist_module" },
      { path: "clients/:id", Component: TherapistClientDetail, module: "therapist_module" },
      { path: "parent-assessment/:id", Component: ParentAssessmentView, module: "therapist_module" },
    ],
  },
  {
    path: "/client",
    roles: ["client"],
    children: [{ index: true, Component: ClientDashboard }],
  },
];

// Modul RBAC yang membuka sebuah grup bagi role kustom (gabungan modul halaman di dalamnya)
export const groupModules = (group) => [...new Set(group.children.map((c) => c.module).filter(Boolean))];
