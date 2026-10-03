import { IfCanDelete } from "@/shared/components/DeleteControls";
import React from "react";
import { ChevronDown, ChevronUp, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { getQuadrantColor } from "@/stores/masterDataStore";
import { getQuestionTypeInfo, isOptionBasedType } from "@/features/assessment/components/masterData/assessmentConfig";
import { cn } from "@/shared/lib/utils";

// Pratinjau singkat tipe isian bebas di daftar soal master data
const PLACEHOLDER_PREVIEW = {
  short_text: "[Jawaban singkat satu baris]",
  number: "[Isian angka]",
  date: "[Pilih tanggal]",
  birth_date: "[Pilih tanggal lahir — usia dihitung otomatis]",
  time: "[Pilih waktu / jam]",
};

export function SectionsList({ activeCategory, duplicateQuestion, expandedSections, filteredSections, openAddQuestion, openEditQuestion, quadrantMap, removeQuestion, removeSection, searchQuery, selectedQuadrant, selectedType, setSearchQuery, setSecDialog, setSelectedQuadrant, setSelectedType, toggleSectionCollapse }) {
  return (
    <div className="space-y-6">
            {filteredSections.map((sec, sIdx) => {
              const isExpanded = Boolean(expandedSections[sec.sectionId]);
              const isCollapsed = !isExpanded;
              const visibleQuestions = sec.filteredQuestions || [];

              return (
                <div
                  key={sec.sectionId || `sec-${sIdx}`}
                  className="rounded-3xl border border-slate-200/90 shadow-sm bg-white overflow-hidden transition-all"
                >
                  {/* Section Banner Header */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/70 via-white to-slate-50/60 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                    {/* Left: Collapsible Toggle, Number Badge & Title */}
                    <div
                      className="flex items-start gap-3 cursor-pointer select-none flex-1 min-w-0"
                      onClick={() => toggleSectionCollapse(sec.sectionId)}
                    >
                      <button
                        type="button"
                        className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors shrink-0 mt-0.5 shadow-2xs cursor-pointer"
                        aria-label={isCollapsed ? "Buka seksi" : "Tutup seksi"}
                      >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>

                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          {sIdx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug break-words">
                            {sec.title}
                          </h3>
                          {sec.leadText && (
                            <p className="text-xs text-slate-500 font-medium italic mt-1 leading-normal break-words">
                              "{sec.leadText}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Badge & Actions Toolbar (Always visible, shrink-0, clean spacing) */}
                    <div
                      className="flex items-center gap-2 shrink-0 self-start md:self-center pl-11 md:pl-0 flex-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono shrink-0">
                        {visibleQuestions.length} Soal
                        {visibleQuestions.length !== sec.totalOriginalCount && ` / ${sec.totalOriginalCount}`}
                      </span>

                      <Button
                        size="sm"
                        variant="outline"
                        className="font-bold text-slate-700 border-slate-200 hover:bg-slate-100 px-2.5 gap-1 shrink-0 cursor-pointer whitespace-nowrap"
                        onClick={() => openAddQuestion(activeCategory.id, sec.sectionId)}
                        title="Tambah butir pertanyaan baru ke domain ini"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-600" /> Tambah Soal
                      </Button>

                      {sec.sectionId !== "default-sec" && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button aria-label="Edit judul domain & lead text"
                            size="icon"
                            variant="ghost"
                            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
                            onClick={() =>
                              setSecDialog({
                                open: true,
                                categoryId: activeCategory.id,
                                editingSectionId: sec.sectionId,
                                title: sec.title,
                                leadText: sec.leadText || "",
                              })
                            }
                            title="Edit judul domain & lead text"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>

                          <IfCanDelete module="inquiry_pipeline">
                          <Button aria-label="Hapus domain ini"
                            size="icon"
                            variant="ghost"
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                            onClick={() => removeSection(activeCategory.id, sec.sectionId, sec.title)}
                            title="Hapus domain ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          </IfCanDelete>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section Questions Body */}
                  {!isCollapsed && (
                    <div className="p-4 sm:p-6 space-y-3.5">
                      {visibleQuestions.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                          <p className="text-xs text-slate-500 font-medium">
                            {searchQuery || selectedQuadrant !== "ALL" || selectedType !== "ALL"
                              ? "Tidak ada butir pertanyaan yang sesuai dengan kriteria pencarian/filter di atas."
                              : "Belum ada pertanyaan pada domain ini. Klik tombol '+ Tambah Soal' untuk menambahkan butir pertama."}
                          </p>
                          {(searchQuery || selectedQuadrant !== "ALL" || selectedType !== "ALL") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="font-bold"
                              onClick={() => {
                                setSearchQuery("");
                                setSelectedQuadrant("ALL");
                                setSelectedType("ALL");
                              }}
                            >
                              Reset Filter
                            </Button>
                          )}
                        </div>
                      ) : (
                        visibleQuestions.map((q, qIdx) => {
                          const quad = q.quadrant || null;
                          const qMaster = quad ? quadrantMap[quad] : null;
                          const qConfig = {
                            badge: getQuadrantColor(qMaster?.color).badge,
                            title: qMaster?.title || quad,
                            desc: qMaster?.description || "",
                          };
                          const typeInfo = getQuestionTypeInfo(q.type);

                          return (
                            <div
                              key={q.id || `q-${qIdx}`}
                              className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-2xs transition-all space-y-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  {/* Item Number Badge */}
                                  <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 font-mono font-black text-xs flex items-center justify-center shrink-0 border border-slate-200 mt-0.5">
                                    #{q.itemNo || qIdx + 1}
                                  </span>

                                  <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {quad && (
                                        <span
                                          className={cn("px-2 py-0.5 rounded-md text-[11px] border shadow-2xs", qConfig.badge)}
                                          title={qConfig.desc}
                                        >
                                          {quad} • {qConfig.title}
                                        </span>
                                      )}
                                      <span
                                        className={cn("px-2 py-0.5 rounded-md text-[11px] border", typeInfo.badge)}
                                        title={typeInfo.desc}
                                      >
                                        {typeInfo.shortLabel}
                                      </span>
                                    </div>

                                    {/* Question Text with break-words */}
                                    <p className="text-sm font-semibold text-slate-900 leading-relaxed break-words">
                                      {q.question}
                                    </p>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1 shrink-0 self-end sm:self-start">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="px-2 font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1 cursor-pointer shrink-0"
                                    onClick={() => openEditQuestion(activeCategory.id, sec.sectionId, q)}
                                    title="Edit pertanyaan dan tipe jawaban"
                                  >
                                    <Pencil className="w-3.5 h-3.5" /> Edit
                                  </Button>

                                  <Button aria-label="Duplikasi butir pertanyaan ini"
                                    size="icon"
                                    variant="ghost"
                                    className="text-slate-400 hover:text-sky-700 hover:bg-sky-50 cursor-pointer shrink-0"
                                    onClick={() => duplicateQuestion(activeCategory.id, sec.sectionId, q)}
                                    title="Duplikasi butir pertanyaan ini"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </Button>

                                  <IfCanDelete module="inquiry_pipeline">
                                  <Button aria-label="Hapus butir pertanyaan"
                                    size="icon"
                                    variant="ghost"
                                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                                    onClick={() => removeQuestion(activeCategory.id, q.id)}
                                    title="Hapus butir pertanyaan"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                  </IfCanDelete>
                                </div>
                              </div>

                              {/* Interactive Live Option Preview */}
                              {(q.type === "scale_0_5" || !q.type) && (
                                <div className="pl-0 sm:pl-11 pt-1">
                                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-wrap items-center gap-2 text-xs">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
                                      Skala Respon:
                                    </span>
                                    {[
                                      { val: 5, label: "Hampir Selalu (90%+)" },
                                      { val: 4, label: "Sering (75%)" },
                                      { val: 3, label: "Kadang (50%)" },
                                      { val: 2, label: "Jarang (25%)" },
                                      { val: 1, label: "Hampir Tdk Pernah (10%)" },
                                      { val: 0, label: "Tdk Berlaku (0%)" },
                                    ].map((opt) => (
                                      <span
                                        key={opt.val}
                                        className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-700 shadow-2xs shrink-0"
                                        title={opt.label}
                                      >
                                        <strong className="font-black text-slate-900">{opt.val}</strong> - {opt.label.split("(")[0]}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {isOptionBasedType(q.type) && (q.options || []).length > 0 && (
                                <div className="pl-0 sm:pl-11 pt-1 flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
                                    Opsi Pilihan ({q.options.length}):
                                  </span>
                                  {q.options.map((opt, oIdx) => (
                                    <span
                                      key={oIdx}
                                      className="px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 text-xs font-medium shadow-2xs break-words"
                                    >
                                      {opt}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {q.type === "range" && (
                                <div className="pl-0 sm:pl-11 pt-1 text-xs text-cyan-950 font-medium">
                                  <div className="p-2.5 rounded-xl bg-cyan-50/60 border border-cyan-200 flex items-center justify-between gap-2">
                                    <span>Rentang: <strong>{q.scaleMin ?? 1} ({q.minLabel || "Min"})</strong></span>
                                    <span>s/d</span>
                                    <span><strong>{q.scaleMax ?? 5} ({q.maxLabel || "Max"})</strong></span>
                                  </div>
                                </div>
                              )}

                              {q.type === "yes_no" && (
                                <div className="pl-0 sm:pl-11 pt-1 flex items-center gap-2">
                                  <span className="px-3 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                                    ✓ Ya
                                  </span>
                                  <span className="px-3 py-0.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold">
                                    ✕ Tidak
                                  </span>
                                </div>
                              )}

                              {PLACEHOLDER_PREVIEW[q.type] && (
                                <div className="pl-0 sm:pl-11 pt-1">
                                  <span className="text-xs text-slate-500 italic">{PLACEHOLDER_PREVIEW[q.type]}</span>
                                </div>
                              )}

                              {q.type === "free_text" && (
                                <div className="pl-0 sm:pl-11 pt-1">
                                  <span className="text-xs text-sky-700 italic">
                                    [Kotak Teks Deskripsi Bebas / Esai Terbuka]
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
  );
}
