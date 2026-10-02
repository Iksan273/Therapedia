import React, { createContext, useContext } from "react";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { ACCESS_MODULES, DEFAULT_PERMISSIONS, DEFAULT_ROLES, roleHasPermission, withDefaultPermissions } from "@/domain/rbac";
import DEFAULT_STAFF from "@/data/staffUsers.seed.json";

const EMPTY_AUTH = {
  role: null,
  therapistId: null,
  clientId: null,
  staffName: null,
  branchId: null,
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = usePersistentState("auth", () => EMPTY_AUTH);
  const [activeBranch, setActiveBranch] = usePersistentState("activeBranch", () => "all");
  const [staffUsers, setStaffUsers] = usePersistentState("staffUsers", () => DEFAULT_STAFF);
  const [rolesList, setRolesList] = usePersistentState("rolesList", () => DEFAULT_ROLES);
  const [storedPermissions, setRbacPermissions] = usePersistentState("rbacPermissions", () => DEFAULT_PERMISSIONS);
  // Matriks efektif: modul baru otomatis memakai default role sampai diubah di /master/rbac
  const rbacPermissions = React.useMemo(() => withDefaultPermissions(storedPermissions), [storedPermissions]);

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

  const hasPermission = (moduleKey) => roleHasPermission(auth?.role, rbacPermissions, moduleKey);

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

