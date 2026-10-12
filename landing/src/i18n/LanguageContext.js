import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

// Bahasa landing page: Indonesia (id) dan Inggris (en). Pilihan disimpan di browser (key `landing_lang`, localStorage).
// `L(en, id)` memilih teks sesuai bahasa aktif; konten data memakai tabel terjemahan di data/landingDataId.js.
export const LANGUAGES = [
  { value: "id", label: "ID", name: "Bahasa Indonesia" },
  { value: "en", label: "EN", name: "English" },
];
export const DEFAULT_LANG = "id";
const STORAGE_KEY = "landing_lang";

const readLang = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const LanguageContext = createContext({ lang: DEFAULT_LANG, setLang: () => {}, L: (en, id) => id });

export const pickText = (lang, en, id) => (lang === "en" ? en : id);

// Terapkan terjemahan id pada item (kunci `id` item). Bahasa Inggris = data asli.
export const localizeItem = (item, table, lang) => (lang === "id" && item && table?.[item.id] ? { ...item, ...table[item.id] } : item);

export function LanguageProvider({ children }) {
  const [stored, setLang] = useState(readLang);
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, stored === "en" ? "en" : "id");
    } catch {
      /* storage diblokir: bahasa hanya berlaku di sesi ini */
    }
  }, [stored]);
  const lang = stored === "en" ? "en" : "id";
  const value = useMemo(() => ({ lang, setLang, L: (en, id) => pickText(lang, en, id) }), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLang = () => useContext(LanguageContext);
