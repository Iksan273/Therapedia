import { normalizeQuestionType } from "@/features/assessment/components/masterData/assessmentConfig";

// Pilihan skala bawaan Winnie Dunn (0–5) untuk soal `scale_0_5` tanpa opsi eksplisit.
export const WINNIE_DUNN_OPTIONS = [
  "5 - Hampir Selalu (90%+)",
  "4 - Sering (75%)",
  "3 - Kadang (50%)",
  "2 - Jarang (25%)",
  "1 - Hampir Tidak Pernah (10%)",
  "0 - Tidak Pernah / Tidak Berlaku",
];

// Bentuk kategori (bersarang `sections[].questions[]` atau datar `questions[]`) → daftar section siap render.
// Id soal stabil (`q.id` atau turunan section+nomor) karena dipakai sebagai kunci jawaban & draft.
export function buildSections(category) {
  if (!category) return [];

  const mapQuestion = (q, idx, sec) => {
    const qType = normalizeQuestionType(q.type);
    let opts = [];
    if (Array.isArray(q.options) && q.options.length > 0) opts = q.options;
    else if (qType === "scale_0_5") opts = WINNIE_DUNN_OPTIONS;
    else opts = ["Opsi 1", "Opsi 2", "Opsi 3"];

    return {
      ...q,
      id: q.id || `q-${sec ? sec.sectionId : "cat"}-${q.itemNo || idx + 1}`,
      itemNo: q.itemNo || idx + 1,
      domain: sec?.title || sec?.domain || q.domain || "Umum",
      type: qType,
      options: opts,
      scaleMin: q.scaleMin !== undefined ? q.scaleMin : qType === "range" ? 1 : 0,
      scaleMax: q.scaleMax !== undefined ? q.scaleMax : 5,
      minLabel: q.minLabel || (qType === "range" ? "Sangat Rendah" : "Tidak Berlaku"),
      maxLabel: q.maxLabel || (qType === "range" ? "Sangat Tinggi" : "Hampir Selalu"),
    };
  };

  if (category.sections && category.sections.length > 0) {
    return category.sections.map((sec, sIdx) => ({
      id: sec.sectionId || `sec-${sIdx}`,
      title: sec.title || `Bagian ${sIdx + 1}`,
      leadText: sec.leadText || "",
      questions: (sec.questions || []).map((q, idx) => mapQuestion(q, idx, sec)),
    }));
  }
  return [
    {
      id: "sec-default",
      title: "Daftar Pertanyaan Observasi",
      leadText: "",
      questions: (category.questions || []).map((q, idx) => mapQuestion(q, idx, null)),
    },
  ];
}

export const questionsOf = (sections) => sections.flatMap((s) => s.questions);

// Peta id soal → id section (untuk titik lanjut draft).
export const sectionIndex = (sections) => {
  const map = {};
  sections.forEach((s) => s.questions.forEach((q) => { map[q.id] = s.id; }));
  return map;
};
