import { describe, it, expect } from "vitest";
import { buildTemplateResult, getSectionTemplate, isTemplateSection, normalizeTemplate, parseScore } from "../assessmentTemplate";

const category = {
  sections: [
    { sectionId: "sec-a", title: "Identitas", questions: [{ id: "q-a1", itemNo: 1, question: "Keluhan utama?", type: "free_text" }] },
    {
      sectionId: "sec-b",
      title: "Auditori",
      template: "toddler_sensory",
      questions: [
        { id: "q-b1", itemNo: 1, question: "Mudah terkejut" },
        { id: "q-b2", itemNo: 2, question: "Mudah teralihkan" },
        { id: "q-b3", itemNo: 3, question: "Soal ketiga" },
      ],
    },
  ],
};

describe("template section", () => {
  it("normalizeTemplate: nilai tak dikenal → null", () => {
    expect(normalizeTemplate("child_sensory")).toBe("child_sensory");
    expect(normalizeTemplate("xyz")).toBeNull();
    expect(normalizeTemplate("")).toBeNull();
    expect(isTemplateSection({ template: "xyz" })).toBe(false);
    expect(getSectionTemplate({ template: "school_companion" }).value).toBe("school_companion");
  });

  it("parseScore: angka atau string berawalan angka", () => {
    expect(parseScore(4)).toBe(4);
    expect(parseScore("5 - Hampir Selalu")).toBe(5);
    expect(parseScore("0 - Tidak Berlaku")).toBe(0);
    expect(parseScore("")).toBeNull();
    expect(parseScore(undefined)).toBeNull();
  });
});

describe("buildTemplateResult", () => {
  const answers = [
    { questionId: "q-a1", answer: "Terlambat bicara", score: null },
    { questionId: "q-b1", answer: "5 - Hampir Selalu", score: 5 },
    { questionId: "q-b2", answer: "3 - Kadang", score: 3 },
    { questionId: "q-b3", answer: "4 - Sering", score: 4 },
  ];

  it("memisahkan section template dan section biasa", () => {
    const r = buildTemplateResult(category, answers);
    expect(r.plainSections).toHaveLength(1);
    expect(r.plainSections[0].items[0].answer).toBe("Terlambat bicara");
    expect(r.templateSections).toHaveLength(1);
    expect(r.templateSections[0].template).toBe("toddler_sensory");
  });

  it("menjumlah skor mentah per section dan total keseluruhan", () => {
    const r = buildTemplateResult(category, answers);
    expect(r.templateSections[0].rawScoreSum).toBe(12);
    expect(r.templateSections[0].answeredCount).toBe(3);
    expect(r.rawScoreTotal).toBe(12);
  });

  it("soal belum dijawab: score null, tidak ditebak", () => {
    const r = buildTemplateResult(category, []);
    expect(r.templateSections[0].items.every((it) => it.score === null)).toBe(true);
    expect(r.templateSections[0].rawScoreSum).toBe(0);
    expect(r.templateSections[0].answeredCount).toBe(0);
  });

  it("jawaban lama tanpa questionId/sectionId dicocokkan lewat judul section + nomor", () => {
    const legacy = [{ domain: "Auditori", itemNo: 1, question: "x", answer: "2", score: 2 }];
    const r = buildTemplateResult(category, legacy);
    expect(r.templateSections[0].items[0].score).toBe(2);
    expect(r.rawScoreTotal).toBe(2);
  });

  it("kategori tanpa template: semua section biasa", () => {
    const r = buildTemplateResult({ sections: [category.sections[0]] }, answers);
    expect(r.templateSections).toHaveLength(0);
    expect(r.plainSections).toHaveLength(1);
  });
});

describe("urutan section pada hasil", () => {
  it("order mengikuti urutan section di kuesioner (biasa, biasa, profil, biasa)", () => {
    const cat = {
      sections: [
        { sectionId: "a", title: "A", questions: [] },
        { sectionId: "b", title: "B", questions: [] },
        { sectionId: "c", title: "C", template: "child_sensory", questions: [] },
        { sectionId: "d", title: "D", questions: [] },
      ],
    };
    const r = buildTemplateResult(cat, []);
    expect(r.order).toEqual([
      { kind: "plain", sectionId: "a" },
      { kind: "plain", sectionId: "b" },
      { kind: "template", sectionId: "c" },
      { kind: "plain", sectionId: "d" },
    ]);
  });
});
