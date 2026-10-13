import { Navigate } from "react-router-dom";
import { useAuth } from "@/stores/authStore";
import { isApiMode } from "@/config/env";
import { AccessDenied } from "@/shared/components/AccessDenied";

// Tidak ada beranda: tanpa sesi → /login. Mode API dengan password sementara juga kembali ke /login agar dialog ganti
// password wajib tampil (server memblokir endpoint lain sampai password diganti).
const toLogin = () => <Navigate to="/login" replace />;

// Guard grup route. Akses mengikuti RBAC (/master/rbac) untuk SEMUA role staf:
// - lolos bila role ada di `roles` grup (akses bawaan role sistem), ATAU
// - role staf (selain client) punya permission salah satu `modules` grup. Jadi modul yang diberikan Master lewat RBAC
//   ke role mana pun (sistem maupun kustom) ikut terbuka.
// Sudah login tapi tidak berhak → halaman "tidak ada akses" (bukan redirect, agar tidak berputar ke halaman awal yang juga tertutup).
export const RequireAccess = ({ roles = [], modules = [], children }) => {
  const { auth, hasPermission } = useAuth();
  const role = auth?.role;
  if (!role) return toLogin();
  if (isApiMode() && auth?.mustChangePassword) return toLogin();
  if (roles.includes(role)) return children;
  if (role !== "client" && modules.some(hasPermission)) return children;
  return <AccessDenied />;
};

// Guard per halaman: wajib punya permission modul halaman itu (Master selalu boleh). Halaman tanpa `module`
// (portal ortu) tidak dibatasi. Mencabut modul di RBAC langsung menutup halamannya, bukan hanya menyembunyikan menu.
export const RequireModule = ({ module, children }) => {
  const { hasPermission } = useAuth();
  if (!module || hasPermission(module)) return children;
  return <AccessDenied />;
};
