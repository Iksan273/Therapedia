import { QUESTION_TYPES, getQuestionTypeInfo, isOptionBasedType, isScoredQuestionType, normalizeQuestionType } from "@/features/assessment/components/masterData/assessmentConfig";

describe("tipe soal assessment", () => {
  test("memuat tipe ala Google Form + tanggal lahir", () => {
    const values = QUESTION_TYPES.map((t) => t.value);
    for (const v of ["short_text", "free_text", "multiple_choice", "checkbox_multi", "dropdown", "range", "number", "date", "birth_date", "time", "yes_no", "scale_0_5"]) {
      expect(values).toContain(v);
    }
    expect(new Set(values).size).toBe(values.length);
  });
  test("normalisasi: tipe lama & tak dikenal", () => {
    expect(normalizeQuestionType("text")).toBe("free_text");
    expect(normalizeQuestionType("birth_date")).toBe("birth_date");
    expect(normalizeQuestionType(undefined)).toBe("scale_0_5");
    expect(getQuestionTypeInfo("xyz").value).toBe("scale_0_5");
  });
  test("tipe berbasis opsi", () => {
    expect(isOptionBasedType("dropdown")).toBe(true);
    expect(isOptionBasedType("date")).toBe(false);
  });
  test("hanya tipe skor yang diberi skor (tanggal '2020-05-10' tidak jadi skor 2020)", () => {
    expect(isScoredQuestionType("scale_0_5")).toBe(true);
    expect(isScoredQuestionType("range")).toBe(true);
    expect(isScoredQuestionType("birth_date")).toBe(false);
    expect(isScoredQuestionType("short_text")).toBe(false);
    expect(isScoredQuestionType("free_text")).toBe(false);
  });
});
