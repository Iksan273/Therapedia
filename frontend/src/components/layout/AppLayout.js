import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  KanbanSquare,
  ClipboardList,
  Users,
  CalendarDays,
  Home,
  RotateCcw,
  LogOut,
  FilePlus2,
  FileQuestion,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
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
import { useAuth } from "@/context/AuthContext";
import { useTherapists } from "@/context/TherapistsContext";
import { useClients } from "@/context/ClientsContext";
import { resetDemoData } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

const NAV_CONFIG = {
  admin_inquiry: {
    title: "Admin — Inquiry",
    items: [
      { to: "/admin-inquiry", label: "Dashboard", icon: LayoutDashboard, end: true, testid: "sidebar-nav-dashboard-link" },
      { to: "/admin-inquiry/pipeline", label: "Inquiry Pipeline", icon: KanbanSquare, testid: "sidebar-nav-inquiry-pipeline-link" },
      { to: "/admin-inquiry/assessments", label: "Assessment Master Data", icon: ClipboardList, testid: "sidebar-nav-assessment-master-link" },
    ],
    extras: [
      { to: "/inquiry", label: "Public Inquiry Form", icon: FilePlus2, testid: "sidebar-nav-public-inquiry-link" },
      { to: "/assessment", label: "Assessment Fill Page", icon: FileQuestion, testid: "sidebar-nav-assessment-fill-link" },
    ],
  },
  admin_schedule: {
    title: "Admin — Schedule",
    items: [
      { to: "/admin-schedule", label: "Dashboard", icon: LayoutDashboard, end: true, testid: "sidebar-nav-dashboard-link" },
      { to: "/admin-schedule/clients", label: "Active Clients", icon: Users, testid: "sidebar-nav-active-clients-link" },
      { to: "/admin-schedule/calendar", label: "Weekly Calendar", icon: CalendarDays, testid: "sidebar-nav-weekly-calendar-link" },
    ],
    extras: [],
  },
  therapist: {
    title: "Therapist",
    items: [{ to: "/therapist", label: "My Schedule", icon: CalendarDays, end: true, testid: "sidebar-nav-my-schedule-link" }],
    extras: [],
  },
  client: {
    title: "Client Portal",
    items: [{ to: "/client", label: "My Dashboard", icon: Home, end: true, testid: "sidebar-nav-client-dashboard-link" }],
    extras: [],
  },
};

const Logo = ({ compact = false }) => (
  <div className={cn("flex items-center gap-3", !compact && "px-5 h-16 border-b border-[var(--color-border)]")}>
    <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)] flex items-center justify-center text-white font-semibold text-lg shrink-0">
      T
    </div>
    <div className="leading-tight">
      <p className="font-semibold text-[15px] text-[var(--color-text)]">Therapedia</p>
      <p className="text-[11px] text-[var(--color-text-muted)]">Developmental Center</p>
    </div>
  </div>
);

const navLinkClass = ({ isActive }) =>
  cn(
    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150",
    isActive
      ? "bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]"
      : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
  );

// Shared nav list used by both the desktop sidebar and the mobile drawer.
const NavItems = ({ config, onNavigate, testidPrefix = "" }) => (
  <>
    <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
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
        <item.icon className="w-[18px] h-[18px]" />
        {item.label}
      </NavLink>
    ))}
    {config.extras.length > 0 && (
      <>
        <p className="px-3 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Public Pages
        </p>
        {config.extras.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={navLinkClass}
            onClick={onNavigate}
            data-testid={`${testidPrefix}${item.testid}`}
          >
            <item.icon className="w-[18px] h-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </>
    )}
  </>
);

const ResetDemoButton = ({ testid = "reset-demo-data-button" }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
        data-testid={testid}
      >
        <RotateCcw className="w-[18px] h-[18px]" />
        Reset Demo Data
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-xl">
      <AlertDialogHeader>
        <AlertDialogTitle>Reset all demo data?</AlertDialogTitle>
        <AlertDialogDescription>
          This clears every change you made and restores the original seed data. The page will reload.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel data-testid="reset-demo-cancel-button">Cancel</AlertDialogCancel>
        <AlertDialogAction
          className="bg-[var(--color-danger)] hover:bg-red-600"
          onClick={resetDemoData}
          data-testid="reset-demo-confirm-button"
        >
          Reset Data
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

const AppLayout = () => {
  const { auth, logout } = useAuth();
  const { getTherapist } = useTherapists();
  const { getClient } = useClients();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const config = NAV_CONFIG[auth.role] || { title: "", items: [], extras: [] };

  let identity = config.title;
  if (auth.role === "therapist" && auth.therapistId) {
    const t = getTherapist(auth.therapistId);
    identity = t ? t.name : identity;
  }
  if (auth.role === "client" && auth.clientId) {
    const c = getClient(auth.clientId);
    identity = c ? `${c.parentName} (${c.clientName})` : identity;
  }

  const handleSwitchRole = () => {
    setMobileNavOpen(false);
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-white border-r border-[var(--color-border)] z-30">
        <Logo />
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavItems config={config} />
        </nav>
        <div className="p-3 border-t border-[var(--color-border)] space-y-1">
          <ResetDemoButton />
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-[var(--color-text-muted)]"
            onClick={handleSwitchRole}
            data-testid="switch-role-button"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Switch Role
          </Button>
        </div>
      </aside>

      {/* Main area */}
      <div className="md:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 h-16 bg-white/85 backdrop-blur border-b border-[var(--color-border)] flex items-center justify-between px-3 sm:px-6 lg:px-8 gap-2">
          {/* Mobile: hamburger + logo */}
          <div className="flex items-center gap-1.5 md:hidden min-w-0">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label="Open menu"
                  data-testid="mobile-menu-button"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col" data-testid="mobile-nav-drawer">
                <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                <SheetDescription className="sr-only">Select a page to navigate to</SheetDescription>
                <div className="px-5 h-16 flex items-center border-b border-[var(--color-border)]">
                  <Logo compact />
                </div>
                <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                  <p className="text-[11px] text-[var(--color-text-muted)]">Signed in as</p>
                  <p className="text-sm font-medium truncate">{identity}</p>
                </div>
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                  <NavItems config={config} onNavigate={() => setMobileNavOpen(false)} testidPrefix="mobile-" />
                </nav>
                <div className="p-3 border-t border-[var(--color-border)] space-y-1">
                  <ResetDemoButton testid="mobile-reset-demo-data-button" />
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-[var(--color-text-muted)]"
                    onClick={handleSwitchRole}
                    data-testid="mobile-switch-role-button"
                  >
                    <LogOut className="w-[18px] h-[18px]" />
                    Switch Role
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center text-white font-semibold shrink-0">
                T
              </div>
              <span className="font-semibold text-sm truncate">Therapedia</span>
            </div>
          </div>

          {/* Desktop: identity */}
          <div className="hidden md:block text-sm text-[var(--color-text-muted)]">
            Signed in as <span className="font-medium text-[var(--color-text)]" data-testid="topbar-identity">{identity}</span>
          </div>

          {/* Mobile: quick switch-role shortcut */}
          <Button
            variant="outline"
            size="sm"
            className="md:hidden gap-1.5 shrink-0"
            onClick={handleSwitchRole}
            data-testid="mobile-topbar-switch-role-button"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs">Switch</span>
          </Button>
        </header>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
