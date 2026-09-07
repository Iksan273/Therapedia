import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Calendar, ArrowRight, X, Sparkles, CheckCircle2 } from "lucide-react";
import { KNOWLEDGE_ARTICLES } from "@/data/landingData";

export default function LandingKnowledge() {
  const [selectedArticle, setSelectedArticle] = useState(null);

  return (
    <section id="knowledge" className="py-20 sm:py-28 bg-white relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#007aff]/10 border border-[#007aff]/20 text-[#007aff] text-xs font-bold uppercase tracking-wider mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Parent Education & Insights</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
            Knowledge Hub for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#007aff] to-cyan-600">
              Parents & Caregivers
            </span>
          </h2>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Our Knowledge section offers insightful articles and practical information to help parents
            better understand child development and support their child's growth at home.
          </p>
        </div>

        {/* Articles 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {KNOWLEDGE_ARTICLES.map((art) => (
            <motion.div
              key={art.id}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              onClick={() => setSelectedArticle(art)}
              className="rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-cyan-300 transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div>
                {/* Article Image */}
                <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-100">
                  <img
                    src={art.image}
                    alt={art.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span
                    className={`absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-md bg-white/90 ${art.categoryColor}`}
                  >
                    {art.category}
                  </span>
                </div>

                {/* Article Copy */}
                <div className="p-5">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-2 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{art.date}</span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 tracking-tight leading-snug line-clamp-2 mb-2 group-hover:text-[#007aff] transition-colors">
                    {art.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {art.excerpt}
                  </p>
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="px-5 pb-5 pt-0">
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#007aff]">
                  <span>Baca Selengkapnya</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Article Full Reader Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-8 relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedArticle(null)}
                className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close Article"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${selectedArticle.categoryColor}`}>
                  {selectedArticle.category}
                </span>
                <span className="text-xs text-slate-400 font-semibold">• {selectedArticle.date}</span>
              </div>

              <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-4">
                {selectedArticle.title}
              </h3>

              <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden mb-5 bg-slate-100">
                <img
                  src={selectedArticle.image}
                  alt={selectedArticle.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-4 text-sm text-slate-700 leading-relaxed mb-6 font-normal">
                <p className="font-semibold text-slate-900">{selectedArticle.excerpt}</p>
                <p>{selectedArticle.content}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">Therapedia Clinical Insights</span>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="px-5 py-2.5 rounded-xl bg-[#007aff] hover:bg-[#0051a8] text-white font-bold text-xs cursor-pointer"
                >
                  Selesai Membaca
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
