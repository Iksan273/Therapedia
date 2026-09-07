import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MapPin,
  Award,
  ArrowRight,
  X,
  CheckCircle2,
  Calendar,
  Layers,
  LayoutGrid,
  SlidersHorizontal,
  GraduationCap
} from "lucide-react";
import { CLINICAL_TEAM } from "@/data/landingData";

export default function LandingTeam({ selectedDoctorFromHero, onBookClick }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [modalDoctor, setModalDoctor] = useState(selectedDoctorFromHero || null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState("carousel"); // 'carousel' | 'grid'
  const [cardsPerView, setCardsPerView] = useState(3);
  const [isHovered, setIsHovered] = useState(false);

  // Sync if prop changed from Hero
  useEffect(() => {
    if (selectedDoctorFromHero) {
      setModalDoctor(selectedDoctorFromHero);
    }
  }, [selectedDoctorFromHero]);

  // Responsive cards per view calculation
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setCardsPerView(1);
      } else if (window.innerWidth < 1024) {
        setCardsPerView(2);
      } else if (window.innerWidth < 1280) {
        setCardsPerView(3);
      } else {
        setCardsPerView(4);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const filterTabs = [
    { id: "all", label: "Semua Spesialis" },
    { id: "leadership", label: "Leadership & Supervisors" },
    { id: "east", label: "East Branch" },
    { id: "west", label: "West Branch" },
    { id: "citraland", label: "Citraland Branch" }
  ];

  const filteredTeam = CLINICAL_TEAM.filter((member) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "leadership") {
      return member.branch === "All Branches" || member.role.includes("Director") || member.role.includes("Supervisor");
    }
    if (activeFilter === "east") {
      return member.branch.includes("East") || member.branch.includes("Rungkut");
    }
    if (activeFilter === "west") {
      return member.branch.includes("West") || member.branch.includes("Lagoon Avenue") || member.branch.includes("Sungkono");
    }
    if (activeFilter === "citraland") {
      return member.branch.includes("Citraland");
    }
    return true;
  });

  const maxIndex = Math.max(0, filteredTeam.length - cardsPerView);

  // Reset current index when filter changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [activeFilter]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  return (
    <section id="team" className="py-20 sm:py-28 bg-[#040e1e] text-white relative overflow-hidden select-none">
      {/* Dynamic ambient studio lighting glows */}
      <div className="absolute top-1/3 -left-32 w-[550px] h-[550px] bg-[#007aff]/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-10 right-1/4 w-80 h-80 bg-[#0051a8]/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Subtle background tech line grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)",
          backgroundSize: "64px 64px"
        }}
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header with Refined Editorial Layout */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-4">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Our Dedicated Clinical Specialists</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.08]">
              Meet Our Certified{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-[#38bdf8] to-[#007aff]">
                Pediatric Practitioners
              </span>
            </h2>

            <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed">
              Clinical directors, licensed occupational therapists, and psychologists collaborating across Surabaya
              with evidence-based Sensory Integration (SI) & Neurodevelopmental Treatment (NDT).
            </p>
          </div>

          {/* Controls: Carousel Navigators & View Toggle */}
          <div className="flex items-center gap-3">
            {/* View Mode Toggle Button */}
            <div className="flex rounded-xl bg-white/10 p-1 border border-white/10">
              <button
                onClick={() => setViewMode("carousel")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "carousel"
                    ? "bg-[#007aff] text-white shadow-md shadow-[#007aff]/30"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Tampilan Carousel Geser"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Carousel</span>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-[#007aff] text-white shadow-md shadow-[#007aff]/30"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Tampilan Grid Seluruh Tim"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
            </div>

            {/* Carousel Arrow Controls (Active in Carousel Mode) */}
            {viewMode === "carousel" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 flex items-center justify-center text-white transition-all shadow-md cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed group"
                  aria-label="Previous Specialist"
                >
                  <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
                </button>
                <button
                  onClick={handleNext}
                  className="w-10 h-10 rounded-full bg-[#007aff] hover:bg-[#0051a8] active:scale-95 border border-white/20 flex items-center justify-center text-white transition-all shadow-lg shadow-[#007aff]/35 cursor-pointer group"
                  aria-label="Next Specialist"
                >
                  <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter Navigation Tabs with Smooth Pill Indicator */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all whitespace-nowrap cursor-pointer relative ${
                activeFilter === tab.id
                  ? "bg-[#007aff] text-white shadow-lg shadow-[#007aff]/30 border border-white/25"
                  : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
              }`}
            >
              {tab.label}
              {activeFilter === tab.id && (
                <motion.div
                  layoutId="activeTeamFilter"
                  className="absolute inset-0 rounded-full bg-[#007aff] -z-10"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </button>
          ))}
          <span className="text-xs font-semibold text-slate-400 pl-3">
            ({filteredTeam.length} Praktisi)
          </span>
        </div>

        {/* CAROUSEL VIEW MODE */}
        {viewMode === "carousel" ? (
          <div
            className="relative overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Sliding Track */}
            <motion.div
              className="flex gap-6"
              animate={{
                x: `calc(-${currentIndex} * (${100 / cardsPerView}% + ${24 / cardsPerView}px))`
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 30,
                mass: 0.8
              }}
            >
              {filteredTeam.map((member, idx) => (
                <div
                  key={member.id}
                  style={{
                    flex: `0 0 calc(${100 / cardsPerView}% - ${(24 * (cardsPerView - 1)) / cardsPerView}px)`
                  }}
                >
                  <SpecialistCard
                    member={member}
                    onOpenModal={() => setModalDoctor(member)}
                  />
                </div>
              ))}
            </motion.div>

            {/* Carousel Progress Track & Counter */}
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-white/10 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-mono text-cyan-400 font-bold">
                  {String(currentIndex + 1).padStart(2, "0")}
                </span>
                <span className="text-slate-600">/</span>
                <span className="font-mono text-slate-400">
                  {String(filteredTeam.length).padStart(2, "0")}
                </span>
              </div>

              {/* Dot Indicators */}
              <div className="flex items-center gap-1.5">
                {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      currentIndex === idx
                        ? "w-6 bg-cyan-400"
                        : "w-2 bg-white/20 hover:bg-white/40"
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Geser atau klik Next untuk melihat profil terapis lainnya
              </div>
            </div>
          </div>
        ) : (
          /* GRID VIEW MODE */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-300">
            {filteredTeam.map((member) => (
              <SpecialistCard
                key={member.id}
                member={member}
                onOpenModal={() => setModalDoctor(member)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Specialist Comprehensive Profile Modal */}
      <AnimatePresence>
        {modalDoctor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-gradient-to-b from-[#081b38] to-[#040e1e] text-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20 p-6 sm:p-8 relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setModalDoctor(null)}
                className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close Profile"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-6">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shrink-0 border-2 border-cyan-400/50 shadow-xl bg-[#020914] relative">
                  <img
                    src={modalDoctor.image}
                    alt={modalDoctor.name}
                    className="w-full h-full object-cover object-top"
                  />
                  <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#081b38]" />
                </div>
                <div className="text-center sm:text-left">
                  <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-bold border border-cyan-400/30 inline-block mb-2">
                    {modalDoctor.branch}
                  </span>
                  <h3 className="text-xl font-bold text-white tracking-tight leading-snug">
                    {modalDoctor.name}
                  </h3>
                  <p className="text-xs text-slate-300 font-medium mt-1">
                    {modalDoctor.role}
                  </p>
                  <p className="text-[11px] text-cyan-400 font-semibold mt-0.5">
                    {modalDoctor.department}
                  </p>
                </div>
              </div>

              {/* Bio & Clinical Background Details */}
              <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/10 pt-4 mb-6">
                <div>
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-cyan-400" />
                    <span>Latar Belakang & Pendekatan Klinis</span>
                  </h4>
                  <p className="bg-white/5 p-3.5 rounded-2xl border border-white/10 text-slate-200">
                    {modalDoctor.bio}
                  </p>
                </div>

                {/* Specialties Tags */}
                {modalDoctor.specialties && modalDoctor.specialties.length > 0 && (
                  <div>
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-cyan-400" />
                      <span>Fokus Kompetensi & Layanan:</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {modalDoctor.specialties.map((spec, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-xl bg-cyan-500/15 text-cyan-200 text-xs font-semibold border border-cyan-400/30 flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{spec}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  onClick={() => setModalDoctor(null)}
                  className="px-5 py-2.5 rounded-xl border border-white/20 text-slate-300 font-semibold text-xs hover:bg-white/10 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    setModalDoctor(null);
                    if (onBookClick) onBookClick();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#007aff] to-[#0051a8] hover:from-[#1a87ff] hover:to-[#0062cc] text-white font-bold text-xs tracking-wide shadow-lg shadow-[#007aff]/35 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Konsultasi dengan Terapis Ini</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

// Sub-Component: Specialist Card with Enhanced Hover and Tasteful Details
function SpecialistCard({ member, onOpenModal }) {
  const [cardHover, setCardHover] = useState(false);

  return (
    <motion.div
      onMouseEnter={() => setCardHover(true)}
      onMouseLeave={() => setCardHover(false)}
      whileHover={{ y: -8, transition: { duration: 0.25, ease: "easeOut" } }}
      className="h-full rounded-3xl bg-gradient-to-b from-white/10 via-white/5 to-[#051428]/80 border border-white/15 hover:border-cyan-400/60 p-5 backdrop-blur-md shadow-xl hover:shadow-2xl hover:shadow-cyan-950/50 transition-all flex flex-col justify-between group relative overflow-hidden"
    >
      {/* Dynamic Hover Spotlight Glow */}
      <div
        className={`absolute -top-12 -right-12 w-36 h-36 bg-[#007aff]/20 rounded-full blur-2xl transition-opacity duration-300 pointer-events-none ${
          cardHover ? "opacity-100" : "opacity-0"
        }`}
      />

      <div>
        {/* Photo Container with Elegant Vignette & Hover Zoom */}
        <div className="relative w-full aspect-[4/4.3] rounded-2xl overflow-hidden mb-4 bg-[#030914] border border-white/10 shadow-inner">
          <img
            src={member.image}
            alt={member.name}
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-108"
            onError={(e) => {
              e.target.src = "https://therapedia.center/uploads//CMS/Team/ef264958-20ce-4fee-aa34-ee634cc43190.jpg";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#040e1e] via-transparent to-transparent opacity-70 group-hover:opacity-50 transition-opacity" />

          {/* Branch Pill Tag on Photo */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-lg bg-[#040e1e]/85 backdrop-blur-md text-[10px] font-bold text-cyan-300 border border-white/15 shadow-sm">
              {member.branch.replace(" Branch", "")}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
          </div>
        </div>

        {/* Member Name & Role */}
        <div className="mb-3">
          <h3 className="font-bold text-base text-white tracking-tight leading-snug line-clamp-1 group-hover:text-cyan-300 transition-colors">
            {member.name}
          </h3>
          <p className="text-xs text-slate-300 font-medium line-clamp-1 mt-0.5">
            {member.role}
          </p>
        </div>

        {/* Mini Bio Snippet */}
        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-4">
          {member.bio}
        </p>

        {/* Specialty Tag Pills */}
        {member.specialties && member.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {member.specialties.slice(0, 2).map((s, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-300 group-hover:border-cyan-400/30 transition-colors line-clamp-1"
              >
                {s}
              </span>
            ))}
            {member.specialties.length > 2 && (
              <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-[9px] text-cyan-300 font-semibold">
                +{member.specialties.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Action Button with Micro-Interaction */}
      <button
        onClick={onOpenModal}
        className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-[#007aff] border border-white/15 hover:border-transparent text-white text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm group-hover:shadow-lg group-hover:shadow-[#007aff]/40 active:scale-[0.98] cursor-pointer"
      >
        <span>Lihat Profil & Jadwal</span>
        <ArrowRight className="w-3.5 h-3.5 text-cyan-400 group-hover:text-white transition-transform group-hover:translate-x-1" />
      </button>
    </motion.div>
  );
}
