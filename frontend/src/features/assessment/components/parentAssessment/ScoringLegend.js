import React from "react";
import { SECTION_TEMPLATES } from "@/domain/assessmentTemplate";


// Kunci skor mengikuti template section (School Companion: "Selalu 100%"; Toddler/Child: "Hampir Selalu 90%+").
export function ScoringLegend({ template = null }) {
  const legend = (template || SECTION_TEMPLATES.child_sensory).legend;
  return (
    <div className="border border-emerald-600 rounded-lg overflow-hidden text-xs" data-testid="scoring-legend">
          <div className="bg-emerald-600 text-white font-black text-center py-1.5 text-xs uppercase tracking-wider">
            Keterangan dan Skoring
          </div>
          <div className="p-3 bg-emerald-50/30 space-y-2 text-slate-800 leading-relaxed text-[11px]">
            <p className="font-medium italic">
              Skor mentah dijumlah per section; klasifikasi ditentukan asesor. Kunci skor:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-semibold">
              {legend.map((text) => {
                const score = text.slice(0, 1);
                return (
                  <div key={score} className="flex items-center gap-2 p-1.5 bg-white rounded border border-emerald-200">
                    <span className={`w-6 h-6 rounded text-white font-black flex items-center justify-center shrink-0 ${score === "0" ? "bg-slate-500" : "bg-emerald-700"}`}>{score}</span>
                    <span>{text.slice(4)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
  );
}
