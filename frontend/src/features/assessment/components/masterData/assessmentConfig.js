import { School, Brain, Activity, MessageSquare, UserCheck, ListChecks } from "lucide-react";

export const QUESTION_TYPES = [
  {
    value: "scale_0_5",
    label: "Skala Skor 0-5 (Winnie Dunn)",
    shortLabel: "Skala 0-5",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold",
    desc: "Skala baku klinis (5: Hampir Selalu s/d 0: Tidak Berlaku)",
  },
  {
    value: "range",
    label: "Range Angka Kustom (misal 1-5, 1-10)",
    shortLabel: "Range Kustom",
    badge: "bg-cyan-50 text-cyan-800 border-cyan-300 font-bold",
    desc: "Rentang angka dengan label nilai minimum dan maksimum",
  },
  {
    value: "multiple_choice",
    label: "Pilihan Ganda (Single Choice)",
    shortLabel: "Pilihan Ganda",
    badge: "bg-purple-50 text-purple-800 border-purple-300 font-bold",
    desc: "Memilih tepat satu dari opsi jawaban yang ditentukan",
  },
  {
    value: "checkbox_multi",
    label: "Pilihan Jamak (Multi-Centang)",
    shortLabel: "Multi-Centang",
    badge: "bg-indigo-50 text-indigo-800 border-indigo-300 font-bold",
    desc: "Dapat mencentang satu atau lebih pilihan opsi",
  },
  {
    value: "free_text",
    label: "Teks Bebas / Esai Deskriptif",
    shortLabel: "Teks Bebas",
    badge: "bg-sky-50 text-sky-800 border-sky-300 font-bold",
    desc: "Uraian teks observasi kualitatif terapis / orang tua",
  },
  {
    value: "yes_no",
    label: "Ya / Tidak (Biner)",
    shortLabel: "Ya / Tidak",
    badge: "bg-amber-50 text-amber-800 border-amber-300 font-bold",
    desc: "Pilihan biner langsung Ya atau Tidak",
  },
];

export const getQuestionTypeInfo = (type) => {
  const normalized =
    type === "text"
      ? "free_text"
      : type === "multiple_choice"
      ? "multiple_choice"
      : type === "yes_no"
      ? "yes_no"
      : type === "range"
      ? "range"
      : type === "checkbox_multi"
      ? "checkbox_multi"
      : "scale_0_5";
  return QUESTION_TYPES.find((t) => t.value === normalized) || QUESTION_TYPES[0];
};

export const getCategoryIcon = (categoryName = "") => {
  const name = categoryName.toLowerCase();
  if (name.includes("school")) return School;
  if (name.includes("sensory")) return Brain;
  if (name.includes("motor")) return Activity;
  if (name.includes("speech") || name.includes("communication")) return MessageSquare;
  if (name.includes("adl") || name.includes("living")) return UserCheck;
  return ListChecks;
};

export const getQuadrantCounts = (cat, quadrants) => {
  const counts = Object.fromEntries(quadrants.map((q) => [q.code, 0]));
  if (!cat) return counts;
  if (cat.sections && cat.sections.length > 0) {
    cat.sections.forEach((sec) => {
      (sec.questions || []).forEach((q) => {
        const quad = q.quadrant || "SN";
        if (counts[quad] !== undefined) counts[quad]++;
      });
    });
  } else if (cat.questions) {
    cat.questions.forEach((q) => {
      const quad = q.quadrant || "SN";
      if (counts[quad] !== undefined) counts[quad]++;
    });
  }
  return counts;
};
