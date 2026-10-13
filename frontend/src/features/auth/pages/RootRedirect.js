import { Navigate } from "react-router-dom";
import { useAuth } from "@/stores/authStore";
import { homePathFor } from "@/domain/auth";
import { isApiMode } from "@/config/env";

// Pintu masuk "/": tidak ada halaman beranda. Belum login → /login; sudah login → halaman awal role-nya.
// Sesi API dengan password sementara (belum diganti) tetap ke /login agar dialog ganti password tampil.
export default function RootRedirect() {
  const { auth, hasPermission } = useAuth();
  const role = auth?.role;

  if (!role || (isApiMode() && auth.mustChangePassword)) return <Navigate to="/login" replace />;
  return <Navigate to={homePathFor(role, hasPermission)} replace />;
}
