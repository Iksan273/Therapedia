import React from "react";
import { FolderTree, Layers, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { getQuadrantColor } from "@/context/MasterDataContext";

export function AssessmentStats({ activeCategory, categories, quadrants, totalDomainsOverall, totalQuestionsOverall }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Kategori</span>
            <span className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-black text-xs">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{categories.length}</p>
          <p className="text-[11px] text-slate-500 font-medium">Template baku aktif</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Bank Soal</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs">
              <ListChecks className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700">{totalQuestionsOverall}</p>
          <p className="text-[11px] text-slate-500 font-medium">Butir instrumen klinis (60++ per template)</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Domain</span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-xs">
              <FolderTree className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-purple-700">{totalDomainsOverall}</p>
          <p className="text-[11px] text-slate-500 font-medium">Domain observasi klinis ({activeCategory?.sections?.length || 0} di template aktif)</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Distribusi Kuadran</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xs">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {quadrants.map((q) => (
              <span key={q.code} className={cn("text-[11px] px-1.5 py-0.5 rounded", getQuadrantColor(q.color).badge)}>
                {q.code}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Tersinkron dengan lembar asesor</p>
        </div>
      </div>
  );
}
