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
  {
    value: "short_text",
    label: "Jawaban Singkat (Satu Baris)",
    shortLabel: "Jawaban Singkat",
    badge: "bg-sky-50 text-sky-800 border-sky-300 font-bold",
    desc: "Jawaban teks satu baris (nama, nomor, istilah singkat)",
  },
  {
    value: "number",
    label: "Angka",
    shortLabel: "Angka",
    badge: "bg-cyan-50 text-cyan-800 border-cyan-300 font-bold",
    desc: "Jawaban berupa angka (mis. berat badan, jumlah anggota keluarga)",
  },
  {
    value: "dropdown",
    label: "Dropdown (Pilih dari Daftar)",
    shortLabel: "Dropdown",
    badge: "bg-purple-50 text-purple-800 border-purple-300 font-bold",
    desc: "Memilih satu opsi dari daftar dropdown",
  },
  {
    value: "date",
    label: "Tanggal",
    shortLabel: "Tanggal",
    badge: "bg-rose-50 text-rose-800 border-rose-300 font-bold",
    desc: "Memilih tanggal dari kalender (mis. tanggal kejadian)",
  },
  {
    value: "birth_date",
    label: "Tanggal Lahir (Usia Otomatis)",
    shortLabel: "Tanggal Lahir",
    badge: "bg-pink-50 text-pink-800 border-pink-300 font-bold",
    desc: "Tanggal lahir anak; usia dihitung otomatis dan tidak boleh di masa depan",
  },
  {
    value: "time",
    label: "Waktu (Jam)",
    shortLabel: "Waktu",
    badge: "bg-teal-50 text-teal-800 border-teal-300 font-bold",
    desc: "Memilih jam (mis. jam tidur, jam makan)",
  },
];

// Tipe lama "text" = free_text; tipe tak dikenal jatuh ke skala baku 0-5.
export const normalizeQuestionType = (type) => {
  if (type === "text") return "free_text";
  return QUESTION_TYPES.some((t) => t.value === type) ? type : "scale_0_5";
};

// Tipe yang jawabannya dipilih dari daftar opsi (dikelola di dialog soal).
export const OPTION_BASED_TYPES = ["multiple_choice", "checkbox_multi", "dropdown"];
export const isOptionBasedType = (type) => OPTION_BASED_TYPES.includes(type);

// Hanya tipe ini yang jawabannya menghasilkan skor (angka di awal jawaban). Tanggal, teks, dll. tidak diberi skor.
const SCORED_TYPES = ["scale_0_5", "range", "multiple_choice", "dropdown"];
export const isScoredQuestionType = (type) => SCORED_TYPES.includes(normalizeQuestionType(type));

export const getQuestionTypeInfo = (type) =>
  QUESTION_TYPES.find((t) => t.value === normalizeQuestionType(type)) || QUESTION_TYPES[0];

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
        const quad = q.quadrant;
        if (counts[quad] !== undefined) counts[quad]++;
      });
    });
  } else if (cat.questions) {
    cat.questions.forEach((q) => {
      const quad = q.quadrant;
      if (counts[quad] !== undefined) counts[quad]++;
    });
  }
  return counts;
};
