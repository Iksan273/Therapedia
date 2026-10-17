import React, { useState } from "react";
import { UserRound } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { respondentFields, respondentFormatErrors } from "@/domain/assessment";

const PROFILE_TITLE = {
  parent: "Data Pengisi",
  teacher: "Data Pengisi (Guru / Pendamping)",
};

// Langkah bawaan "Data Pengisi" di awal kuesioner. Nama & tanggal lahir anak tidak ditanyakan lagi (sudah dari kode client).
// `showErrors`: tandai field wajib kosong setelah ortu mencoba mengirim.
export function RespondentCard({ profile, values, onChange, showErrors = false }) {
  // Pilihan "Lainnya" (mis. Paman, Nenek): chip memunculkan kolom isian; yang tersimpan adalah teks yang diketik (bukan kata "Lainnya").
  const [otherOpen, setOtherOpen] = useState({});
  const fields = respondentFields(profile);
  if (fields.length === 0) return null;
  const formatErrors = respondentFormatErrors(profile, values);

  return (
    <div id="respondent-card" className="no-input-zoom scroll-mt-32 md:scroll-mt-44 rounded-2xl border border-slate-200/90 shadow-2xs bg-white overflow-hidden" data-testid="assessment-respondent-card">
      <div className="p-3.5 sm:p-5 bg-gradient-to-r from-sky-50/80 via-white to-sky-50/50 border-b border-slate-200/80 flex items-start gap-2.5">
        <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
          <UserRound className="w-3.5 h-3.5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">{PROFILE_TITLE[profile] || "Data Pengisi"}</h3>
          <p className="text-xs sm:text-[13px] text-slate-600 font-medium mt-1 leading-relaxed">
            Isi data Anda sebagai pengisi kuesioner. Nama dan tanggal lahir anak sudah tercatat dari kode Anda.
          </p>
        </div>
      </div>
      <div className="p-3 sm:p-6 grid gap-3.5 sm:grid-cols-2">
        {fields.map((f) => {
          const value = values?.[f.key] ?? "";
          const missing = showErrors && f.required && !String(value).trim();
          // Mode "Lainnya": dipilih lewat chip, atau nilai tersimpan bukan salah satu pilihan baku (mis. draft "Paman" dipulihkan)
          const hasOther = Boolean(f.options?.includes("Lainnya"));
          const presets = (f.options || []).filter((o) => o !== "Lainnya");
          const isOther = hasOther && (otherOpen[f.key] || value === "Lainnya" || (value && !presets.includes(value)));
          const otherText = value === "Lainnya" ? "" : value;
          const formatError = formatErrors[f.key];
          const id = `respondent-${f.key}`;
          return (
            <div key={f.key} className={cn("space-y-1.5", f.options && "sm:col-span-2")}>
              <label htmlFor={id} className="block text-xs font-bold text-slate-700">
                {f.label} {f.required ? <span className="text-rose-500">*</span> : <span className="font-medium text-slate-400">(opsional)</span>}
              </label>
              {f.options && (
                <div className="flex flex-wrap gap-2" role="group" aria-label={f.label}>
                  {f.options.map((opt) => {
                    const selected = opt === "Lainnya" ? isOther : value === opt && !isOther;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          if (opt === "Lainnya") {
                            setOtherOpen((prev) => ({ ...prev, [f.key]: true }));
                            if (presets.includes(value)) onChange(f.key, ""); // beralih dari pilihan baku: kosongkan sampai diketik
                          } else {
                            setOtherOpen((prev) => ({ ...prev, [f.key]: false }));
                            onChange(f.key, opt);
                          }
                        }}
                        aria-pressed={selected}
                        className={cn(
                          "min-h-10 px-3.5 rounded-xl border text-xs font-bold transition-colors",
                          selected ? "bg-sky-600 border-sky-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-sky-300"
                        )}
                        data-testid={`respondent-${f.key}-option-${opt}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}
              {f.options && isOther && (
                <input
                  id={id}
                  value={otherText}
                  maxLength={f.max}
                  placeholder={f.key === "relation" && profile === "parent" ? "Sebutkan, mis. Paman, Nenek, Tante" : "Sebutkan"}
                  onChange={(e) => onChange(f.key, e.target.value)}
                  className={cn(
                    "w-full h-11 px-3.5 rounded-xl border bg-slate-50 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500",
                    missing ? "border-rose-400" : "border-slate-200"
                  )}
                  data-testid={`respondent-${f.key}-other-input`}
                />
              )}
              {!f.options && (
                <input
                  id={id}
                  value={value}
                  maxLength={f.max}
                  inputMode={f.inputMode}
                  autoComplete={f.autoComplete}
                  onChange={(e) => onChange(f.key, e.target.value)}
                  className={cn(
                    "w-full h-11 px-3.5 rounded-xl border bg-slate-50 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500",
                    missing || formatError ? "border-rose-400" : "border-slate-200"
                  )}
                  data-testid={`respondent-${f.key}-input`}
                />
              )}
              {(missing || formatError) && (
                <p className="text-[11px] font-semibold text-rose-600" data-testid={`respondent-${f.key}-error`}>
                  {formatError || (isOther && f.options ? `Sebutkan ${f.label.toLowerCase()}.` : `${f.label} wajib diisi.`)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
