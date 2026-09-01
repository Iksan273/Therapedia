import React, { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  KanbanSquare,
  ClipboardList,
  Users,
  CalendarDays,
  Home,
  RotateCcw,
  LogOut,
  FileQuestion,
  Menu,
  ShieldCheck,
  UserCircle2,
  MessageCircle,
  Building2,
  TrendingUp,
  Receipt,
  UserCog,
  ShieldAlert,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { WhatsAppAutomationModal } from "@/components/common/WhatsAppAutomationModal";
import { useAuth } from "@/context/AuthContext";
import { useTherapists } from "@/context/TherapistsContext";
import { useClients } from "@/context/ClientsContext";
import { resetDemoData, BRANCHES } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

const NAV_CONFIG = {
  master: {
    title: "Master Headquarter",
    shortRole: "Master Director",
    items: [
      { to: "/master/revenue", label: "Revenue All-Branch", icon: TrendingUp, end: true, testid: "nav-master-revenue" },
      { to: "/admin-inquiry", label: "Inquiry Dashboard", icon: LayoutDashboard, testid: "nav-master-inquiry-dashboard" },
      { to: "/admin-inquiry/pipeline", label: "Inquiry Pipeline", icon: KanbanSquare, testid: "nav-master-pipeline" },
      { to: "/admin-schedule/calendar", label: "Weekly Calendar", icon: CalendarDays, testid: "nav-master-calendar" },
      { to: "/admin-schedule/clients", label: "Active Clients", icon: Users, testid: "nav-master-clients" },
      { to: "/finance", label: "Finance & Invoices", icon: Receipt, testid: "nav-master-finance" },
      { to: "/master/users", label: "User Management", icon: UserCog, testid: "nav-master-users" },
      { to: "/master/rbac", label: "RBAC Module Access", icon: ShieldCheck, testid: "nav-master-rbac" },
    ],
    extras: [
      { to: "/assessment", label: "Parent Questionnaire Portal", icon: FileQuestion, testid: "nav-assessment-fill" },
    ],
  },
  manager: {
    title: "Branch Manager",
    shortRole: "Operations Manager",
    items: [
      { to: "/manager/revenue", label: "Revenue Overview", icon: TrendingUp, end: true, testid: "nav-manager-revenue" },
      { to: "/admin-inquiry", label: "Inquiry Dashboard", icon: LayoutDashboard, testid: "nav-manager-inquiry-dashboard" },
      { to: "/admin-inquiry/pipeline", label: "Inquiry Pipeline", icon: KanbanSquare, testid: "nav-manager-pipeline" },
      { to: "/admin-schedule/calendar", label: "Weekly Calendar", icon: CalendarDays, testid: "nav-manager-calendar" },
      { to: "/admin-schedule/clients", label: "Active Clients", icon: Users, testid: "nav-manager-clients" },
    ],
    extras: [
      { to: "/assessment", label: "Parent Questionnaire Portal", icon: FileQuestion, testid: "nav-assessment-fill" },
    ],
  },
  admin_inquiry: {
    title: "Admin — Inquiry",
    shortRole: "Inquiry & Intake Admin",
    items: [
      { to: "/admin-inquiry", label: "Inquiry Dashboard", icon: LayoutDashboard, end: true, testid: "nav-inquiry-dashboard" },
      { to: "/admin-inquiry/pipeline", label: "Inquiry Pipeline", icon: KanbanSquare, testid: "nav-inquiry-pipeline" },
      { to: "/admin-inquiry/assessments", label: "Assessment Master Data", icon: ClipboardList, testid: "nav-assessment-master" },
    ],
    extras: [
      { to: "/assessment", label: "Parent Questionnaire Portal", icon: FileQuestion, testid: "nav-assessment-fill" },
    ],
  },
  admin_schedule: {
    title: "Admin — Schedule",
    shortRole: "Schedule & Timetable Admin",
    items: [
      { to: "/admin-schedule", label: "Schedule Dashboard", icon: LayoutDashboard, end: true, testid: "nav-schedule-dashboard" },
      { to: "/admin-schedule/calendar", label: "Weekly Calendar", icon: CalendarDays, testid: "nav-weekly-calendar" },
      { to: "/admin-schedule/clients", label: "Active Clients", icon: Users, testid: "nav-active-clients" },
    ],
    extras: [],
  },
  finance: {
    title: "Role Finance",
    shortRole: "Billing & Verification Specialist",
    items: [
      { to: "/finance", label: "Finance Hub", icon: Receipt, end: true, testid: "nav-finance-hub" },
      { to: "/admin-schedule/clients", label: "Active Clients Roster", icon: Users, testid: "nav-finance-clients" },
    ],
    extras: [],
  },
  therapist: {
    title: "Therapist Portal",
    shortRole: "Clinical Practitioner",
    items: [
      { to: "/therapist", label: "My Clinical Schedule", icon: CalendarDays, end: true, testid: "nav-my-schedule" }
    ],
    extras: [],
  },
  client: {
    title: "Parent Portal",
    shortRole: "Family Care Account",
    items: [
      { to: "/client", label: "My Child Portal", icon: Home, end: true, testid: "nav-client-dashboard" }
    ],
    extras: [
      { to: "/assessment", label: "Fill Questionnaire", icon: FileQuestion, testid: "nav-assessment-fill" },
    ],
  },
};

const Logo = ({ compact = false }) => (
  <div className={cn("flex items-center gap-3", !compact && "px-5 h-16 border-b border-slate-200/80 bg-white")}>
    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm shadow-sky-600/20">
      T
    </div>
    <div className="leading-tight min-w-0">
      <p className="font-bold text-[15px] text-slate-900 tracking-tight">Therapedia</p>
      <p className="text-[11px] font-medium text-slate-500 truncate">Developmental Center</p>
    </div>
  </div>
);

const navLinkClass = ({ isActive }) =>
  cn(
    "relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 group",
    isActive
      ? "bg-sky-50 text-sky-700 font-bold shadow-xs border border-sky-200/60"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
  );

const NavItems = ({ config, onNavigate, testidPrefix = "" }) => (
  <div className="space-y-6">
    <div className="space-y-1">
      <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {config.title}
      </p>
      {config.items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={navLinkClass}
          onClick={onNavigate}
          data-testid={`${testidPrefix}${item.testid}`}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-sky-600" />
              )}
              <item.icon
                className={cn(
                  "w-[18px] h-[18px] shrink-0 transition-transform duration-150 group-hover:scale-105",
                  isActive ? "text-sky-600 stroke-[2.2]" : "text-slate-400 group-hover:text-slate-600"
                )}
              />
              <span className="truncate">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>

    {config.extras.length > 0 && (
      <div className="space-y-1 pt-2 border-t border-slate-100">
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Questionnaire
        </p>
        {config.extras.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={navLinkClass}
            onClick={onNavigate}
            data-testid={`${testidPrefix}${item.testid}`}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    "w-[18px] h-[18px] shrink-0",
                    isActive ? "text-sky-600" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    )}
  </div>
);

const ResetDemoButton = ({ testid = "reset-demo-data-button" }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button
        variant="ghost"
        className="w-full justify-start gap-2.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50/60 rounded-xl transition-colors h-10"
        data-testid={testid}
      >
        <RotateCcw className="w-4 h-4 text-slate-400 group-hover:text-rose-500" />
        Reset Demo Data
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl p-6 border-slate-200">
      <AlertDialogHeader>
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mb-3">
          <ShieldAlert className="w-6 h-6 stroke-[2]" />
        </div>
        <AlertDialogTitle className="text-xl font-bold text-slate-900">Reset all demo data?</AlertDialogTitle>
        <AlertDialogDescription className="text-sm text-slate-600 leading-relaxed">
          This will restore all seed clients, 3 branches, multi-packages, and scheduling timetables to default state.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="mt-4 gap-2">
        <AlertDialogCancel className="rounded-xl border-slate-200" data-testid="reset-demo-cancel-button">
          Keep Working
        </AlertDialogCancel>
        <AlertDialogAction
          className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl"
          onClick={resetDemoData}
          data-testid="reset-demo-confirm-button"
        >
          Confirm & Reset
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

const AppLayout = () => {
  const { auth, logout, activeBranch, setActiveBranch } = useAuth();
  const { getTherapist } = useTherapists();
  const { getClient } = useClients();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [waModalOpen, setWaModalOpen] = useState(false);

  const config = NAV_CONFIG[auth.role] || { title: "", shortRole: "", items: [], extras: [] };

  let identity = config.title;
  let identitySub = config.shortRole;

  if (auth.role === "therapist" && auth.therapistId) {
    const t = getTherapist(auth.therapistId);
    identity = t ? t.name : identity;
    identitySub = t ? t.specialty : identitySub;
  }
  if (auth.role === "client" && auth.clientId) {
    const c = getClient(auth.clientId);
    identity = c ? `${c.parentName} (${c.clientName})` : identity;
    identitySub = "Parent Account";
  }
  if (auth.staffName) {
    identity = auth.staffName;
  }

  const handleSwitchRole = () => {
    setMobileNavOpen(false);
    logout();
    navigate("/");
  };

  const isStaff = ["master", "manager", "admin_inquiry", "admin_schedule", "finance", "therapist"].includes(auth.role);
  const canSwitchBranch = ["master", "manager"].includes(auth.role);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200/90 z-30 shadow-xs">
        <Logo />

        {/* User Identity Chip */}
        <div className="px-4 py-3 mx-3 mt-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">
            <UserCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800 truncate">{identity}</p>
            <p className="text-[11px] font-medium text-slate-500 truncate">{identitySub}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <NavItems config={config} />
        </nav>

        <div className="p-3 border-t border-slate-200/80 space-y-1.5 bg-slate-50/50">
          <ResetDemoButton />
          <Button
            variant="outline"
            className="w-full justify-start gap-2.5 text-xs font-semibold text-slate-700 hover:text-sky-700 hover:bg-sky-50 border-slate-200 rounded-xl h-10 transition-colors"
            onClick={handleSwitchRole}
            data-testid="switch-role-button"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            Switch Active Role
          </Button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="md:ml-64 flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 h-16 glass-header border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-6 lg:px-8 gap-3">
          {/* Mobile hamburger & brand */}
          <div className="flex items-center gap-2 md:hidden min-w-0">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-xl hover:bg-slate-100"
                  aria-label="Open menu"
                  data-testid="mobile-menu-button"
                >
                  <Menu className="w-5 h-5 text-slate-700" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col border-r border-slate-200" data-testid="mobile-nav-drawer">
                <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                <SheetDescription className="sr-only">Select a page to navigate to</SheetDescription>
                <div className="px-5 h-16 flex items-center border-b border-slate-200 bg-white">
                  <Logo compact />
                </div>
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">
                    <UserCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Signed in as</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{identity}</p>
                  </div>
                </div>
                <nav className="flex-1 px-3 py-4 overflow-y-auto">
                  <NavItems config={config} onNavigate={() => setMobileNavOpen(false)} testidPrefix="mobile-" />
                </nav>
                <div className="p-3 border-t border-slate-200 space-y-1.5 bg-slate-50/50">
                  <ResetDemoButton testid="mobile-reset-demo-data-button" />
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2.5 text-xs font-semibold text-slate-700 hover:text-sky-700 hover:bg-sky-50 border-slate-200 rounded-xl h-10"
                    onClick={handleSwitchRole}
                    data-testid="mobile-switch-role-button"
                  >
                    <LogOut className="w-4 h-4 text-slate-400" />
                    Switch Active Role
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-sky-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
                T
              </div>
              <span className="font-bold text-sm text-slate-900 truncate">Therapedia</span>
            </div>
          </div>

          {/* Desktop header title & branch switcher */}
          <div className="hidden md:flex items-center gap-3 text-sm text-slate-500">
            <span className="font-bold text-slate-900">Therapedia Developmental Center</span>
            <span className="text-slate-300">/</span>

            {/* Branch Switcher */}
            {canSwitchBranch ? (
              <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/90 rounded-xl px-2 py-1 shadow-2xs">
                <Building2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <Select value={activeBranch} onValueChange={setActiveBranch}>
                  <SelectTrigger className="h-7 border-none bg-transparent shadow-none text-xs font-bold text-slate-800 focus:ring-0 p-0 gap-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="all">🏢 All Branches (Semua Cabang)</SelectItem>
                    {BRANCHES.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        📍 {b.name} ({b.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <span className="text-slate-700 font-semibold bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 text-xs flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                {BRANCHES.find((b) => b.id === (auth.branchId || activeBranch))?.name || "Surabaya Timur"}
              </span>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {isStaff && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors shadow-2xs font-bold text-xs h-9"
                onClick={() => setWaModalOpen(true)}
                title="WhatsApp Hub"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">WhatsApp Hub</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl border-slate-200 text-slate-700 hover:text-sky-700 hover:bg-sky-50 transition-colors shadow-2xs font-semibold text-xs h-9"
              onClick={handleSwitchRole}
              data-testid="topbar-switch-role-button"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span>Switch Role</span>
            </Button>
          </div>
        </header>

        {/* Main Content View */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <WhatsAppAutomationModal open={waModalOpen} onOpenChange={setWaModalOpen} />
    </div>
  );
};

export default AppLayout;
