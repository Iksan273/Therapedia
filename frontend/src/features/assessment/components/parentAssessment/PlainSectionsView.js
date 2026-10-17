import React from "react";
import { isAnswerFilled } from "@/domain/assessment";

// Section tanpa template: ditampilkan sebagai pertanyaan–jawaban biasa (tidak jadi tabel psikologi).
export function PlainSectionsView({ plainSections }) {
  if (!plainSections.length) return null;
  return (
    <div className="space-y-5" data-testid="plain-sections">
      {plainSections.map((sec) => (
        <section key={sec.sectionId} className="print-avoid-break space-y-2" data-testid={`plain-section-${sec.sectionId}`}>
          <h3 className="text-sm font-black text-slate-900 border-b border-slate-300 pb-1">{sec.title}</h3>
          {sec.items.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Section ini tidak memiliki pertanyaan.</p>
          ) : (
            <dl className="divide-y divide-slate-100 text-xs">
              {sec.items.map((it) => (
                <div key={it.itemNo} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-1 sm:gap-4 py-2">
                  <dt className="font-semibold text-slate-700 break-words">{it.itemNo}. {it.question}</dt>
                  <dd className="font-medium text-slate-900 break-words whitespace-pre-line">{isAnswerFilled(it.answer) ? it.answer : <span className="text-slate-400 italic">Tidak diisi</span>}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      ))}
    </div>
  );
}
