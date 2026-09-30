import React, { createContext, useContext } from "react";
import { usePersistentState } from "@/hooks/useLocalStorage";

const EMPTY_AUTH = {
  role: null,
  therapistId: null,
  clientId: null,
  staffName: null,
  branchId: null,
};

export const ACCESS_MODULES = [
  { key: "revenue", label: "Dashboard Revenue", desc: "Akses omzet & analitik finansial all-branch", category: "Financial" },
  { key: "inquiry_pipeline", label: "Inquiry Pipeline", desc: "Intake client baru & kanban pipeline", category: "Inquiry" },
  { key: "inquiry_dashboard", label: "Inquiry Dashboard", desc: "Ringkasan statistik & KPI inquiry", category: "Inquiry" },
  { key: "weekly_calendar", label: "Weekly Calendar", desc: "Manajemen timetable mingguan & booking slot", category: "Scheduling" },
  { key: "schedule_dashboard", label: "Schedule Dashboard", desc: "Ringkasan statistik & KPI penjadwalan", category: "Scheduling" },
  { key: "active_clients", label: "Active Client", desc: "Roster client aktif & Birthday Hub", category: "Scheduling" },
  { key: "finance", label: "Finance & Invoices", desc: "Verifikasi transfer, input tagihan, & renewal", category: "Financial" },
  { key: "user_management", label: "User Management", desc: "Kelola akun staff dan lokasi cabang", category: "Administration" },
  { key: "rbac", label: "RBAC", desc: "Konfigurasi hak akses role & modul sistem", category: "Administration" },
  { key: "therapist_module", label: "Therapist Module", desc: "Sesi klinis, activity log & homework terapis", category: "Clinical" },
];

export const DEFAULT_ROLES = [
  {
    id: "master",
    label: "Master Director",
    badge: "Headquarter",
    isSystem: true,
    description: "Akses penuh tanpa batas ke seluruh modul operasional sistem",
  },
  {
    id: "manager",
    label: "Branch Manager",
    badge: "Manajemen Cabang",
    isSystem: true,
    description: "Supervisi omzet, pipeline, kalender, dan client cabang",
  },
  {
    id: "admin_inquiry",
    label: "Admin Inquiry",
    badge: "Intake & Asesmen",
    isSystem: true,
    description: "Fokus pada penerimaan client baru, pipeline, dan data asesmen",
  },
  {
    id: "admin_schedule",
    label: "Admin Schedule",
    badge: "Timetable & Roster",
    isSystem: true,
    description: "Pengelolaan kalender mingguan, roster client aktif, & slot",
  },
  {
    id: "finance",
    label: "Role Finance",
    badge: "Billing & Verifikasi",
    isSystem: true,
    description: "Verifikasi pembayaran, penerbitan invoice, & data client",
  },
  {
    id: "therapist",
    label: "Therapist",
    badge: "Praktisi Klinis",
    isSystem: true,
    description: "Akses ke jadwal klinik mandiri dan ringkasan dokumentasi terapis",
  },
];

