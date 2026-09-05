import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  LogIn,
  Layers,
  Building2,
  CalendarDays,
  HeartHandshake,
  ChevronRight,
  Activity,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Framer Motion animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (custom = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: custom * 0.1,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const floatingOrb = {
  animate: {
    scale: [1, 1.08, 1],
    x: [0, 20, 0],
    y: [0, -15, 0],
    transition: {
      duration: 10,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const floatingOrbReverse = {
  animate: {
    scale: [1, 1.12, 1],
    x: [0, -25, 0],
    y: [0, 20, 0],
    transition: {
      duration: 12,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export default function Home() {
  const navigate = useNavigate();

  const handleTryPrototype = () => {
    navigate("/roles");
  };

  const handleGoToLogin = () => {
    navigate("/login");
  };

  const features = [
    {
      icon: Building2,
      tag: "Multi-Branch Control",
      title: "Operasional 3 Cabang",
      desc: "Monitoring terpadu cabang Surabaya Timur, Citraland, & Surabaya Barat dengan analitik revenue dan matriks utilisasi ruang.",
      color: "from-sky-500/10 to-sky-600/10 text-sky-700 border-sky-200/80",
      accent: "bg-sky-500",
    },
    {
      icon: CalendarDays,
      tag: "Clinical Scheduler",
      title: "Intake Pipeline & Timetable",
      desc: "Alur intake non-sekuensial (BOT-A, FOT-A), slot frozen otomatis 0 kredit, validasi kuota paket sesi, & audit pembatalan.",
      color: "from-emerald-500/10 to-teal-600/10 text-emerald-700 border-emerald-200/80",
      accent: "bg-emerald-500",
    },
    {
      icon: HeartHandshake,
      tag: "Connected Portals",
      title: "Kolaborasi Terapis & Ortu",
      desc: "Jadwal mandiri terapis, rekam SOAP & homework anak, serta portal orang tua dengan invoice dan bukti transfer transparan.",
      color: "from-indigo-500/10 to-blue-600/10 text-indigo-700 border-indigo-200/80",
      accent: "bg-indigo-500",
    },
  ];

  const branches = [
    { name: "Surabaya Timur", status: "Kapasitas 100%", activeClients: "54 Klien Aktif" },
    { name: "Citraland", status: "Kapasitas 92%", activeClients: "46 Klien Aktif" },
    { name: "Surabaya Barat", status: "Kapasitas 88%", activeClients: "38 Klien Aktif" },
  ];

  return (
    <div className="relative min-h-screen bg-[#fafbfc] text-slate-900 overflow-hidden flex flex-col justify-between selection:bg-sky-100 selection:text-sky-900">
      {/* Background Animated Ambient Lights (Taste-Design Restraint) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        {/* Soft glowing orb 1 - Top Center */}
        <motion.div
          variants={floatingOrb}
          animate="animate"
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-[450px] rounded-full bg-gradient-to-tr from-sky-200/40 via-cyan-100/30 to-blue-200/20 blur-[100px] opacity-70"
        />
        {/* Soft glowing orb 2 - Bottom Left */}
        <motion.div
          variants={floatingOrbReverse}
          animate="animate"
          className="absolute -bottom-24 -left-24 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-emerald-100/30 via-sky-100/30 to-slate-200/20 blur-[90px] opacity-60"
        />
        {/* Soft glowing orb 3 - Bottom Right */}
        <motion.div
          variants={floatingOrb}
          animate="animate"
          className="absolute top-1/3 -right-24 w-[450px] h-[450px] rounded-full bg-gradient-to-br from-indigo-100/30 via-sky-100/20 to-transparent blur-[90px] opacity-60"
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "radial-gradient(#0284c7 1px, transparent 1px), radial-gradient(#0284c7 1px, #fafbfc 1px)",
            backgroundSize: "40px 40px",
            backgroundPosition: "0 0, 20px 20px",
          }}
        />
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="max-w-4xl mx-auto w-full text-center flex flex-col items-center">
          {/* Centered Brand Emblem */}
          <motion.div
            custom={0}
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="flex items-center gap-3 mb-6"
          >
            <motion.div
              whileHover={{ scale: 1.06, rotate: 2 }}
              whileTap={{ scale: 0.96 }}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 via-sky-500 to-cyan-400 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-sky-500/25"
            >
              T
            </motion.div>
            <div className="text-left">
              <p className="font-black text-lg leading-tight tracking-tight text-slate-900">Therapedia</p>
              <p className="text-xs font-semibold text-slate-500">Developmental Center</p>
            </div>
          </motion.div>

          {/* Tagline Pill Badge with subtle glow */}
          <motion.div
            custom={0.5}
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-sky-200/80 text-sky-800 shadow-xs mb-6 backdrop-blur-sm"
          >
            <span className="flex h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
            <span className="text-xs font-bold tracking-wide">
              Pediatric Developmental Center • Multisite Healthcare System
            </span>
           
          </motion.div>

          {/* Centered Main Title: Welcome to Therapedia */}
          <motion.h1
            custom={1}
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.08] max-w-3xl"
          >
            Welcome to{" "}
            <span className="bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-500 bg-clip-text text-transparent drop-shadow-xs">
              Therapedia
            </span>
          </motion.h1>

          {/* Centered Descriptive Subtitle */}
          <motion.p
            custom={2}
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="mt-5 sm:mt-6 text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl font-normal leading-relaxed"
          >
            Sistem tata kelola klinis tumbuh kembang anak terpadu. Menghubungkan direktur, manajer cabang,
            terapis okupasi, admin intake, dan keluarga pasien dalam satu ekosistem terintegrasi.
          </motion.p>

          {/* Primary & Secondary Action Choices (Centered) */}
          <motion.div
            custom={3}
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full max-w-md sm:max-w-none"
          >
            {/* Primary CTA: Coba Prototype Sekarang */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                onClick={handleTryPrototype}
                className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 text-white font-bold text-sm sm:text-base px-7 py-6 shadow-lg shadow-sky-600/25 border border-sky-400/30 transition-all group cursor-pointer"
                data-testid="home-try-prototype-button"
              >
                <Layers className="w-4 h-4 mr-2 text-sky-100" />
                <span>Coba Prototype Sekarang</span>
                <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </motion.div>

            {/* Secondary Option: Halaman Login */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                variant="outline"
                onClick={handleGoToLogin}
                className="w-full sm:w-auto rounded-2xl bg-white/90 hover:bg-slate-50 border-slate-200/90 hover:border-sky-300 text-slate-800 font-bold text-sm sm:text-base px-7 py-6 shadow-sm transition-all text-left cursor-pointer"
                data-testid="home-login-button"
              >
                <LogIn className="w-4 h-4 mr-2 text-sky-600" />
                <span>Halaman Login</span>
              </Button>
            </motion.div>
          </motion.div>

          {/* Quick Parent Assessment Link */}
          <motion.div
            custom={4}
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500"
          >
            <span>Orang tua dengan kode asesmen?</span>
            <Link
              to="/assessment"
              className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 font-bold underline-offset-4 hover:underline"
              data-testid="home-assessment-link"
            >
              Isi Kuesioner Asesmen Online
              <ChevronRight className="w-3 h-3" />
            </Link>
          </motion.div>

          {/* Feature Highlight Cards (Minimalist, Tasteful & Tactile) */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="mt-14 sm:mt-18 grid grid-cols-1 md:grid-cols-3 gap-4.5 sm:gap-5 w-full text-left"
          >
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={i}
                  variants={fadeInUp}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="rounded-2xl p-5 sm:p-6 bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-xs hover:shadow-md hover:border-sky-300/80 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${f.color} border transition-transform duration-200 group-hover:scale-105`}
                      >
                        <Icon className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-100/80 px-2 py-0.5 rounded-md">
                        {f.tag}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-base text-slate-900 mb-1.5 group-hover:text-sky-700 transition-colors">
                      {f.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {f.desc}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-sky-600">
                    <span>Tersedia dalam prototype</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-500" />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

        </div>
      </main>

      {/* Minimalist Footer */}
      <footer className="relative z-10 w-full border-t border-slate-200/60 bg-white/50 backdrop-blur-xs py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Therapedia Developmental Center</span>
            <span>•</span>
            <span>Sistem Operasional Terpadu</span>
          </div>
          <div className="flex items-center gap-4 font-medium">
            <button
              onClick={handleTryPrototype}
              className="hover:text-sky-700 transition-colors font-semibold cursor-pointer"
            >
              Role Switcher
            </button>
            <button
              onClick={handleGoToLogin}
              className="hover:text-sky-700 transition-colors font-semibold cursor-pointer"
            >
              Halaman Login
            </button>
            <Link to="/assessment" className="hover:text-sky-700 transition-colors font-semibold">
              Portal Asesmen
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
