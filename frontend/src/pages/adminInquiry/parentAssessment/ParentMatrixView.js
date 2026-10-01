import React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function ParentMatrixView({ displayedSections }) {
  return (
    <div className="space-y-6">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Berikut adalah format respon kuesioner asli yang diisi orang tua dengan tanda silang (X) pada kolom penilaian skor 5 hingga 0:</span>
            </div>

            {displayedSections.map((sec) => (
              <div key={sec.id} className="border border-emerald-600 rounded-xl overflow-hidden shadow-2xs print-avoid-break">
                <div className="bg-emerald-700 text-white px-3 sm:px-4 py-2.5 font-black text-xs uppercase tracking-wider break-words leading-snug">
                  {sec.title}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse min-w-[520px] sm:min-w-0">
                    <thead>
                      <tr className="bg-emerald-600 text-white font-black text-xs">
                        <th className="py-2 px-2 sm:px-3 text-center w-12 sm:w-14">Item</th>
                        <th className="py-2 px-2 sm:px-4 border-l border-emerald-500 min-w-[200px] sm:min-w-0">{sec.title}</th>
                        <th className="py-2 px-2 text-center w-9 sm:w-12 border-l border-emerald-500">5</th>
                        <th className="py-2 px-2 text-center w-9 sm:w-12 border-l border-emerald-500">4</th>
                        <th className="py-2 px-2 text-center w-9 sm:w-12 border-l border-emerald-500">3</th>
                        <th className="py-2 px-2 text-center w-9 sm:w-12 border-l border-emerald-500">2</th>
                        <th className="py-2 px-2 text-center w-9 sm:w-12 border-l border-emerald-500">1</th>
                        <th className="py-2 px-2 text-center w-9 sm:w-12 border-l border-emerald-500 bg-emerald-800">0</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sec.items.map((it) => (
                        <tr key={it.itemNo} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                            {it.itemNo}
                          </td>
                          <td className="py-2.5 px-4 text-slate-800 leading-snug border-l border-slate-200 font-medium">
                            {it.question}
                          </td>
                          {[5, 4, 3, 2, 1, 0].map((scoreCol) => {
                            const isSelected = it.score === scoreCol;
                            return (
                              <td
                                key={scoreCol}
                                className={cn(
                                  "py-2.5 px-3 text-center font-black border-l border-slate-200",
                                  scoreCol === 0 ? "bg-slate-100/50" : "",
                                  isSelected ? "bg-emerald-50 text-red-600 text-sm font-black" : "text-slate-300"
                                )}
                              >
                                {isSelected ? "X" : ""}
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      <tr className="bg-emerald-50 font-black border-t-2 border-emerald-600 text-emerald-950">
                        <td colSpan={2} className="py-2.5 px-4 text-right uppercase tracking-wider text-xs">
                          Total Skor Mentah {sec.domain}:
                        </td>
                        <td colSpan={6} className="py-2.5 px-4 text-center text-sm font-black text-blue-700 bg-blue-50/50">
                          {sec.rawScoreSum} Poin
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
