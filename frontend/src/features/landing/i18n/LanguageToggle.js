import React from "react";
import { Languages } from "lucide-react";
import { LANGUAGES, useLang } from "@/features/landing/i18n/LanguageContext";

// Pengalih bahasa landing page (ID / EN). Dipakai di header (desktop & mobile).
export default function LanguageToggle({ className = "" }) {
  const { lang, setLang } = useLang();
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 p-0.5 ${className}`}
      role="group"
      aria-label="Language"
      data-testid="landing-language-toggle"
    >
      <Languages className="w-3.5 h-3.5 text-slate-400 ml-1.5" aria-hidden="true" />
      {LANGUAGES.map((l) => (
        <button
          key={l.value}
          type="button"
          onClick={() => setLang(l.value)}
          aria-pressed={lang === l.value}
          title={l.name}
          className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
            lang === l.value ? "bg-[#007aff] text-white shadow-sm" : "text-slate-300 hover:text-white"
          }`}
          data-testid={`landing-lang-${l.value}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
