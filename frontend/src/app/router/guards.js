import { Navigate } from "react-router-dom";
import { useAuth } from "@/stores/authStore";

const toRoles = () => <Navigate to="/roles" replace />;

// Guard grup route. Akses mengikuti RBAC (/master/rbac) untuk SEMUA role staf:
// - lolos bila role ada di `roles` grup (akses bawaan role sistem), ATAU
// - role staf (selain client) punya permission salah satu `modules` grup. Jadi modul yang diberikan Master lewat RBAC
//   ke role mana pun (sistem maupun kustom) ikut terbuka.
export const RequireAccess = ({ roles = [], modules = [], children }) => {
  const { auth, hasPermission } = useAuth();
  const role = auth?.role;
  if (!role) return toRoles();
  if (roles.includes(role)) return children;
  if (role !== "client" && modules.some(hasPermission)) return children;
  return toRoles();
};

// Guard per halaman: wajib punya permission modul halaman itu (Master selalu boleh). Halaman tanpa `module`
// (portal ortu) tidak dibatasi. Mencabut modul di RBAC langsung menutup halamannya, bukan hanya menyembunyikan menu.
export const RequireModule = ({ module, children }) => {
  const { hasPermission } = useAuth();
  if (!module || hasPermission(module)) return children;
  return toRoles();
};