const DEFAULT_PERMISSIONS = {
  master: {
    revenue: true,
    inquiry_pipeline: true,
    inquiry_dashboard: true,
    weekly_calendar: true,
    schedule_dashboard: true,
    active_clients: true,
    finance: true,
    user_management: true,
    rbac: true,
    therapist_module: true,
    inquiry: true,
    schedule: true,
    therapist: true,
  },
  manager: {
    revenue: true,
    inquiry_pipeline: true,
    inquiry_dashboard: true,
    weekly_calendar: true,
    schedule_dashboard: true,
    active_clients: true,
    finance: false,
    user_management: false,
    rbac: false,
    therapist_module: false,
    inquiry: true,
    schedule: true,
    therapist: false,
  },
  admin_inquiry: {
    revenue: false,
    inquiry_pipeline: true,
    inquiry_dashboard: true,
    weekly_calendar: false,
    schedule_dashboard: false,
    active_clients: false,
    finance: false,
    user_management: false,
    rbac: false,
    therapist_module: false,
    inquiry: true,
    schedule: false,
    therapist: false,
  },
  admin_schedule: {
    revenue: false,
    inquiry_pipeline: false,
    inquiry_dashboard: false,
    weekly_calendar: true,
    schedule_dashboard: true,
    active_clients: true,
    finance: false,
    user_management: false,
    rbac: false,
    therapist_module: false,
    inquiry: false,
    schedule: true,
    therapist: false,
  },
  finance: {
    revenue: true,
    inquiry_pipeline: false,
    inquiry_dashboard: false,
    weekly_calendar: false,
    schedule_dashboard: false,
    active_clients: true,
    finance: true,
    user_management: false,
    rbac: false,
    therapist_module: false,
    inquiry: false,
    schedule: false,
    therapist: false,
  },
  therapist: {
    revenue: false,
    inquiry_pipeline: false,
    inquiry_dashboard: false,
    weekly_calendar: false,
    schedule_dashboard: false,
    active_clients: false,
    finance: false,
    user_management: false,
    rbac: false,
    therapist_module: true,
    inquiry: false,
    schedule: false,
    therapist: true,
  },
};

