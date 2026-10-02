import React from "react";
import { getCategoryIcon } from "@/features/assessment/components/masterData/assessmentConfig";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Info, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { getQuadrantColor } from "@/stores/masterDataStore";
import { cn } from "@/shared/lib/utils";

export function CategoryHeaderCard({ activeCategory, activeCategoryTotalQuestions, activeQuadCounts, handleDeleteCategory, openGenModal, quadrants, setCatDialog, setSecDialog }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs shrink-0 mt-0.5">
                  {React.createElement(getCategoryIcon(activeCategory.categoryName), { className: "w-6 h-6" })}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                      {activeCategory.categoryName}
                    </h2>
                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-bold">
                      {activeCategoryTotalQuestions} Butir Pertanyaan Terakreditasi
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                    Standar Acuan: <strong className="text-slate-700">{activeCategory.author || activeCategory.standardTitle || "Therapedia Developmental Standard"}</strong> • Domain: <span className="text-emerald-700 font-semibold">{activeCategory.domain}</span>
                  </p>
                </div>
              </div>

              {/* Category Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="font-bold gap-1.5 text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
                  onClick={() => openGenModal(activeCategory.id)}
                >
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" /> Terbitkan Kode
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="font-bold gap-1.5 text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
                  onClick={() =>
                    setSecDialog({
                      open: true,
                      categoryId: activeCategory.id,
                      editingSectionId: null,
                      title: "",
                      leadText: "Anakku ...",
                    })
                  }
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" /> Tambah Domain
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="font-bold gap-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                  onClick={() =>
                    setCatDialog({
                      open: true,
                      editingId: activeCategory.id,
                      name: activeCategory.categoryName,
                      domain: activeCategory.domain || "",
                    })
                  }
                  data-testid={`edit-category-button-${activeCategory.id}`}
                >
                  <Pencil className="w-3.5 h-3.5" /> Ubah Nama
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="font-bold gap-1 text-rose-600 hover:bg-rose-50 cursor-pointer"
                  onClick={() => handleDeleteCategory(activeCategory.id, activeCategory.categoryName)}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </Button>
              </div>
            </div>

            {/* Kuadran Sensory / Clinical Distribution */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-emerald-600" />
                  Distribusi Kuadran Sensorik Klinis (Winnie Dunn Framework):
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Total {activeCategoryTotalQuestions} Butir dalam Template Ini
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {quadrants.map((q) => {
                  const color = getQuadrantColor(q.color);
                  return (
                    <div key={q.code} className={cn("p-3.5 rounded-2xl border space-y-1", color.card)}>
                      <div className="flex items-center justify-between">
                        <span className={cn("px-2 py-0.5 rounded text-[11px]", color.solid)}>{q.code}</span>
                        <span className={cn("text-xl font-black", color.count)}>{activeQuadCounts[q.code] || 0} Soal</span>
                      </div>
                      <p className={cn("text-xs font-bold", color.text)}>{q.fullName || q.title}</p>
                      <p className={cn("text-[11px] leading-snug", color.textSoft)}>{q.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
  );
}
