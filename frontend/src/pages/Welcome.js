import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, Layers, ArrowRight, Sparkles, ShieldCheck, MapPin, HeartHandshake } from "lucide-react";

export default function Welcome() {
  return (
    <div className="relative min-h-screen w-full bg-[#fafbfc] text-slate-900 flex flex-col justify-between items-center overflow-hidden selection:bg-[#007AFF] selection:text-white font-sans">
      {/* Subtle Minimalist Background Gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        {/* Soft center top blue tint */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-[450px] rounded-full bg-gradient-to-b from-blue-100/60 via-sky-50/30 to-transparent blur-[120px]" />

        {/* Soft bottom subtle accent */}
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-gradient-to-t from-blue-50/40 to-transparent blur-[100px]" />

        {/* Ultra-faint geometric grid line */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)",
            backgroundSize: "48px 48px"
          }}
        />
      </div>

      {/* Top Clean Brand Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 flex items-center justify-center shrink-0">
            <img
              src="/images/therapedia_logo.png"
              alt="Therapedia"
              className="w-full h-full object-contain drop-shadow-[0_2px_6px_rgba(0,122,255,0.25)]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-slate-900">Therapedia</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#007AFF] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/80">
              Center
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/80 shadow-2xs">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">3 Branches Active: East • West • Citraland</span>
        </div>
      </header>

      {/* Main Minimalist Center Gateway Content */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-6 py-10 flex flex-col items-center text-center my-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          {/* Official Mascot Logo with Floating Animation in Clean White Card */}
          <motion.div
            animate={{
              y: [0, -6, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative mb-6 group cursor-pointer"
          >
            {/* Ambient soft glow ring */}
            <div className="absolute -inset-3 bg-gradient-to-tr from-blue-400/20 via-sky-300/20 to-blue-500/10 rounded-full blur-xl opacity-70 group-hover:opacity-100 transition-opacity" />

            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xl shadow-blue-500/10 flex items-center justify-center">
              <img
                src="/images/therapedia_logo.png"
                alt="Therapedia Mascot Logo"
                className="w-full h-full object-contain drop-shadow-[0_6px_16px_rgba(0,122,255,0.25)]"
              />
            </div>
          </motion.div>

          {/* Minimalist Pill Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/70 text-xs font-bold text-[#007AFF] mb-4 shadow-2xs">

            <span>Pediatric Occupational Therapy & Developmental Center</span>
          </div>

          {/* Clean Prominent Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-900 leading-tight mb-4">
            Welcome to{" "}
            <span className="text-[#007AFF]">
              Therapedia
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-500 max-w-md mx-auto leading-relaxed mb-8 font-normal">
            Pusat tata kelola klinis tumbuh kembang anak, integrasi sensori, dan neurodevelopmental terpadu di Surabaya.
          </p>

          {/* 2 Main Action Buttons (Requested) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md mx-auto">
            {/* Button 1: Go to Landing Page */}
            <Link
              to="/landing"
              className="w-full sm:w-1/2 group relative inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#007AFF] hover:bg-[#0062cc] text-white font-extrabold text-sm shadow-md shadow-[#007AFF]/25 hover:shadow-lg hover:shadow-[#007AFF]/35 transition-all duration-200 active:scale-[0.98]"
              data-testid="welcome-to-landing-btn"
            >
              <Globe className="w-4 h-4 text-white/90 transition-transform group-hover:scale-110" />
              <span>Go to Landing Page</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>

            {/* Button 2: Go to Prototype */}
            <Link
              to="/roles"
              className="w-full sm:w-1/2 group relative inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-sm border-2 border-slate-200 hover:border-[#007AFF]/50 shadow-xs hover:shadow-md transition-all duration-200 active:scale-[0.98]"
              data-testid="welcome-to-prototype-btn"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Layers className="w-4 h-4 text-slate-600 group-hover:text-[#007AFF] transition-colors" />
              <span>Go to Prototype</span>
              <ArrowRight className="w-4 h-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-slate-800" />
            </Link>
          </div>

          {/* Additional Clean Quick Access Links */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 text-xs text-slate-500">
            <Link
              to="/assessment"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-600 hover:text-[#007AFF] transition-colors shadow-2xs"
              data-testid="welcome-to-assessment-link"
            >
              <HeartHandshake className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>Form Kuesioner Asesmen (Orang Tua)</span>
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-600 hover:text-[#007AFF] transition-colors shadow-2xs"
              data-testid="welcome-to-login-link"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>Login Staf & Klien</span>
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="relative z-10 w-full border-t border-slate-200/80 bg-white/70 backdrop-blur-md py-4">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-[#007AFF] shrink-0" />
            <span>East • West • Citraland</span>
          </div>
          <div className="flex items-center gap-4">
            <span>&copy; {new Date().getFullYear()} Therapedia Center</span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-slate-500 font-medium">Pediatric Clinical Suite</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
