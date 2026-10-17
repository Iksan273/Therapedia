import React from "react";
import { IfCanDelete } from "@/shared/components/DeleteControls";
import { getCategoryIcon, makeSectionDialog } from "@/features/assessment/components/masterData/assessmentConfig";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Copy, Info, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { useClients } from "@/stores/clientsStore";
import { useAssessmentDrafts } from "@/stores/assessmentDraftsStore";
import { countActiveDraftsForCategory } from "@/domain/assessment";
import { isApiMode } from "@/config/env";

const apiMode = isApiMode();

export function CategoryHeaderCard({ activeCategory, activeCategoryTotalQuestions, duplicating = false, handleDeleteCategory, onDuplicate, openGenModal, setCatDialog, setSecDialog }) {
  const clientsStore = useClients();
  const { drafts } = useAssessmentDrafts();
  // Mode demo: kode yang sedang diisi ortu (ada draft) memakai soal kategori ini. Mode API: jumlah dari server (`fillingCount`) dan
  // struktur kuesioner yang sedang diisi dibekukan, jadi tidak terpengaruh perubahan di sini (tanpa membaca daftar client).
  const activeDrafts = apiMode ? activeCategory.fillingCount || 0 : countActiveDraftsForCategory(clientsStore.clients, drafts, activeCategory.id);
  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-5">
      {activeDrafts > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900" data-testid="category-active-drafts-warning">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          {apiMode ? (
            <p className="leading-relaxed"><strong>{activeDrafts} kuesioner sedang diisi ortu</strong> dengan instrumen ini. Mereka memakai salinan struktur yang sudah dibekukan, jadi perubahan teks, opsi, atau soal baru di sini tidak memengaruhi mereka. Soal yang masih dipakai kuesioner yang sedang diisi tidak dapat dihapus.</p>
          ) : (
            <p className="leading-relaxed"><strong>{activeDrafts} kuesioner sedang diisi ortu</strong> dengan instrumen ini. Soal yang dihapus akan diabaikan dari jawaban tersimpan, dan soal wajib baru harus dijawab saat mereka mengirim.</p>
          )}
        </div>
      )}
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
                    Domain: <span className="text-emerald-700 font-semibold">{activeCategory.domain}</span>
                  </p>
                </div>
              </div>

              {/* Category Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {openGenModal && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="font-bold gap-1.5 text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
                    onClick={() => openGenModal(activeCategory.id)}
                  >
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600" /> Terbitkan Kode
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="font-bold gap-1.5 text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
                  onClick={() => setSecDialog(makeSectionDialog({ open: true, categoryId: activeCategory.id }))}
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" /> Tambah Domain
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="font-bold gap-1.5 text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
                  disabled={duplicating}
                  onClick={() => onDuplicate(activeCategory)}
                  title="Salin template ini (semua section dan soal) menjadi template baru yang langsung tersimpan; nama dan kode jenis bisa diubah lewat Ubah Nama"
                  data-testid={`duplicate-category-button-${activeCategory.id}`}
                >
                  <Copy className="w-3.5 h-3.5" /> {duplicating ? "Menyalin…" : "Duplikat"}
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
                      typeCode: activeCategory.typeCode || "",
                      respondentProfile: activeCategory.respondentProfile || "none",
                    })
                  }
                  data-testid={`edit-category-button-${activeCategory.id}`}
                >
                  <Pencil className="w-3.5 h-3.5" /> Ubah Nama
                </Button>

                <IfCanDelete module="assessment_master">
                <Button
                  size="sm"
                  variant="ghost"
                  className="font-bold gap-1 text-rose-600 hover:bg-rose-50 cursor-pointer"
                  onClick={() => handleDeleteCategory(activeCategory.id, activeCategory.categoryName)}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </Button>
                </IfCanDelete>
              </div>
            </div>
          </div>
  );
}
