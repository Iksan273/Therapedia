import React from "react";
import { cn } from "@/lib/utils";

export function AssessorSheetView({ displayedSections, quadStyle }) {
  return (
    <div className="space-y-6">
            {displayedSections.map((sec) => (
              <div key={sec.id} className="border border-emerald-600 rounded-xl overflow-hidden shadow-2xs print-avoid-break">
                <div className="bg-emerald-700 text-white px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider min-w-0 flex-1 break-words leading-snug">
                    {sec.title}
                  </h3>
                  <span className="text-[11px] sm:text-[11px] font-bold bg-emerald-800/80 px-2 py-0.5 rounded shrink-0">
                    {sec.items.length} Item
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse min-w-[540px] sm:min-w-0">
                    <thead>
                      <tr className="bg-emerald-100/70 border-b border-emerald-300 font-bold text-slate-800 text-[11px]">
                        <th className="py-2 px-2 sm:px-3 text-center w-14 sm:w-16">Kuadran</th>
                        <th className="py-2 px-1 sm:px-3 text-center w-10 sm:w-12 border-l border-emerald-200">Item</th>
                        <th className="py-2 px-2 sm:px-4 border-l border-emerald-200 min-w-[220px] sm:min-w-0">
                          <span>{sec.leadText || "Anakku ..."}</span>
                        </th>
                        <th className="py-2 px-2 sm:px-4 text-center w-24 sm:w-28 border-l border-emerald-200 bg-emerald-200/50 text-emerald-950 font-black">
                          Penilaian<br /><span className="text-[11px] font-normal">Skor (0 - 5)</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sec.items.map((it) => {
                        const quad = quadStyle(it.quadrant);
                        return (
                          <tr key={it.itemNo} className="hover:bg-slate-50/70 transition-colors print-avoid-break">
                            <td className="py-2 px-2 sm:px-3 text-center">
                              <span className={cn("inline-block px-1.5 sm:px-2 py-0.5 rounded text-[11px]", quad.badge)}>
                                {it.quadrant}
                              </span>
                            </td>
                            <td className="py-2 px-1 sm:px-3 text-center font-bold text-slate-700 border-l border-slate-200">
                              {it.itemNo}
                            </td>
                            <td className="py-2 px-2 sm:px-4 text-slate-800 leading-snug border-l border-slate-200 font-medium">
                              {it.question}
                            </td>
                            <td className="py-2 px-2 sm:px-4 text-center font-black text-blue-600 text-sm sm:text-base border-l border-slate-200 bg-blue-50/20">
                              {it.score}
                            </td>
                          </tr>
                        );
                      })}

                      {/* SUB-TOTAL ROW PER DOMAIN (Matching Image 1: Skor Mentah AUDITORI: 21) */}
                      <tr className="bg-emerald-100/80 font-black border-t-2 border-emerald-600 text-emerald-950">
                        <td colSpan={3} className="py-2 px-3 sm:px-4 text-right uppercase tracking-wider text-xs">
                          Skor Mentah {sec.domain}
                        </td>
                        <td className="py-2 px-2 sm:px-4 text-center text-sm sm:text-base text-blue-800 font-black border-l border-emerald-300 bg-blue-100/50">
                          {sec.rawScoreSum}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
  );
}
