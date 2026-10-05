import React, { createContext, useContext } from "react";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { ACCESS_MODULES, DEFAULT_PERMISSIONS, DEFAULT_ROLES, canDeleteIn, roleHasPermission, withDefaultPermissions } from "@/domain/rbac";
import DEFAULT_STAFF from "@/data/staffUsers.seed.json";
import { findStaffByEmail, generateOtp, generateTempPassword, hasAllBranchAccess, makeOtpRequest, verifyOtp } from "@/domain/auth";
import { nowIso } from "@/shared/lib/id";

const EMPTY_AUTH = {
  role: null,
  therapistId: null,
  clientId: null,
  staffName: null,
  branchId: null,
  allBranches: false,
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = usePersistentState("auth", () => EMPTY_AUTH);
  const [activeBranch, setActiveBranch] = usePersistentState("activeBranch", () => "all");
  const [staffUsers, setStaffUsers] = usePersistentState("staffUsers", () => DEFAULT_STAFF);
  const [rolesList, setRolesList] = usePersistentState("rolesList", () => DEFAULT_ROLES);
  // Permintaan OTP lupa password (mode demo; backend: tabel `password_reset_otps` dengan OTP ter-hash)
  const [passwordResets, setPasswordResets] = usePersistentState("passwordResets", () => []);
  const [storedPermissions, setRbacPermissions] = usePersistentState("rbacPermissions", () => DEFAULT_PERMISSIONS);
  // Matriks efektif: modul baru otomatis memakai default role sampai diubah di /master/rbac
  const rbacPermissions = React.useMemo(() => withDefaultPermissions(storedPermissions), [storedPermissions]);

  const login = (payload) => {
    setAuth({ ...EMPTY_AUTH, ...payload });
    if (!hasAllBranchAccess(payload) && payload?.branchId) {
      setActiveBranch(payload.branchId);
    }
  };

  React.useEffect(() => {
    if (auth?.role && !hasAllBranchAccess(auth) && auth.branchId) {
      if (activeBranch !== auth.branchId) {
        setActiveBranch(auth.branchId);
      }
    }
  }, [auth, activeBranch, setActiveBranch]);

  const logout = () => {
    setAuth(EMPTY_AUTH);
    setActiveBranch("all");
  };

  // Akun baru: password sementara dari Master + wajib ganti saat login pertama. Staf non-master terikat 1 cabang.
  const addStaffUser = (user) => {
    const newUser = {
      id: `usr-${Date.now()}`,
      isActive: true,
      mustChangePassword: true,
      password: user.password || generateTempPassword(),
      ...user,
    };
    setStaffUsers((prev) => [...prev, newUser]);
    return newUser;
  };

  const updateStaffUser = (userId, patch) => {
    setStaffUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)));
  };

  // Staf berhenti: dinonaktifkan (riwayat sesi tetap), bukan dihapus. `removeStaffUser` dipertahankan hanya untuk data uji.
  const setStaffActive = (userId, active) => updateStaffUser(userId, { isActive: Boolean(active) });

  const removeStaffUser = (userId) => {
    setStaffUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  // Ganti password sendiri (wajib di login pertama / setelah reset Master)
  const changeStaffPassword = (userId, newPassword) =>
    updateStaffUser(userId, { password: newPassword, mustChangePassword: false, passwordChangedAt: nowIso() });

  // Master mengatur password sementara baru (bantuan reset): user wajib menggantinya saat login berikutnya
  const resetStaffPassword = (userId, tempPassword = generateTempPassword()) => {
    updateStaffUser(userId, { password: tempPassword, mustChangePassword: true });
    return tempPassword;
  };

  // Lupa password: minta OTP lewat email. Respons selalu generik; `otp` hanya dikembalikan di mode demo
  // (simulasi email) dan hanya bila akun aktif ada.
  const requestPasswordOtp = (email) => {
    const staff = findStaffByEmail(staffUsers, email);
    if (!staff || staff.isActive === false) return { sent: true };
    const otp = generateOtp();
    const request = makeOtpRequest(staff.email, otp);
    setPasswordResets((prev) => [...prev.filter((r) => r.email !== request.email), request]);
    return { sent: true, otp, expiresAt: request.expiresAt };
  };

  // Verifikasi OTP lalu ganti password. Percobaan salah dihitung; OTP hangus setelah batas percobaan.
  const resetPasswordWithOtp = ({ email, otp, newPassword }) => {
    const staff = findStaffByEmail(staffUsers, email);
    const request = (passwordResets || []).find((r) => staff && r.email === staff.email.trim().toLowerCase());
    const check = verifyOtp(request, otp);
    if (!check.ok) {
      if (check.reason === "invalid") {
        setPasswordResets((prev) => prev.map((r) => (r.email === request.email ? { ...r, attempts: r.attempts + 1 } : r)));
      }
      return check;
    }
    changeStaffPassword(staff.id, newPassword);
    setPasswordResets((prev) => prev.map((r) => (r.email === request.email ? { ...r, usedAt: nowIso() } : r)));
    return { ok: true };
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

  // Tombol hapus hanya untuk role dengan flag `canDelete` + akses modul terkait.
  const canDelete = (moduleKey) => canDeleteIn({ roleId: auth?.role, rolesList, permissions: rbacPermissions, moduleKey });
  const setRoleCanDelete = (roleId, allowed) => updateRole(roleId, { canDelete: Boolean(allowed) });

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
        updateStaffUser,
        setStaffActive,
        removeStaffUser,
        changeStaffPassword,
        resetStaffPassword,
        requestPasswordOtp,
        resetPasswordWithOtp,
        rolesList,
        addRole,
        updateRole,
        deleteRole,
        rbacPermissions,
        updateRolePermission,
        hasPermission,
        canDelete,
        setRoleCanDelete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

