import React, { createContext, useContext, useMemo } from "react";
import { usePersistentState } from "@/shared/hooks/usePersistentState";

// Bahasa landing page: Indonesia (id) dan Inggris (en). Pilihan disimpan di browser (key `landing_lang`).
// `L(en, id)` memilih teks sesuai bahasa aktif; konten data memakai tabel terjemahan di data/landingDataId.js.
export const LANGUAGES = [
  { value: "id", label: "ID", name: "Bahasa Indonesia" },
  { value: "en", label: "EN", name: "English" },
];
export const DEFAULT_LANG = "id";

const LanguageContext = createContext({ lang: DEFAULT_LANG, setLang: () => {}, L: (en, id) => id });

export const pickText = (lang, en, id) => (lang === "en" ? en : id);

// Terapkan terjemahan id pada item (kunci `id` item). Bahasa Inggris = data asli.
export const localizeItem = (item, table, lang) => (lang === "id" && item && table?.[item.id] ? { ...item, ...table[item.id] } : item);

export function LanguageProvider({ children }) {
  const [stored, setLang] = usePersistentState("landing_lang", () => DEFAULT_LANG);
  const lang = stored === "en" ? "en" : "id";
  const value = useMemo(() => ({ lang, setLang, L: (en, id) => pickText(lang, en, id) }), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLang = () => useContext(LanguageContext);
