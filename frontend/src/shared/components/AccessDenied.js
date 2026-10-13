import { useNavigate } from "react-router-dom";
import { LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useAuth } from "@/stores/authStore";

// Pengguna sudah login tetapi tidak punya akses (modul RBAC dicabut). Sengaja BUKAN redirect: mengarahkan ke /login atau
// halaman awal bisa berputar bila halaman awal role itu juga ditutup.
export function AccessDenied() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6" data-testid="access-denied">
      <div className="max-w-md w-full text-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-black text-slate-900">Anda tidak punya akses ke halaman ini</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Hak akses akun Anda tidak mencakup halaman ini. Hubungi Master Director bila Anda merasa perlu akses.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={() => navigate(-1)} data-testid="access-denied-back">
            Kembali
          </Button>
          <Button onClick={handleLogout} className="gap-2" data-testid="access-denied-logout">
            <LogOut className="h-4 w-4" /> Keluar
          </Button>
        </div>
      </div>
    </div>
  );
}
