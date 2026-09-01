import React, { createContext, useContext } from "react";
import { usePersistentState } from "@/hooks/useLocalStorage";

const EMPTY_AUTH = {
  role: null,
  therapistId: null,
  clientId: null,
  staffName: null,
  branchId: null,
};

const DEFAULT_PERMISSIONS = {
  master: { revenue: true, inquiry: true, schedule: true, active_clients: true, finance: true, therapist: true, user_management: true, rbac: true },
  manager: { revenue: true, inquiry: true, schedule: true, active_clients: true, finance: false, therapist: true, user_management: false, rbac: false },
  admin_inquiry: { revenue: false, inquiry: true, schedule: false, active_clients: false, finance: false, therapist: false, user_management: false, rbac: false },
  admin_schedule: { revenue: false, inquiry: false, schedule: true, active_clients: true, finance: false, therapist: false, user_management: false, rbac: false },
  finance: { revenue: true, inquiry: false, schedule: false, active_clients: true, finance: true, therapist: false, user_management: false, rbac: false },
  therapist: { revenue: false, inquiry: false, schedule: false, active_clients: false, finance: false, therapist: true, user_management: false, rbac: false },
  client: { revenue: false, inquiry: false, schedule: false, active_clients: false, finance: false, therapist: false, user_management: false, rbac: false },
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
  const [rbacPermissions, setRbacPermissions] = usePersistentState("rbacPermissions", () => DEFAULT_PERMISSIONS);

  const login = (payload) => setAuth({ ...EMPTY_AUTH, ...payload });
  const logout = () => setAuth(EMPTY_AUTH);

  const addStaffUser = (user) => {
    const newUser = { id: `usr-${Date.now()}`, ...user };
    setStaffUsers((prev) => [...prev, newUser]);
    return newUser;
  };

  const removeStaffUser = (userId) => {
    setStaffUsers((prev) => prev.filter((u) => u.id !== userId));
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
    const rolePerms = rbacPermissions[auth.role] || DEFAULT_PERMISSIONS[auth.role];
    return rolePerms ? Boolean(rolePerms[moduleKey]) : false;
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
