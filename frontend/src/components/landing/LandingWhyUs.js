import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  UserCheck,
  TrendingUp,
  HeartHandshake,
  FileCheck2,
  Brain,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Layers,
  ArrowRight
} from "lucide-react";
import { CLINICAL_PILLARS } from "@/data/landingData";

export default function LandingWhyUs({ onBookClick }) {
  const [selectedApproach, setSelectedApproach] = useState("si");

  const approachDetails = {
    si: {
      title: "Sensory Integration (SI) Approach",
      tagline: "Ayres Sensory Integration® Framework",
      desc: "Metode terapi klinis berbasis neurobiologis yang membantu sistem saraf anak memproses, mengorganisir, dan merespons stimulus sensori (vestibular, proprioseptif, taktil) secara adaptif.",
      highlights: [
        "Optimalisasi regulasi emosi, fokus, dan rentang perhatian",
        "Mengatasi sensitivitas terhadap suara, tekstur makanan, atau sentuhan",
        "Peralatan ayunan suspended klinis, bola terapi, dan obstacle tactile",
        "Mendukung anak dengan Sensory Processing Disorder, ADHD, & Spektrum Autisme"
      ]
    },
    ndt: {
      title: "Neurodevelopmental Treatment (NDT) Approach",
      tagline: "Bobath Concept & Functional Movement",
      desc: "Pendekatan penanganan terapeutik langsung (hands-on) untuk memfasilitasi postur tubuh simetris, pola gerak normal, dan transisi motorik kasar pada anak dengan hambatan neuromotorik.",
      highlights: [
        "Fasilitasi tonus otot dan stabilitas postural core trunk",
        "Koreksi pola jalan, koordinasi motorik kasar, dan keseimbangan dinamis",
        "Integrasi gerakan fungsional untuk aktivitas harian mandiri (ADL)",
        "Didesain khusus untuk Cerebral Palsy, hipotonia, & keterlambatan motorik"
      ]
    }
  };

  const icons = {
    "experienced-team": UserCheck,
    "commitment-growth": TrendingUp,
    "family-centered": HeartHandshake,
    "personalized-therapy": FileCheck2
  };

  return (
    <section id="about" className="py-20 sm:py-28 bg-[#fafbfc] relative overflow-hidden">
      {/* Background Subtle Wave Accent */}
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[#040E1E] to-transparent opacity-10 pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#007aff]/10 border border-[#007aff]/20 text-[#007aff] text-xs font-bold uppercase tracking-wider mb-4">

            <span>Why Choose Therapedia</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
            Holistic, Personalized &{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#007aff] to-cyan-600">
              Evidence-Based
            </span>
          </h2>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Therapedia offers expert, personalized pediatric occupational therapy with a holistic approach,
            helping children grow confidently in everyday life and reach their full potential.
          </p>
        </div>

        {/* 4 Pillars Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {CLINICAL_PILLARS.map((pillar, idx) => {
            const Icon = icons[pillar.id] || UserCheck;
            return (
              <motion.div
                key={pillar.id}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="rounded-3xl p-6 sm:p-7 bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-cyan-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${pillar.color} border transition-transform duration-200 group-hover:scale-105`}
                    >
                      <Icon className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                      {pillar.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#007aff] transition-colors">
                    {pillar.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {pillar.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-semibold text-[#007aff]">
                  <span>Pilar Mutu Klinis</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Interactive Deep-Dive: Sensory Integration vs NDT Approach */}
        <div className="rounded-3xl bg-gradient-to-br from-[#071d3f] to-[#040e1e] text-white p-6 sm:p-10 lg:p-12 shadow-2xl border border-white/10 relative overflow-hidden">
          {/* Subtle glow orb */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left: Tab Switcher & Explanation */}
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-cyan-300 text-xs font-semibold mb-4 border border-white/10">
                <Brain className="w-3.5 h-3.5" />
                <span>Clinical Methodologies</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-4">
                Dua Pendekatan Terapi Utama di Therapedia
              </h3>

              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Kami menggabungkan stimulasi sensori terstruktur dengan fasilitasi gerak fisiologis untuk
                menjawab kebutuhan tumbuh kembang spesifik buah hati Anda.
              </p>

              {/* Approach Toggle Buttons */}
              <div className="flex rounded-2xl bg-white/10 p-1.5 border border-white/10 mb-6 max-w-md">
                <button
                  onClick={() => setSelectedApproach("si")}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedApproach === "si"
                      ? "bg-[#007aff] text-white shadow-md shadow-[#007aff]/30"
                      : "text-slate-300 hover:text-white"
                    }`}
                >
                  Sensory Integration (SI)
                </button>
                <button
                  onClick={() => setSelectedApproach("ndt")}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedApproach === "ndt"
                      ? "bg-[#007aff] text-white shadow-md shadow-[#007aff]/30"
                      : "text-slate-300 hover:text-white"
                    }`}
                >
                  Neurodevelopmental (NDT)
                </button>
              </div>

              {/* Action Button */}
              <button
                onClick={onBookClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#040e1e] hover:bg-cyan-50 font-bold text-xs tracking-wide transition-all shadow-md cursor-pointer"
              >
                <span>Konsultasi Kebutuhan Anak</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right: Active Approach Showcase Card */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl bg-white/10 border border-white/15 p-6 sm:p-7 backdrop-blur-md">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    {approachDetails[selectedApproach].tagline}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>

                <h4 className="text-xl font-bold text-white mb-3">
                  {approachDetails[selectedApproach].title}
                </h4>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-5">
                  {approachDetails[selectedApproach].desc}
                </p>

                <div className="space-y-2.5">
                  {approachDetails[selectedApproach].highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
