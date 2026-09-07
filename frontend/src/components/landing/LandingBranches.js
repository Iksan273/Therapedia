import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, Phone, ExternalLink, ChevronRight, CheckCircle2, X } from "lucide-react";
import { CLINICAL_BRANCHES } from "@/data/landingData";

export default function LandingBranches() {
  const [selectedBranchId, setSelectedBranchId] = useState(CLINICAL_BRANCHES[0].id);
  const [lightboxImage, setLightboxImage] = useState(null);

  const activeBranch = CLINICAL_BRANCHES.find((b) => b.id === selectedBranchId) || CLINICAL_BRANCHES[0];

  return (
    <section id="branches" className="py-20 sm:py-28 bg-[#fafbfc] relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#007aff]/10 border border-[#007aff]/20 text-[#007aff] text-xs font-bold uppercase tracking-wider mb-4">
            <MapPin className="w-3.5 h-3.5" />
            <span>Accessible Locations Across Surabaya</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
            Our 3 Integrated{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#007aff] to-cyan-600">
              Therapy Centers
            </span>
          </h2>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Therapedia has branches across Surabaya to make quality pediatric occupational therapy more
            accessible and comfortable for families.
          </p>
        </div>

        {/* Branch Selector Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {CLINICAL_BRANCHES.map((b) => {
            const isSelected = b.id === selectedBranchId;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBranchId(b.id)}
                className={`p-5 rounded-3xl text-left transition-all border cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-br from-[#071d3f] to-[#040e1e] text-white border-transparent shadow-xl shadow-blue-950/20 scale-[1.02]"
                    : "bg-white text-slate-700 border-slate-200/90 hover:border-cyan-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      isSelected ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {b.area}
                  </span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isSelected ? "bg-cyan-400 animate-pulse" : "bg-slate-300"
                    }`}
                  />
                </div>
                <h3 className="font-bold text-base tracking-tight leading-snug mb-1">
                  {b.shortName}
                </h3>
                <p
                  className={`text-xs line-clamp-1 ${
                    isSelected ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  {b.address}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active Branch Detail & Gallery Showcase */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-10 shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Branch Info Column */}
            <div className="lg:col-span-5 space-y-5">
              <div>
                <span className="text-xs font-bold text-[#007aff] uppercase tracking-wider">
                  Cabang Aktif
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1 mb-2">
                  {activeBranch.name}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#007aff] shrink-0 mt-1" />
                  <span>{activeBranch.address}</span>
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#007aff]" />
                  <span className="font-semibold">{activeBranch.hours}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>Konsultasi Resepsionis Cabang: {activeBranch.phone}</span>
                </div>
              </div>

              {/* Facility amenities */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Fasilitas & Ruang Klinis:
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {activeBranch.facilities.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Maps Action */}
              <div className="pt-2">
                <a
                  href={activeBranch.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#007aff] hover:bg-[#0051a8] text-white font-bold text-xs tracking-wide shadow-md shadow-[#007aff]/30 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Petunjuk Arah Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>
              </div>
            </div>

            {/* Photo Gallery Grid */}
            <div className="lg:col-span-7">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {activeBranch.photos.map((photo, i) => (
                  <div
                    key={i}
                    onClick={() => setLightboxImage(photo)}
                    className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm cursor-pointer group"
                  >
                    <img
                      src={photo}
                      alt={`${activeBranch.name} facility ${i + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                      <span>Perbesar Foto</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Facility Photos */}
      <AnimatePresence>
        {lightboxImage && (
          <div
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-3xl bg-black shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxImage}
                alt="Enlarged Facility"
                className="w-full h-auto max-h-[85vh] object-contain mx-auto"
              />
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
