// Template hasil per SECTION kuesioner (Sensory Profile 2, Winnie Dunn). Section ber-template dirender sebagai tabel
// psikologi (skor mentah per section). Section tanpa template = form biasa (daftar pertanyaan–jawaban).
// Sistem HANYA menghitung skor mentah per section: tanpa kuadran & tanpa klasifikasi (ditentukan asesor di luar sistem).
// Pure: tanpa React/store/storage.

export const TEMPLATE_NONE = "";

const LEGEND_90 = [
  "5 - Hampir Selalu (90%+)",
  "4 - Sering (75%)",
  "3 - Kadang (50%)",
  "2 - Jarang (25%)",
  "1 - Hampir Tidak Pernah (0-10%)",
  "0 - Tidak Dapat Diterapkan",
];

const LEGEND_SCHOOL = [
  "5 - Selalu (100%)",
  "4 - Sering (75%)",
  "3 - Kadang (50%)",
  "2 - Jarang (25%)",
  "1 - Hampir Tidak Pernah (0-10%)",
  "0 - Tidak Tahu / Tidak Mengobservasi",
];

export const SECTION_TEMPLATES = {
  school_companion: {
    value: "school_companion",
    label: "School Companion Sensory Profile 2",
    ageHint: "3–14 tahun, diisi guru / guru pendamping",
    legend: LEGEND_SCHOOL,
    headerFields: ["teacherName", "schoolName", "className"],
  },
  toddler_sensory: {
    value: "toddler_sensory",
    label: "Toddler Sensory Profile 2",
    ageHint: "6 bulan – kurang dari 3 tahun",
    legend: LEGEND_90,
    headerFields: [],
  },
  child_sensory: {
    value: "child_sensory",
    label: "Child Sensory Profile 2",
    ageHint: "3–14 tahun, diisi orang tua",
    legend: LEGEND_90,
    headerFields: [],
  },
};

export const SECTION_TEMPLATE_OPTIONS = Object.values(SECTION_TEMPLATES);

// Nilai tak dikenal / kosong → null (section biasa).
export const normalizeTemplate = (value) => (SECTION_TEMPLATES[value] ? value : null);

export const getSectionTemplate = (section) => SECTION_TEMPLATES[normalizeTemplate(section?.template)] || null;

export const isTemplateSection = (section) => getSectionTemplate(section) !== null;

// Skor jawaban: angka, atau string berawalan angka ("5 - Hampir Selalu"). Lainnya / kosong → null.
export const parseScore = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const m = String(value).match(/^\s*(\d+)/);
  return m ? parseInt(m[1], 10) : null;
};

// Cari jawaban sebuah soal pada entri hasil (`assessmentAnswers[].answers`): id soal → itemNo+judul section → teks soal.
const findAnswer = (answers, question, section) => {
  const list = answers || [];
  return (
    list.find((a) => a.questionId && a.questionId === question.id) ||
    list.find((a) => a.sectionId && a.sectionId === section.sectionId && Number(a.itemNo) === Number(question.itemNo)) ||
    list.find((a) => !a.sectionId && a.domain === section.title && Number(a.itemNo) === Number(question.itemNo)) ||
    list.find((a) => a.question && a.question === question.question) ||
    null
  );
};

// Hasil sebuah kuesioner: section ber-template → tabel skor mentah; section biasa → daftar jawaban.
// Soal belum dijawab / tanpa skor: score null (tidak dihitung, bukan nilai tebakan).
// → { templateSections:[{ sectionId, title, template, items:[{ itemNo, question, score }], rawScoreSum, answeredCount }],
//     plainSections:[{ sectionId, title, items:[{ itemNo, question, answer }] }], rawScoreTotal, order:[{ kind, sectionId }] /*urutan section asli*/ }
export function buildTemplateResult(category, answers = []) {
  const templateSections = [];
  const plainSections = [];
  const order = []; // urutan asli section di kuesioner: [{ kind: "plain"|"template", sectionId }]

  (category?.sections || []).forEach((section, sIdx) => {
    const sectionId = section.sectionId || `sec-${sIdx}`;
    const normalized = { ...section, sectionId };
    const questions = section.questions || [];

    if (!isTemplateSection(section)) {
      order.push({ kind: "plain", sectionId });
      plainSections.push({
        sectionId,
        title: section.title,
        items: questions.map((q, i) => {
          const ans = findAnswer(answers, { ...q, itemNo: q.itemNo || i + 1 }, normalized);
          return { itemNo: q.itemNo || i + 1, question: q.question, answer: ans?.answer ?? "" };
        }),
      });
      return;
    }

    const items = questions.map((q, i) => {
      const itemNo = q.itemNo || i + 1;
      const ans = findAnswer(answers, { ...q, itemNo }, normalized);
      const score = ans ? (ans.score ?? parseScore(ans.answer)) : null;
      return { itemNo, question: q.question, score };
    });
    order.push({ kind: "template", sectionId });
    templateSections.push({
      sectionId,
      title: section.title,
      description: section.description ?? section.leadText ?? "",
      template: normalizeTemplate(section.template),
      items,
      rawScoreSum: items.reduce((sum, it) => sum + (it.score ?? 0), 0),
      answeredCount: items.filter((it) => it.score !== null).length,
    });
  });

  return { templateSections, plainSections, order, rawScoreTotal: templateSections.reduce((n, s) => n + s.rawScoreSum, 0) };
}

// Pulihkan bentuk kategori dari snapshot jawaban (kategori master sudah dihapus / flat): satu section per `sectionId`
// (jawaban lama: per judul `domain`). Jawaban lama tanpa `template` jadi section biasa.
export function categoryFromAnswers(answers = []) {
  const order = [];
  const groups = {};
  (answers || []).forEach((a, i) => {
    const key = a.sectionId || a.domain || "Umum";
    if (!groups[key]) {
      groups[key] = { sectionId: a.sectionId || `sec-ans-${order.length}`, title: a.domain || "Umum", template: normalizeTemplate(a.template), questions: [] };
      order.push(key);
    }
    groups[key].questions.push({ id: a.questionId, itemNo: a.itemNo || i + 1, question: a.question });
  });
  return { sections: order.map((k) => groups[k]) };
}
