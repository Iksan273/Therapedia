import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronRight, ChevronLeft, Sparkles, MapPin, Clock, Award, ShieldCheck, Activity } from "lucide-react";
import { CLINICAL_TEAM, CLINIC_INFO } from "@/data/landingData";
import { useNavigate } from "react-router-dom";

export default function LandingHero({ onSelectDoctor, onBookClick }) {
  const navigate = useNavigate();
  const [currentDoctorIndex, setCurrentDoctorIndex] = useState(0);
  const [liveTime, setLiveTime] = useState("");

  // Real-time Surabaya GMT+7 clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const options = {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      };
      const timeString = new Intl.DateTimeFormat("en-GB", options).format(now);
      setLiveTime(timeString);
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter hero doctors showcase
  const heroDoctors = CLINICAL_TEAM.slice(0, 6);

  const nextDoctor = () => {
    setCurrentDoctorIndex((prev) => (prev + 1) % heroDoctors.length);
  };

  const prevDoctor = () => {
    setCurrentDoctorIndex((prev) => (prev - 1 + heroDoctors.length) % heroDoctors.length);
  };

  const currentDoctor = heroDoctors[currentDoctorIndex];

  return (
    <section
      id="home"
      className="relative min-h-[100dvh] bg-gradient-to-b from-[#030B17] via-[#061833] to-[#040E1E] text-white flex flex-col justify-between pt-24 sm:pt-28 pb-8 px-4 sm:px-6 lg:px-8 overflow-hidden select-none"
    >
      {/* Background Ambient Radial Glows (Tasteful Studio Lighting) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Deep blue center ambient spotlight behind the 3D sculpture */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-[#0051a8]/35 via-[#007aff]/25 to-cyan-400/15 blur-[120px]" />
        {/* Soft cyan aura on upper right */}
        <div className="absolute top-20 right-10 w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[100px]" />
        {/* Subtle grid texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)",
            backgroundSize: "60px 60px"
          }}
        />
      </div>

      {/* Main Hero Split Grid Container (Matching Denta Structure) */}
      <div className="relative z-10 max-w-[1440px] mx-auto w-full flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-4 items-center py-6 sm:py-10">
          {/* Left Column (Editorial Typography & Mission) - 5 Cols */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 flex flex-col justify-center pr-0 lg:pr-6"
          >
            {/* Top Subtext Paragraph (As positioned in Denta reference) */}
            <div className="mb-6 max-w-[420px]">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs font-semibold mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>Pediatric Occupational Therapy Center</span>
              </div>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                From early sensory integration to neurodevelopmental treatment, a comprehensive clinical approach
                for every child's milestone and everyday independence.
              </p>
            </div>

            {/* Giant Editorial Headline */}
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black text-white tracking-tight leading-[1.06] mb-6 drop-shadow-sm">
              Modern Care for Every{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-[#38bdf8] to-[#007aff]">
                Child's Milestone
              </span>
            </h1>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={onBookClick}
                className="px-6 py-3.5 rounded-full bg-gradient-to-r from-[#007aff] to-[#0051a8] hover:from-[#1a87ff] hover:to-[#0062cc] text-white font-bold text-sm tracking-wide shadow-lg shadow-[#007aff]/35 border border-white/25 hover:scale-[1.02] transition-all flex items-center gap-2 cursor-pointer group"
                data-testid="hero-consultation-button"
              >
                <span>Book Clinical Consultation</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>

              <a
                href="#programs"
                className="px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-sm tracking-wide border border-white/20 backdrop-blur-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Lihat Program</span>
                <ChevronRight className="w-4 h-4 text-cyan-400" />
              </a>
            </div>

            {/* Assessment Quick Callout for Parents */}
            <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Orang tua dengan token skrining?</span>
              <button
                onClick={() => navigate("/assessment")}
                className="text-cyan-300 hover:text-white font-semibold underline underline-offset-4 transition-colors cursor-pointer"
              >
                Isi Kuesioner Asesmen
              </button>
            </div>
          </motion.div>

          {/* Center Column (Official Therapedia Mascot Logo Centerpiece) - 4 Cols */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-4 flex items-center justify-center relative my-6 lg:my-0"
          >
            {/* Ambient Radial Rim Glow behind Therapedia logo */}
            <div className="absolute w-72 sm:w-80 h-72 sm:h-80 rounded-full bg-gradient-to-tr from-[#007aff]/35 via-cyan-400/25 to-transparent blur-3xl pointer-events-none" />

            {/* Floating Logo Container */}
            <motion.div
              animate={{
                y: [-8, 8, -8]
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative z-10 w-56 sm:w-64 md:w-72 aspect-square flex items-center justify-center"
            >
              <img
                src="/images/therapedia_logo.png"
                alt="Therapedia Official Logo"
                className="w-full h-full object-contain drop-shadow-[0_20px_45px_rgba(0,122,255,0.5)] filter"
                loading="eager"
              />
            </motion.div>
          </motion.div>

          {/* Right Column (Doctor & Specialist Sliding Card Carousel) - 3 Cols */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-3 flex flex-col justify-center"
          >
            {/* Carousel Header with Next / Prev */}
            <div className="flex items-center justify-between mb-3 text-xs font-semibold text-slate-300">
              <span className="uppercase tracking-wider text-[11px] text-cyan-300 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Clinical Specialists
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={prevDoctor}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
                  aria-label="Previous Specialist"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextDoctor}
                  className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center gap-1 text-[11px] text-slate-200 hover:text-white transition-all cursor-pointer"
                  aria-label="Next Specialist"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              </div>
            </div>

            {/* Active Specialist Card (Denta Right Preview Style) */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/15 backdrop-blur-md p-3 shadow-xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentDoctor.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="flex flex-col"
                >
                  {/* Photo with clean portrait aspect */}
                  <div className="relative w-full aspect-[4/4.5] rounded-xl overflow-hidden mb-3 bg-[#020914] border border-white/10">
                    <img
                      src={currentDoctor.image}
                      alt={currentDoctor.name}
                      className="w-full h-full object-cover object-top transition-transform duration-500 hover:scale-105"
                      onError={(e) => {
                        // Fallback portrait
                        e.target.src = "https://therapedia.center/uploads//CMS/Team/ef264958-20ce-4fee-aa34-ee634cc43190.jpg";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#040e1e] via-transparent to-transparent opacity-60" />
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-[#040e1e]/80 text-[10px] text-cyan-300 font-semibold backdrop-blur-xs border border-white/10">
                      {currentDoctor.branch.replace(" Branch", "")}
                    </span>
                  </div>

                  {/* Doctor Info */}
                  <div className="px-1">
                    <h4 className="text-sm font-bold text-white tracking-tight leading-snug line-clamp-1">
                      {currentDoctor.name}
                    </h4>
                    <p className="text-[11px] text-slate-300 line-clamp-1 mb-2 font-medium">
                      {currentDoctor.role}
                    </p>

                    <button
                      onClick={() => onSelectDoctor && onSelectDoctor(currentDoctor)}
                      className="w-full py-2 rounded-xl bg-white/10 hover:bg-[#007aff]/30 border border-white/15 hover:border-cyan-400/50 text-white text-[11px] font-bold tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer group"
                    >
                      <span>Lihat Profil Lengkap</span>
                      <ArrowRight className="w-3 h-3 text-cyan-400 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Step indicator dots */}
              <div className="flex items-center justify-center gap-1.5 mt-3 pt-2 border-t border-white/10">
                {heroDoctors.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentDoctorIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      currentDoctorIndex === idx ? "w-5 bg-cyan-400" : "w-1.5 bg-white/20 hover:bg-white/40"
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Hero Bottom Metadata Bar (Matching Denta Reference Border Separator) */}
      <div className="relative z-10 max-w-[1440px] mx-auto w-full pt-4 mt-4 border-t border-white/15">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 text-xs text-slate-300">
          {/* Metadata Col 1: Best Pediatric Care & Year */}
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#007aff]" />
            <div>
              <p className="font-bold text-white tracking-wide">Pusat Terapi Okupasi Pediatrik</p>
              <p className="text-[11px] text-slate-400">Surabaya • Certified SI & NDT 2025</p>
            </div>
          </div>

          {/* Metadata Col 2: Live Surabaya Location & Clock */}
          <div className="flex items-center gap-2.5 md:justify-center">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <p className="font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>Surabaya, Indonesia</span>
                <span className="text-cyan-400 font-mono text-[11px]">
                  {liveTime ? `${liveTime} WIB (GMT+7)` : "14:30:00 WIB"}
                </span>
              </p>
              <p className="text-[11px] text-slate-400">Jam Layanan: 08.00 – 18.00 WIB</p>
            </div>
          </div>

          {/* Metadata Col 3: Branches Summary */}
          <div className="flex items-center gap-2.5 md:justify-end">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <div>
              <p className="font-bold text-white tracking-wide">3 Cabang Terpadu Surabaya</p>
              <p className="text-[11px] text-slate-400">East • West • Citraland</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
