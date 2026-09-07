import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ClipboardList,
  HeartHandshake,
  KeyRound,
  Stethoscope,
  UserCog,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  CalendarDays,
  FileCheck2,
  TrendingUp,
  Receipt,
  Crown,
  Building2,
  ArrowRight,
  LogIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useClients } from "@/context/ClientsContext";
import { useTherapists } from "@/context/TherapistsContext";
import { BRANCHES } from "@/lib/appUtils";
import { cn } from "@/lib/utils";

const HERO_IMG =
  "https://images.unsplash.com/photo-1637665759389-41818b867562?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NjV8MHwxfHNlYXJjaHwxfHxwZWRpYXRyaWMlMjBvY2N1cGF0aW9uYWwlMjB0aGVyYXB5JTIwY2xpbmljJTIwd2FpdGluZyUyMHJvb20lMjBicmlnaHQlMjBuYXR1cmFsJTIwbGlnaHR8ZW58MHx8fGJsdWV8MTc4NzA1OTg4OXww&ixlib=rb-4.1.0&q=85";

const RoleCard = ({ icon: Icon, title, description, badge, onClick, active, testid }) => (
  <motion.div
    whileHover={{ scale: 1.01, y: -1 }}
    whileTap={{ scale: 0.99 }}
    transition={{ duration: 0.15 }}
  >
    <Card
      className={cn(
        "clinical-card rounded-2xl cursor-pointer transition-all duration-200 group border",
        active
          ? "border-[#007AFF] bg-blue-50/50 shadow-md ring-2 ring-[#007AFF]/30"
          : "border-slate-200/90 hover:border-[#007AFF]/40 hover:shadow-md hover:bg-white"
      )}
      onClick={onClick}
      data-testid={testid}
    >
      <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div
            className={cn(
              "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-2xs",
              active
                ? "bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/25"
                : "bg-blue-50 text-[#007AFF] border border-blue-100 group-hover:bg-[#007AFF] group-hover:text-white"
            )}
          >
            <Icon className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug">{title}</p>
              {badge && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-[#007AFF] border border-blue-200/70 px-2.5 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed truncate sm:whitespace-normal">{description}</p>
          </div>
        </div>
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
            active ? "bg-blue-100 text-[#007AFF]" : "text-slate-400 group-hover:text-[#007AFF] group-hover:bg-blue-50"
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default function RoleSelect() {
  const navigate = useNavigate();
  const { login, setActiveBranch } = useAuth();
  const { clients } = useClients();
  const { therapists } = useTherapists();

  const [expanded, setExpanded] = useState(null); // 'manager' | 'therapist' | 'client' | null
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  const enterRole = (payload, path) => {
    login(payload);
    if (payload.branchId) {
      setActiveBranch(payload.branchId);
    }
    navigate(path);
  };

  const handleClientLogin = (e) => {
    e.preventDefault();
    const input = code.trim().toUpperCase();
    const client = clients.find((c) => c.clientAccessCode && c.clientAccessCode.toUpperCase() === input);
    if (!client) {
      setCodeError("Kode client tidak ditemukan. Silakan coba kode demo: TDC-1009");
      return;
    }
    login({ role: "client", clientId: client.id });
    toast.success(`Selamat datang kembali, keluarga ${client.clientName}!`);
    navigate("/client");
  };

  const fillDemoCode = () => {
    setCode("TDC-1009");
    setCodeError("");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left: role selection */}
      <div className="flex-1 flex flex-col justify-between px-6 sm:px-10 lg:px-14 py-8 sm:py-10 max-w-2xl mx-auto lg:mx-0 w-full">
        <div>
          {/* Top navigation helper bar */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/80">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#007AFF] transition-colors group"
              data-testid="role-select-back-to-home"
            >
              <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              <span>Kembali ke Home Screen</span>
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#007AFF] hover:text-[#0062cc] bg-blue-50/90 border border-blue-200/80 px-3 py-1.5 rounded-xl hover:bg-blue-100/80 transition-colors shadow-2xs"
              data-testid="role-select-login-button"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Halaman Login</span>
            </Link>
          </div>

          {/* Header branding */}
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 flex items-center justify-center shrink-0">
              <img
                src="/images/therapedia_logo.png"
                alt="Therapedia Mascot Logo"
                className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,122,255,0.3)]"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-extrabold text-xl leading-tight text-slate-900 tracking-tight">Therapedia</p>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#007AFF] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  Center
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500">Pediatric Developmental Center &bull; Clinical Suite</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[#007AFF] text-xs font-semibold mb-2">
              Multi-Branch Pediatric Healthcare Ecosystem
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Pilih Peran Pengguna (Role Switcher)
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-lg leading-relaxed">
              Pilih salah satu dari 7 peran di bawah ini untuk menguji alur kerja operasional klinis, penjadwalan multi-cabang, dan verifikasi keuangan.
            </p>
          </div>

          {/* 7 Role Cards */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-2.5"
          >
            {/* 1. MASTER */}
            <RoleCard
              icon={Crown}
              title="Role Master (Director Headquarter)"
              description="Akses Dashboard Revenue 3 Cabang, User Management Staff, & Pengaturan RBAC Module"
              badge="Full Master"
              onClick={() => enterRole({ role: "master", staffName: "Master Administrator" }, "/master/revenue")}
              testid="role-select-master-button"
            />

            {/* 2. MANAGER (WITH BRANCH PICKER) */}
            <RoleCard
              icon={Building2}
              title="Role Manager (Branch Operations)"
              description="Pilih cabang operasional untuk melihat ringkasan omzet, timetable, dan caseload aktif"
              badge="Cabang Switchable"
              onClick={() => setExpanded(expanded === "manager" ? null : "manager")}
              active={expanded === "manager"}
              testid="role-select-manager-button"
            />
            {expanded === "manager" && (
              <div className="grid gap-2 p-3 rounded-2xl bg-white border border-sky-200 shadow-sm ml-2 sm:ml-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                  Pilih Cabang yang Dikelola:
                </p>
                {BRANCHES.map((b) => (
                  <Button
                    key={b.id}
                    variant="outline"
                    className="justify-between h-11 bg-slate-50 hover:bg-sky-50 hover:text-sky-900 hover:border-sky-300 border-slate-200 rounded-xl px-3.5 text-left"
                    onClick={() =>
                      enterRole(
                        { role: "manager", branchId: b.id, staffName: `Manager ${b.name}` },
                        "/manager/revenue"
                      )
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-4 h-4 text-sky-600" />
                      <span className="font-bold text-xs text-slate-800">{b.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">{b.city}</span>
                  </Button>
                ))}
              </div>
            )}

            {/* 3. ADMIN INQUIRY */}
            <RoleCard
              icon={ClipboardList}
              title="Role Admin Inquiry & Intake"
              description="Pipeline non-sekuensial, pilih layanan BOT-A/FOT-A, multi-kode asesmen, link GDrive"
              badge="Intake Hub"
              onClick={() => enterRole({ role: "admin_inquiry", staffName: "Rina (Admin Inquiry)" }, "/admin-inquiry/pipeline")}
              testid="role-select-admin-inquiry-button"
            />

            {/* 4. ADMIN SCHEDULE */}
            <RoleCard
              icon={UserCog}
              title="Role Admin Schedule & Timetable"
              description="Weekly Calendar multi-client/jam, slot frozen 0 kredit, alasan cancel, birthday radar"
              badge="Scheduling"
              onClick={() => enterRole({ role: "admin_schedule", staffName: "Fajar (Admin Schedule)" }, "/admin-schedule/calendar")}
              testid="role-select-admin-schedule-button"
            />

            {/* 5. ROLE FINANCE */}
            <RoleCard
              icon={Receipt}
              title="Role Finance (Billing & Verification)"
              description="Verifikasi bukti transfer ortu, terbitkan tagihan invoice, renewal paket kredit, master paket"
              badge="Finance Hub"
              onClick={() => enterRole({ role: "finance", staffName: "Siti Rahmawati (Finance)" }, "/finance")}
              testid="role-select-finance-button"
            />

            {/* 6. THERAPIST PORTAL */}
            <RoleCard
              icon={Stethoscope}
              title="Role Therapist (Practitioner)"
              description="Jadwal mandiri terapis, akses link GDrive & hasil asesmen ortu, laporan Activity + Homework"
              badge="Clinical"
              onClick={() => setExpanded(expanded === "therapist" ? null : "therapist")}
              active={expanded === "therapist"}
              testid="role-select-therapist-button"
            />
            {expanded === "therapist" && (
              <div className="grid gap-2 p-3 rounded-2xl bg-white border border-sky-200 shadow-sm ml-2 sm:ml-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                  Pilih Profil Terapis:
                </p>
                {therapists.map((t) => (
                  <Button
                    key={t.id}
                    variant="outline"
                    className="justify-between h-11 bg-slate-50 hover:bg-sky-50 hover:text-sky-900 hover:border-sky-300 border-slate-200 rounded-xl px-3.5 text-left"
                    onClick={() => enterRole({ role: "therapist", therapistId: t.id, staffName: t.name }, "/therapist")}
                    data-testid={`therapist-picker-${t.id}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {t.name[0]}
                      </div>
                      <span className="font-bold text-xs text-slate-800 truncate">{t.name}</span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full shrink-0">
                      {t.specialty}
                    </span>
                  </Button>
                ))}
              </div>
            )}

            {/* 7. PARENT PORTAL */}
            <RoleCard
              icon={HeartHandshake}
              title="Role Parent Portal (Client)"
              description="Login kode client: kartu invoice merah/hijau, upload bukti bayar, riwayat sesi completed"
              badge="Family Portal"
              onClick={() => setExpanded(expanded === "client" ? null : "client")}
              active={expanded === "client"}
              testid="role-select-client-login-button"
            />
            {expanded === "client" && (
              <form
                onSubmit={handleClientLogin}
                className="p-4 rounded-2xl bg-white border border-sky-200 shadow-sm ml-2 sm:ml-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
                data-testid="client-login-form"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-700">Masukkan Kode Unik Client</p>
                  <button
                    type="button"
                    onClick={fillDemoCode}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline"
                  >
                    Gunakan Demo: TDC-1009
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="pl-9 font-mono uppercase tracking-wider bg-slate-50 border-slate-200 focus:bg-white rounded-xl text-xs h-10 font-bold"
                      placeholder="e.g. TDC-1009"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        setCodeError("");
                      }}
                      data-testid="client-access-code-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl px-5 text-xs h-10 shadow-sm shadow-sky-600/20"
                    data-testid="client-login-submit-button"
                  >
                    Masuk Portal
                  </Button>
                </div>
                {codeError && (
                  <p className="text-xs font-medium text-rose-600" data-testid="client-login-error">
                    {codeError}
                  </p>
                )}
              </form>
            )}
          </motion.div>
        </div>

        {/* Bottom links */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Therapedia Multisite Clinical Suite</span>
          <Link
            to="/assessment"
            className="inline-flex items-center gap-1 text-sky-700 font-bold hover:text-sky-800"
            data-testid="landing-assessment-fill-link"
          >
            Isi Kuesioner Asesmen (Kode Akses)
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Right: hero presentation */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[#040e1e]">
        <img
          src={HERO_IMG}
          alt="Therapedia pediatric therapy clinic"
          className="absolute inset-0 w-full h-full object-cover opacity-50 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#040e1e] via-[#040e1e]/60 to-[#007AFF]/20" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white h-full">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold w-fit">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Sistem Terintegrasi 3 Cabang: East, West, Citraland
          </div>

          <div className="space-y-6 max-w-lg">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#007AFF]/20 border border-[#007AFF]/40 text-cyan-300 text-xs font-bold">
              Pediatric Occupational Therapy Suite
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-white">
              Mendampingi setiap langkah tumbuh kembang anak secara terukur.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Platform tata kelola klinis komprehensif untuk terapis okupasi, admin penjadwalan, tim keuangan, dan orang tua dalam ekosistem Therapedia Developmental Center.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 hover:border-[#007AFF]/50 transition-colors">
                <TrendingUp className="w-5 h-5 text-cyan-400 mb-2" />
                <p className="font-bold text-sm text-white">Dashboard Revenue</p>
                <p className="text-xs text-slate-300 mt-1">Monitoring omzet 3 cabang & paket layanan</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 hover:border-emerald-400/50 transition-colors">
                <FileCheck2 className="w-5 h-5 text-emerald-400 mb-2" />
                <p className="font-bold text-sm text-white">Scheduler & Kredit</p>
                <p className="text-xs text-slate-300 mt-1">Multi-paket, slot frozen 0 kredit & cancel rules</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
