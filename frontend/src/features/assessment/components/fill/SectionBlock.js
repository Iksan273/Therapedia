import React from "react";
import { unansweredRequired } from "@/domain/assessment";
import { DocumentEmbed } from "@/shared/components/DocumentEmbed";
import { QuestionCard } from "@/features/assessment/components/fill/QuestionCard";

// Satu section/domain kuesioner: header + dokumen (bila ada) + kartu soal (mengikuti filter "Belum Diisi").
export function SectionBlock({ section, index, answers, filterMode, onAnswer }) {
  const visible = filterMode === "unanswered" ? unansweredRequired(section.questions, answers) : section.questions;
  if (filterMode === "unanswered" && visible.length === 0) return null;

  return (
    <div id={section.id} className="scroll-mt-32 md:scroll-mt-44 rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden">
      <div className="p-3.5 sm:p-5 bg-gradient-to-r from-sky-50/80 via-white to-sky-50/50 border-b border-slate-200/80 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">{index + 1}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug break-words">{section.title}</h3>
            {section.description && (
              <p className="text-xs sm:text-[13px] text-slate-600 font-medium mt-1 leading-relaxed whitespace-pre-line break-words" data-testid={`assessment-section-description-${section.id}`}>
                {section.description}
              </p>
            )}
          </div>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-100/80 text-sky-800 border border-sky-200 shrink-0 font-mono">{section.questions.length} Item</span>
      </div>
      <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
        {section.documentUrl && (
          <DocumentEmbed url={section.documentUrl} pdf={section.documentIsPdf} title={section.title} collapsible testId={`assessment-section-document-${section.id}`} />
        )}
        {visible.map((q) => (
          <QuestionCard key={q.id} q={q} value={answers[q.id]} onChange={onAnswer} />
        ))}
      </div>
    </div>
  );
}
