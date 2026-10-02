import React from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { QUESTION_TYPES } from "@/features/assessment/components/masterData/assessmentConfig";
import { cn } from "@/shared/lib/utils";

export function QuestionToolbar({ activeCategory, activeCategoryTotalQuestions, areAllCollapsed, areAllExpanded, collapseAllSections, expandAllSections, quadrants, searchQuery, selectedDomainId, selectedQuadrant, selectedType, setSearchQuery, setSelectedDomainId, setSelectedQuadrant, setSelectedType }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Cari butir pertanyaan (misal: telinga, suara, pensil, atau nomor butir)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-slate-200 bg-slate-50/70 focus:bg-white text-xs font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filters & Collapse / Expand */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Quadrant filter */}
                <Select value={selectedQuadrant} onValueChange={setSelectedQuadrant}>
                  <SelectTrigger className="w-36 border-slate-200 text-xs font-bold bg-white">
                    <SelectValue placeholder="Kuadran" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL" className="text-xs font-bold">Semua Kuadran</SelectItem>
                    {quadrants.map((q) => (
                      <SelectItem key={q.code} value={q.code} className="text-xs font-bold">
                        {q.code} - {q.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Type filter */}
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-36 border-slate-200 text-xs font-bold bg-white">
                    <SelectValue placeholder="Tipe Soal" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL" className="text-xs font-bold">Semua Tipe</SelectItem>
                    {QUESTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.shortLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Pilihan Buka Semua / Tutup Semua (Default: Tutup Semua) */}
                <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50/80 p-0.5 shadow-2xs h-10">
                  <button
                    type="button"
                    onClick={expandAllSections}
                    className={cn(
                      "h-8 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                      areAllExpanded
                        ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    )}
                    title="Buka seluruh domain dan butir pertanyaan"
                  >
                    <ChevronDown className="w-3.5 h-3.5" /> Buka Semua
                  </button>
                  <button
                    type="button"
                    onClick={collapseAllSections}
                    className={cn(
                      "h-8 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                      areAllCollapsed
                        ? "bg-slate-900 text-white shadow-xs font-black"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    )}
                    title="Tutup seluruh domain dan butir pertanyaan (Default)"
                  >
                    <ChevronUp className="w-3.5 h-3.5" /> Tutup Semua
                  </button>
                </div>
              </div>
            </div>

            {/* Domain Pills Filter */}
            {activeCategory.sections && activeCategory.sections.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] shrink-0 mr-1">
                  Filter Domain:
                </span>
                <button
                  onClick={() => setSelectedDomainId("ALL")}
                  className={cn(
                    "px-3 py-2.5 sm:py-1.5 rounded-xl border shrink-0 font-bold text-xs transition-all cursor-pointer",
                    selectedDomainId === "ALL"
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  Semua Domain ({activeCategoryTotalQuestions})
                </button>
                {activeCategory.sections.map((sec, sIdx) => {
                  const isDomainSelected = selectedDomainId === sec.sectionId;
                  return (
                    <button
                      key={sec.sectionId}
                      onClick={() => setSelectedDomainId(sec.sectionId)}
                      className={cn(
                        "px-3 py-2.5 sm:py-1.5 rounded-xl border shrink-0 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5",
                        isDomainSelected
                          ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <span>{sIdx + 1}. {sec.title.split("(")[0].trim()}</span>
                      <span className={cn(
                        "text-[11px] px-1.5 py-0.2 rounded-full font-mono font-black",
                        isDomainSelected ? "bg-emerald-900 text-white" : "bg-slate-100 text-slate-600"
                      )}>
                        {sec.questions?.length || 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
  );
}
