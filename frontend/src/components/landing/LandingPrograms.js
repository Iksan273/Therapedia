import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, CheckCircle2, X, Calendar, Clock, Baby, Activity } from "lucide-react";
import { CLINICAL_PROGRAMS } from "@/data/landingData";

export default function LandingPrograms({ onBookClick }) {
  const [selectedProgram, setSelectedProgram] = useState(null);

  return (
    <section id="programs" className="py-20 sm:py-28 bg-white relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#007aff]/10 border border-[#007aff]/20 text-[#007aff] text-xs font-bold uppercase tracking-wider mb-4">
            <Activity className="w-3.5 h-3.5" />
            <span>Clinical Programs</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
            Tailored Interventions for Every{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#007aff] to-cyan-600">
              Developmental Stage
            </span>
          </h2>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Our programs are designed to provide personalized pediatric occupational therapy, focusing on sensory
            integration, motor skills, and daily life independence to help children reach their fullest potential.
          </p>
        </div>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {CLINICAL_PROGRAMS.map((prog, idx) => (
            <motion.div
              key={prog.id}
              whileHover={{ y: -8, transition: { duration: 0.25 } }}
              className="rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-sm hover:shadow-2xl hover:border-cyan-300 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Program Header Image */}
                <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-100">
                  <img
                    src={prog.image}
                    alt={prog.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70" />

                  {/* Category & Age Badges */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-[#007aff]/90 text-white text-[11px] font-bold backdrop-blur-xs shadow-sm">
                      {prog.ageGroup}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-white/90 text-slate-800 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-xs">
                      {prog.category.split(" ")[0]}
                    </span>
                  </div>
                </div>

                {/* Program Body */}
                <div className="p-6">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2 group-hover:text-[#007aff] transition-colors leading-snug">
                    {prog.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal line-clamp-3 mb-4">
                    {prog.desc}
                  </p>

                  {/* Bullet Benefits Highlights */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    {prog.benefits.slice(0, 3).map((b, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-6 pt-0 flex items-center gap-2.5">
                <button
                  onClick={() => setSelectedProgram(prog)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-[#007aff]/10 text-slate-800 hover:text-[#007aff] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Detail Lengkap</span>
                </button>
                <button
                  onClick={onBookClick}
                  className="py-2.5 px-4 rounded-xl bg-[#007aff] hover:bg-[#0051a8] text-white text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm hover:shadow-md"
                >
                  <span>Daftar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Program Detail Modal */}
      <AnimatePresence>
        {selectedProgram && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-8 relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedProgram(null)}
                className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-[#007aff]/10 text-[#007aff] text-xs font-bold">
                  {selectedProgram.ageGroup}
                </span>
                <span className="text-xs text-slate-400 font-semibold">• {selectedProgram.category}</span>
              </div>

              <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-4">
                {selectedProgram.title}
              </h3>

              <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden mb-5 bg-slate-100">
                <img
                  src={selectedProgram.image}
                  alt={selectedProgram.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-4 text-sm text-slate-600 leading-relaxed mb-6">
                <p>{selectedProgram.fullDesc}</p>

                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider pt-2">
                  Target & Manfaat Klinis Program:
                </h4>
                <div className="space-y-2">
                  {selectedProgram.benefits.map((b, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setSelectedProgram(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    setSelectedProgram(null);
                    if (onBookClick) onBookClick();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#007aff] hover:bg-[#0051a8] text-white font-bold text-xs tracking-wide shadow-md shadow-[#007aff]/30 cursor-pointer"
                >
                  Konsultasi Program Ini
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
