import { Navigate } from "react-router-dom";
import { useAuth } from "@/stores/authStore";
import { isSystemRole } from "@/domain/rbac";

const toRoles = () => <Navigate to="/roles" replace />;

// Guard grup route.
// - Role sistem: lolos bila ada di `roles`.
// - Role kustom (dibuat di /master/rbac): lolos bila punya permission salah satu `modules` grup ini.
export const RequireAccess = ({ roles = [], modules = [], children }) => {
  const { auth, hasPermission } = useAuth();
  const role = auth?.role;
  if (!role) return toRoles();
  if (roles.includes(role)) return children;
  if (!isSystemRole(role) && modules.some(hasPermission)) return children;
  return toRoles();
};

// Guard per halaman untuk role kustom: wajib punya permission modul halaman itu.
// Role sistem sudah dibatasi oleh RequireAccess di level grup.
export const RequireModule = ({ module, children }) => {
  const { auth, hasPermission } = useAuth();
  if (!module || isSystemRole(auth?.role) || hasPermission(module)) return children;
  return toRoles();
};
