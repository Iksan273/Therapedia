import React, { useState } from "react";
import { ListChecks } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { requiredProgress } from "@/domain/assessment";
import { DraftSaveIndicator } from "@/features/assessment/components/fill/DraftSaveIndicator";

const shortTitle = (title) => String(title || "").split("(")[0].trim();

// Header sticky kuesioner. HP: ringkas (judul + progres + tombol "Bagian"); ≥md: filter + pill lompat-section.
// Progres dihitung dari soal WAJIB saja (`progress` = hasil `requiredProgress`).
export function ProgressHeader({ category, client, code, sections, answers, totalQuestions, progress, saveState, filterMode, onFilterChange, onJump }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const requiredLeft = progress.total - progress.answered;
  const complete = requiredLeft === 0;
  const sectionStats = sections.map((sec) => {
    const p = requiredProgress(sec.questions, answers);
    return { sec, done: p.answered, total: p.total, isDone: p.answered === p.total };
  });

  const filterToggle = (
    <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold shrink-0">
      {[
        { id: "all", label: `Semua (${totalQuestions})` },
        { id: "unanswered", label: `Belum Diisi (${requiredLeft})` },
      ].map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onFilterChange(f.id)}
          className={cn(
            "px-3 min-h-9 rounded-lg transition-all text-[11px] cursor-pointer",
            filterMode === f.id
              ? f.id === "all" ? "bg-white text-slate-900 shadow-xs font-black" : "bg-rose-50 text-rose-800 border border-rose-200 font-black"
              : "text-slate-600 hover:text-slate-900"
          )}
          data-testid={`assessment-filter-${f.id}`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="sticky top-[max(0.5rem,env(safe-area-inset-top))] z-30 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-md p-3 sm:p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-lg font-black text-slate-900 leading-tight truncate sm:whitespace-normal">{category.categoryName}</h2>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
            <strong className="text-slate-800">{client.clientName}</strong> • <span className="font-mono text-sky-700 font-bold">{code}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={cn(
              "text-[11px] sm:text-xs font-black px-2.5 py-1 rounded-full border whitespace-nowrap",
              complete ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-sky-50 text-sky-800 border-sky-300"
            )}
            data-testid="assessment-progress-label"
          >
            {progress.answered} / {progress.total} Wajib Terisi ({progress.percent}%)
          </span>
          <div className="hidden sm:block">
            <DraftSaveIndicator state={saveState} />
          </div>
        </div>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-1.5 sm:h-2 overflow-hidden">
        <div className={cn("h-full transition-all duration-300 rounded-full", complete ? "bg-emerald-500" : "bg-[#007AFF]")} style={{ width: `${progress.percent}%` }} />
      </div>

      {/* HP: indikator simpan + tombol daftar bagian */}
      <div className="flex items-center justify-between gap-2 md:hidden">
        <DraftSaveIndicator state={saveState} />
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 cursor-pointer"
          data-testid="assessment-sections-button"
        >
          <ListChecks className="w-4 h-4 text-sky-600" /> Bagian
        </button>
      </div>

      {/* ≥md: filter + pill lompat */}
      <div className="hidden md:flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
        {filterToggle}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 min-w-0 text-[11px] font-semibold">
          <span className="text-slate-400 shrink-0 uppercase font-bold">Lompat:</span>
          {sectionStats.map(({ sec, done, total, isDone }, i) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => onJump(sec.id)}
              className={cn(
                "px-2.5 min-h-9 rounded-lg border shrink-0 transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer",
                isDone ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              )}
            >
              <span>{i + 1}. {shortTitle(sec.title)}</span>
              <span className={cn("px-1 rounded font-mono", isDone ? "bg-emerald-200 text-emerald-900" : "bg-slate-100 text-slate-600")}>{done}/{total}</span>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent className="max-w-md w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl p-4" data-testid="assessment-sections-sheet">
          <DialogHeader>
            <DialogTitle className="text-base font-black">Daftar Bagian</DialogTitle>
            <DialogDescription className="text-xs">Ketuk bagian untuk melompat ke sana.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {filterToggle}
            <div className="space-y-1.5">
              {sectionStats.map(({ sec, done, total, isDone }, i) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    setSheetOpen(false);
                    setTimeout(() => onJump(sec.id), 150);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 min-h-12 px-3 py-2 rounded-xl border text-left text-sm font-bold cursor-pointer",
                    isDone ? "bg-emerald-50 text-emerald-900 border-emerald-200" : "bg-white text-slate-800 border-slate-200"
                  )}
                >
                  <span className="min-w-0 break-words">{i + 1}. {shortTitle(sec.title)}</span>
                  <span className={cn("px-1.5 py-0.5 rounded text-[11px] font-mono shrink-0", isDone ? "bg-emerald-200 text-emerald-900" : "bg-slate-100 text-slate-600")}>
                    {done}/{total}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
