import React, { createContext, useContext } from "react";
import { usePersistentState } from "@/shared/hooks/usePersistentState";
import { ACCESS_MODULES, DEFAULT_PERMISSIONS, DEFAULT_ROLES, permissionMapAllows, roleHasPermission, withDefaultPermissions } from "@/domain/rbac";
import DEFAULT_STAFF from "@/data/staffUsers.seed.json";
import { findStaffByEmail, generateOtp, generateTempPassword, hasAllBranchAccess, makeOtpRequest, verifyOtp } from "@/domain/auth";
import { clientSessionToAuth, staffSessionToAuth } from "@/services/api/mappers/authMapper";
import { nowIso } from "@/shared/lib/id";
import { isApiMode } from "@/config/env";
import { api, setUnauthorizedHandler } from "@/services/http/httpClient";
import { tokenStore } from "@/services/http/tokenStore";
import { ENDPOINTS } from "@/services/api/endpoints";

const EMPTY_AUTH = {
  role: null,
  therapistId: null,
  clientId: null,
  staffName: null,
  branchId: null, // null = semua cabang (staf); lihat hasAllBranchAccess
  // Hanya mode API: id akun, status password sementara, dan matriks modul dari server ({ kode_modul: boolean }).
  userId: null,
  mustChangePassword: false,
  permissions: null,
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

  // Mode API: sesi berasal dari token Sanctum. `applySession` dipanggil hook login / pemulihan sesi (`me`).
  const applySession = (session) => {
    setAuth({ ...EMPTY_AUTH, ...session });
    setActiveBranch(session.role !== "client" && session.branchId ? session.branchId : "all");
  };

  const clearSession = () => {
    setAuth(EMPTY_AUTH);
    setActiveBranch("all");
  };

  // Selesai ganti password wajib: server sudah menghapus penanda; sinkronkan state lokal.
  const markPasswordChanged = () => setAuth((prev) => ({ ...prev, mustChangePassword: false }));

  const logout = () => {
    if (isApiMode() && tokenStore.get()) {
      // Cabut token di server (best effort), lalu hapus token lokal. Header token dibaca saat request dikirim.
      api.post(ENDPOINTS.auth.logout).catch(() => {}).finally(() => tokenStore.clear());
    }
    clearSession();
  };

  // Mode API: pasang handler 401 (token hilang/kedaluwarsa → sesi dibersihkan, guard mengarahkan ke /login) dan pulihkan
  // sesi dari token yang tersimpan (profil + matriks modul terbaru).
  React.useEffect(() => {
    if (!isApiMode()) return undefined;
    setUnauthorizedHandler(() => clearSession());
    if (!tokenStore.get()) {
      if (auth?.role) clearSession();
      return undefined;
    }
    let cancelled = false;
    api
      .get(ENDPOINTS.auth.me)
      .then((me) => {
        if (cancelled) return;
        applySession(me.type === "client" ? clientSessionToAuth(me.client) : staffSessionToAuth(me.user));
      })
      .catch(() => {}); // 401 sudah ditangani handler; galat jaringan: pertahankan sesi tersimpan
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya saat aplikasi dimuat
  }, []);

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

  // Mode API: matriks dari server (login/me); mode demo: matriks lokal (RBAC localStorage).
  const hasPermission = (moduleKey) =>
    isApiMode() && auth?.permissions
      ? permissionMapAllows(auth?.role, auth.permissions, moduleKey)
      : roleHasPermission(auth?.role, rbacPermissions, moduleKey);

  // Hapus operasional = akses modul; hapus data penting (`masterOnly`: client, cabang) = hanya master.
  const canDelete = (moduleKey, { masterOnly = false } = {}) => {
    if (auth?.role === "master") return true;
    if (masterOnly) return false;
    return hasPermission(moduleKey);
  };

  return (
    <AuthContext.Provider
      value={{
        auth,
        login,
        applySession,
        markPasswordChanged,
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

