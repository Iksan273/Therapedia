import React from "react";
import { ClipboardList } from "lucide-react";
import { getQuadrantColor } from "@/stores/masterDataStore";
import { cn } from "@/shared/lib/utils";

// Rekap skor mentah per kuadran; daftar kuadran mengikuti master data (bisa ditambah/diubah admin)
export function QuadrantSummary({ quadrants, quadrantTotals, totalQuestionsCount }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
        <div className="flex items-center gap-1.5">
          <ClipboardList className="w-4 h-4 text-emerald-600" />
          <span>Rekapitulasi Skor Mentah Kuadran:</span>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">Total: {totalQuestionsCount} Butir Instrumen</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {quadrants.map((q) => {
          const color = getQuadrantColor(q.color);
          return (
            <div key={q.code} className={cn("p-3 rounded-xl border shadow-2xs", color.card)}>
              <div className="flex items-center justify-between">
                <span className={cn("px-2 py-0.5 rounded text-[11px]", color.solid)}>{q.code}</span>
                <span className={cn("text-xl font-black", color.count)}>{quadrantTotals[q.code] ?? 0}</span>
              </div>
              <p className={cn("text-xs font-bold mt-1", color.text)}>{q.title}</p>
              <p className={cn("text-[11px]", color.textSoft)}>{q.description?.split("(")[0].trim()}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
