import React from "react";
import { getCategoryIcon } from "@/features/assessment/components/masterData/assessmentConfig";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";

export function CategorySwitcher({ categories, selectedCatId, setSelectedCatId }) {
  return (
    <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pilih Template Instrumen Klinis ({categories.length} Kategori):
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            Klik kategori untuk membuka ruang kerja kelola bank soal
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {categories.map((cat) => {
            const isSelected = cat.id === selectedCatId;
            const CatIcon = getCategoryIcon(cat.categoryName);
            const qCount = cat.sections && cat.sections.length > 0
              ? cat.sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0)
              : (cat.questions?.length || 0);

            return (
              <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (() => setSelectedCatId(cat.id))(e); } }}
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left group",
                  isSelected
                    ? "bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                    : "bg-white/80 border-slate-200/90 hover:bg-white hover:border-slate-300 shadow-2xs"
                )}
                data-testid={`category-card-${cat.id}`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-black transition-colors",
                      isSelected ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                    )}>
                      <CatIcon className="w-5 h-5" />
                    </div>
                    <Badge className={cn(
                      "text-[11px] font-black border font-mono",
                      qCount >= 60 ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
                    )}>
                      {qCount} Butir
                    </Badge>
                  </div>

                  <div>
                    <p className={cn(
                      "text-xs font-black line-clamp-2 leading-snug",
                      isSelected ? "text-emerald-950" : "text-slate-800"
                    )}>
                      {cat.categoryName}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium truncate mt-1">
                      {cat.domain || "Clinical Profile"}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className={cn(
                    "font-bold",
                    isSelected ? "text-emerald-700" : "text-slate-400"
                  )}>
                    {isSelected ? "● Sedang Aktif" : "Buka Template"}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {cat.sections?.length || 1} Domain
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
  );
}
