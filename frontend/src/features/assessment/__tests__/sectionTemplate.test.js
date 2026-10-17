import { buildSections } from "@/features/assessment/components/fill/fillSections";

const category = {
  id: "cat-x",
  sections: [
    { sectionId: "s-plain", title: "Umum", questions: [{ id: "q1", itemNo: 1, question: "A", type: "scale_0_5" }] },
    { sectionId: "s-school", title: "Auditori", template: "school_companion", questions: [{ id: "q2", itemNo: 1, question: "B" }] },
    { sectionId: "s-toddler", title: "Visual", template: "toddler_sensory", questions: [{ id: "q3", itemNo: 1, question: "C" }] },
  ],
};

describe("buildSections — template section", () => {
  const [plain, school, toddler] = buildSections(category);

  test("soal membawa sectionId + template untuk snapshot jawaban", () => {
    expect(plain.questions[0]).toMatchObject({ sectionId: "s-plain", template: null });
    expect(school.questions[0]).toMatchObject({ sectionId: "s-school", template: "school_companion" });
    expect(toddler.template).toBe("toddler_sensory");
  });

  test("skala 0–5 memakai legenda template (School = Selalu 100%, Toddler = Hampir Selalu 90%+)", () => {
    expect(school.questions[0].options[0]).toBe("5 - Selalu (100%)");
    expect(toddler.questions[0].options[0]).toBe("5 - Hampir Selalu (90%+)");
    expect(plain.questions[0].options[0]).toBe("5 - Hampir Selalu (90%+)");
  });
});
