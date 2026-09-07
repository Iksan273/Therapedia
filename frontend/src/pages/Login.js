import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ChevronLeft,
  Crown,
  Building2,
  ClipboardList,
  UserCog,
  Receipt,
  Stethoscope,
  HeartHandshake,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useClients } from "@/context/ClientsContext";
import { LOGIN } from "@/constants/testIds/auth";
import { cn } from "@/lib/utils";

// Quick Preset Accounts for seamless evaluation
const PRESET_ACCOUNTS = [
  {
    role: "master",
    title: "Master Director",
    name: "Master Administrator",
    email: "master@therapedia.id",
    path: "/master/revenue",
    icon: Crown,
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    role: "manager",
    branchId: "branch-citraland",
    title: "Manager Cabang",
    name: "Budi Santoso (Citraland)",
    email: "budi.santoso@therapedia.id",
    path: "/manager/revenue",
    icon: Building2,
    badgeColor: "bg-sky-100 text-sky-800 border-sky-200",
  },
  {
    role: "admin_inquiry",
    title: "Admin Inquiry",
    name: "Rina (Admin Inquiry)",
    email: "inquiry@therapedia.id",
    path: "/admin-inquiry/pipeline",
    icon: ClipboardList,
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
  },
  {
    role: "admin_schedule",
    title: "Admin Schedule",
    name: "Fajar (Admin Schedule)",
    email: "schedule@therapedia.id",
    path: "/admin-schedule/calendar",
    icon: UserCog,
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    role: "finance",
    title: "Finance Billing",
    name: "Siti Rahmawati (Finance)",
    email: "finance@therapedia.id",
    path: "/finance",
    icon: Receipt,
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  {
    role: "therapist",
    therapistId: "t-001",
    title: "Terapis Okupasi",
    name: "Dr. Maya Chen",
    email: "maya.chen@therapedia.id",
    path: "/therapist",
    icon: Stethoscope,
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
  },
];

export default function Login() {
  const navigate = useNavigate();
  const { login, setActiveBranch, staffUsers } = useAuth();
  const { clients } = useClients();

  // Mode: "staff" or "client"
  const [activeTab, setActiveTab] = useState("staff");

  // Staff Form State
  const [email, setEmail] = useState("master@therapedia.id");
  const [password, setPassword] = useState("••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [staffError, setStaffError] = useState("");

  // Client Form State
  const [clientCode, setClientCode] = useState("TDC-1009");
  const [clientError, setClientError] = useState("");

  // Handle Staff Login
  const handleStaffSubmit = (e) => {
    e.preventDefault();
    setStaffError("");

    if (!email.trim()) {
      setStaffError("Silakan masukkan alamat email akun staf.");
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Match with staff users or preset
    const matchedPreset = PRESET_ACCOUNTS.find((p) => p.email.toLowerCase() === trimmedEmail);
    const matchedStaff = staffUsers?.find((u) => u.email.toLowerCase() === trimmedEmail);

    if (matchedPreset) {
      login({
        role: matchedPreset.role,
        staffName: matchedPreset.name,
        branchId: matchedPreset.branchId || null,
        therapistId: matchedPreset.therapistId || null,
      });
      if (matchedPreset.branchId) {
        setActiveBranch(matchedPreset.branchId);
      }
      toast.success(`Selamat datang kembali, ${matchedPreset.name}!`);
      navigate(matchedPreset.path);
      return;
    }

    if (matchedStaff) {
      const redirectMap = {
        master: "/master/revenue",
        manager: "/manager/revenue",
        admin_inquiry: "/admin-inquiry/pipeline",
        admin_schedule: "/admin-schedule/calendar",
        finance: "/finance",
        therapist: "/therapist",
      };
      login({
        role: matchedStaff.role,
        staffName: matchedStaff.name,
        branchId: matchedStaff.branchId,
        therapistId: matchedStaff.therapistId || null,
      });
      if (matchedStaff.branchId) {
        setActiveBranch(matchedStaff.branchId);
      }
      toast.success(`Login berhasil. Selamat bertugas, ${matchedStaff.name}!`);
      navigate(redirectMap[matchedStaff.role] || "/");
      return;
    }

    // Default fallback to master if not found
    login({ role: "master", staffName: "Staff User" });
    toast.success("Login staf berhasil!");
    navigate("/master/revenue");
  };

  // Handle Client Login
  const handleClientSubmit = (e) => {
    e.preventDefault();
    setClientError("");
    const input = clientCode.trim().toUpperCase();

    if (!input) {
      setClientError("Silakan masukkan kode unik client Anda.");
      return;
    }

    const client = clients.find(
      (c) => c.clientAccessCode && c.clientAccessCode.toUpperCase() === input
    );

    if (!client) {
      setClientError("Kode client tidak terdaftar. Gunakan kode demo: TDC-1009");
      return;
    }

    login({ role: "client", clientId: client.id });
    toast.success(`Selamat datang kembali, keluarga ${client.clientName}!`);
    navigate("/client");
  };

  const selectPreset = (preset) => {
    setEmail(preset.email);
    setPassword("Therapedia2026!");
    setStaffError("");
  };

  return (
    <div className="relative min-h-screen bg-[#fafbfc] text-slate-900 flex flex-col justify-between overflow-hidden selection:bg-sky-100 selection:text-sky-900">
      {/* Background Animated Ambient Lights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            x: [0, 15, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 left-1/3 w-[600px] h-[500px] rounded-full bg-gradient-to-tr from-sky-200/40 via-cyan-100/30 to-blue-200/20 blur-[110px] opacity-70"
        />
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            x: [0, -20, 0],
            y: [0, 15, 0],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-24 -right-24 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-emerald-100/30 via-sky-100/20 to-slate-200/20 blur-[90px] opacity-60"
        />
      </div>

      {/* Top Navigation */}
      <header className="relative z-10 w-full border-b border-slate-200/60 bg-white/70 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#007AFF] transition-colors group"
            data-testid="login-back-to-home"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Kembali ke Halaman Utama</span>
          </Link>

          <Link
            to="/roles"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#007AFF] hover:text-[#0062cc] bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/80 px-3 py-1.5 rounded-xl transition-all"
            data-testid="login-to-role-switcher"
          >
            <span>Buka Role Switcher</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Login Card Section */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-10 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-xl"
        >
          {/* Card Container */}
          <Card className="rounded-3xl border border-slate-200/90 bg-white/90 backdrop-blur-xl shadow-xl shadow-slate-200/50 overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              {/* Header inside card */}
              <div className="text-center mb-6">
                <div className="inline-flex w-16 h-16 items-center justify-center mb-3 transition-transform hover:scale-105">
                  <img
                    src="/images/therapedia_logo.png"
                    alt="Therapedia Mascot Logo"
                    className="w-full h-full object-contain drop-shadow-[0_6px_16px_rgba(0,122,255,0.3)]"
                  />
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Login Portal Therapedia
                  </h1>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#007AFF] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    Center
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
                  Masuk ke sistem operasional terpadu pusat tumbuh kembang anak
                </p>
              </div>

              {/* Tab Selector: Staff vs Client */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveTab("staff")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer",
                    activeTab === "staff"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                  data-testid="tab-staff-login"
                >
                  <ShieldCheck className="w-4 h-4 text-[#007AFF]" />
                  <span>Staf Klinis & Manajemen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("client")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer",
                    activeTab === "client"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                  data-testid="tab-client-login"
                >
                  <HeartHandshake className="w-4 h-4 text-emerald-600" />
                  <span>Orang Tua / Client</span>
                </button>
              </div>

              {/* AnimatePresence for Tab Content */}
              <AnimatePresence mode="wait">
                {activeTab === "staff" ? (
                  <motion.div
                    key="staff-tab"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Staff Login Form */}
                    <form onSubmit={handleStaffSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Alamat Email Staf
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <Input
                            type="email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              setStaffError("");
                            }}
                            placeholder="nama@therapedia.id"
                            className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white text-xs font-medium"
                            data-testid={LOGIN.emailInput}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-slate-700">
                            Kata Sandi
                          </label>
                          <button
                            type="button"
                            onClick={() => toast.info("Untuk keperluan prototype, gunakan kata sandi apapun atau klik akun demo di bawah.")}
                            className="text-[11px] font-bold text-sky-600 hover:text-sky-700 hover:underline"
                            data-testid={LOGIN.forgotPasswordLink}
                          >
                            Lupa kata sandi?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Masukkan kata sandi"
                            className="pl-10 pr-10 h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white text-xs font-medium"
                            data-testid={LOGIN.passwordInput}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {staffError && (
                        <p className="text-xs font-medium text-rose-600 animate-in fade-in duration-150">
                          {staffError}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 font-medium">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                          />
                          <span>Ingat saya di perangkat ini</span>
                        </label>
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-11 rounded-xl bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold text-xs shadow-md shadow-[#007AFF]/25 transition-all cursor-pointer mt-2"
                        data-testid={LOGIN.submitButton}
                      >
                        <span>Masuk ke Dashboard Staf</span>
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    </form>

                    {/* Quick 1-Click Demo Accounts Presets */}
                    <div className="mt-6 pt-5 border-t border-slate-200/80">
                      <div className="flex items-center justify-between mb-2.5">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                          Akun Demo Siap Uji (1-Click Fill):
                        </p>
                        <span className="text-[10px] font-semibold text-sky-600 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Klik untuk isi form
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {PRESET_ACCOUNTS.map((preset, idx) => {
                          const Icon = preset.icon;
                          const isSelected = email.toLowerCase() === preset.email.toLowerCase();
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => selectPreset(preset)}
                              className={cn(
                                "flex flex-col text-left p-2.5 rounded-xl border transition-all cursor-pointer",
                                isSelected
                                  ? "bg-sky-50 border-sky-300 shadow-2xs ring-1 ring-sky-300"
                                  : "bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300"
                              )}
                              data-testid={`preset-login-${preset.role}`}
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <Icon className="w-3.5 h-3.5 text-slate-700" />
                                <span className="font-extrabold text-[11px] text-slate-800 truncate">
                                  {preset.title}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 truncate">{preset.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="client-tab"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Client / Parent Access Form */}
                    <form onSubmit={handleClientSubmit} className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-slate-700">
                            Kode Unik Akses Client
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setClientCode("TDC-1009");
                              setClientError("");
                            }}
                            className="text-[11px] font-bold text-sky-600 hover:text-sky-700 hover:underline"
                          >
                            Isi Demo: TDC-1009
                          </button>
                        </div>
                        <div className="relative">
                          <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <Input
                            type="text"
                            value={clientCode}
                            onChange={(e) => {
                              setClientCode(e.target.value);
                              setClientError("");
                            }}
                            placeholder="Contoh: TDC-1009"
                            className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white font-mono uppercase text-xs font-bold tracking-wider"
                            data-testid="login-client-code-input"
                            required
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                          Kode ini tertera pada bukti pendaftaran atau tagihan invoice yang diberikan oleh pihak klinis.
                        </p>
                      </div>

                      {clientError && (
                        <p className="text-xs font-medium text-rose-600 animate-in fade-in duration-150">
                          {clientError}
                        </p>
                      )}

                      <Button
                        type="submit"
                        className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer mt-2"
                        data-testid="login-client-submit-button"
                      >
                        <HeartHandshake className="w-4 h-4 mr-1.5" />
                        <span>Masuk ke Portal Orang Tua</span>
                      </Button>

                      {/* Parent Portal Info Card */}
                      <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 text-emerald-900 text-xs">
                        <div className="flex items-center gap-1.5 font-bold mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Fitur Portal Keluarga:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-800">
                          <li>Lihat status tagihan & upload slip transfer</li>
                          <li>Pantau saldo paket kredit & riwayat terapi</li>
                          <li>Akses catatan perkembangan anak dari terapis</li>
                        </ul>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Minimalist Footer */}
      <footer className="relative z-10 w-full border-t border-slate-200/60 bg-white/50 backdrop-blur-xs py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-slate-500">
          <span>Therapedia Multisite Pediatric Healthcare</span>
          <Link to="/" className="text-sky-600 font-bold hover:underline">
            Home Screen
          </Link>
        </div>
      </footer>
    </div>
  );
}