const DEFAULT_STAFF = [
  { id: "usr-001", name: "dr. Anita Wijaya, Sp.KFR", email: "anita.wijaya@therapedia.id", role: "manager", branchId: "branch-sby-timur" },
  { id: "usr-002", name: "Budi Santoso, S.Ft, Ftr", email: "budi.santoso@therapedia.id", role: "manager", branchId: "branch-citraland" },
  { id: "usr-003", name: "dr. Hendra Setiawan, Sp.A", email: "hendra.setiawan@therapedia.id", role: "manager", branchId: "branch-sby-barat" },
  { id: "usr-004", name: "Rina Oktavia (Admin Inquiry)", email: "inquiry@therapedia.id", role: "admin_inquiry", branchId: "branch-sby-timur" },
  { id: "usr-005", name: "Fajar Prasetyo (Admin Schedule)", email: "schedule@therapedia.id", role: "admin_schedule", branchId: "branch-citraland" },
  { id: "usr-006", name: "Siti Rahmawati, S.E. (Finance)", email: "finance@therapedia.id", role: "finance", branchId: "branch-sby-timur" },
  { id: "usr-007", name: "Dr. Maya Chen, S.Tr.Kes", email: "maya.chen@therapedia.id", role: "therapist", branchId: "branch-sby-timur", therapistId: "t-001" },
  { id: "usr-008", name: "James Rodriguez, S.Ft", email: "james.rodriguez@therapedia.id", role: "therapist", branchId: "branch-citraland", therapistId: "t-002" },
  { id: "usr-009", name: "Aisha Patel, S.Psi, M.Psi", email: "aisha.patel@therapedia.id", role: "therapist", branchId: "branch-sby-timur", therapistId: "t-003" },
  { id: "usr-010", name: "Dimas Anggara, A.Md.OT", email: "dimas.ot@therapedia.id", role: "therapist", branchId: "branch-sby-barat", therapistId: "t-004" },
  { id: "usr-011", name: "Sarah Alatas, S.Tr.Kes", email: "sarah.ot@therapedia.id", role: "therapist", branchId: "branch-sby-barat", therapistId: "t-005" },
  { id: "usr-012", name: "Kevin Gunawan, S.Ft", email: "kevin.ft@therapedia.id", role: "therapist", branchId: "branch-citraland", therapistId: "t-006" },
  { id: "usr-013", name: "Nadia Putri, S.Pd, S.Tr.Kes", email: "nadia.speech@therapedia.id", role: "therapist", branchId: "branch-sby-timur", therapistId: "t-007" },
  { id: "usr-014", name: "Rizky Firmansyah, A.Md.OT", email: "rizky.ot@therapedia.id", role: "therapist", branchId: "branch-citraland", therapistId: "t-008" },
];

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = usePersistentState("auth", () => EMPTY_AUTH);
  const [activeBranch, setActiveBranch] = usePersistentState("activeBranch", () => "all");
  const [staffUsers, setStaffUsers] = usePersistentState("staffUsers", () => DEFAULT_STAFF);
  const [rolesList, setRolesList] = usePersistentState("rolesList", () => DEFAULT_ROLES);
  const [rbacPermissions, setRbacPermissions] = usePersistentState("rbacPermissions", () => DEFAULT_PERMISSIONS);

  const login = (payload) => {
    setAuth({ ...EMPTY_AUTH, ...payload });
    if (payload?.role !== "master" && payload?.branchId) {
      setActiveBranch(payload.branchId);
    }
  };

  React.useEffect(() => {
    if (auth?.role && auth.role !== "master" && auth.branchId) {
      if (activeBranch !== auth.branchId) {
        setActiveBranch(auth.branchId);
      }
    }
  }, [auth, activeBranch, setActiveBranch]);

  const logout = () => {
    setAuth(EMPTY_AUTH);
    setActiveBranch("all");
  };

  const addStaffUser = (user) => {
    const newUser = { id: `usr-${Date.now()}`, ...user };
    setStaffUsers((prev) => [...prev, newUser]);
    return newUser;
  };

  const removeStaffUser = (userId) => {
    setStaffUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  // CRUD Roles
  const addRole = (newRoleData) => {
    const slug = (newRoleData.id || newRoleData.label.toLowerCase().replace(/\s+/g, "_")).replace(/[^a-z0-9_]/g, "");
    const roleId = slug || `role_${Date.now()}`;
    const roleObj = {
      id: roleId,
      label: newRoleData.label,
      badge: newRoleData.badge || "Staff Custom",
      description: newRoleData.description || "Peran kustom operasional",
      isSystem: false,
    };

    setRolesList((prev) => [...prev.filter((r) => r.id !== roleId), roleObj]);

    // Initial permissions
    const defaultModPerms = ACCESS_MODULES.reduce((acc, m) => {
      acc[m.key] = Boolean(newRoleData.initialPermissions?.[m.key]);
      return acc;
    }, {});

    setRbacPermissions((prev) => ({
      ...prev,
      [roleId]: defaultModPerms,
    }));

    return roleObj;
  };

  const updateRole = (roleId, updatedFields) => {
    setRolesList((prev) =>
      prev.map((r) => (r.id === roleId ? { ...r, ...updatedFields } : r))
    );
  };

  const deleteRole = (roleId) => {
    const role = rolesList.find((r) => r.id === roleId);
    if (role?.isSystem) {
      throw new Error("System default role tidak dapat dihapus!");
    }
    setRolesList((prev) => prev.filter((r) => r.id !== roleId));
    setRbacPermissions((prev) => {
      const copy = { ...prev };
      delete copy[roleId];
      return copy;
    });
  };

  const updateRolePermission = (role, moduleKey, allowed) => {
    setRbacPermissions((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        [moduleKey]: Boolean(allowed),
      },
    }));
  };

  const hasPermission = (moduleKey) => {
    if (!auth || !auth.role) return false;
    if (auth.role === "master") return true;
    const rolePerms = rbacPermissions[auth.role] || DEFAULT_PERMISSIONS[auth.role] || {};

    // Legacy module key fallbacks
    if (moduleKey === "inquiry") {
      return Boolean(rolePerms.inquiry_pipeline || rolePerms.inquiry_dashboard || rolePerms.inquiry);
    }
    if (moduleKey === "schedule") {
      return Boolean(rolePerms.weekly_calendar || rolePerms.schedule_dashboard || rolePerms.schedule);
    }
    if (moduleKey === "therapist") {
      return Boolean(rolePerms.therapist_module || rolePerms.therapist);
    }

    return Boolean(rolePerms[moduleKey]);
  };

  return (
    <AuthContext.Provider
      value={{
        auth,
        login,
        logout,
        activeBranch,
        setActiveBranch,
        staffUsers,
        addStaffUser,
        removeStaffUser,
        rolesList,
        addRole,
        updateRole,
        deleteRole,
        rbacPermissions,
        updateRolePermission,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

