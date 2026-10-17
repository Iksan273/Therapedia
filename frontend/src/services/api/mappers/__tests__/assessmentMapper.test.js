import { describe, it, expect } from "vitest";
import {
  answerToApi,
  answersFromApi,
  answersPatchToApi,
  categoryFromApi,
  categoryUpdateToApi,
  codeFromApi,
  codeIssueToApi,
  draftFromApi,
  questionFromApi,
  questionToApi,
  resultFromApi,
  sectionFromApi,
  structureToCategory,
} from "@/services/api/mappers/assessmentMapper";

const structure = {
  category: { id: 3, typeCode: "SP2", name: "Child Sensory", domain: "Sensori", respondentProfile: "parent", respondentFields: [{ key: "name", label: "Nama", required: true, max: 150 }] },
  sections: [
    {
      id: 10, title: "Auditori", description: "Panduan", documentUrl: null, hasDocumentFile: false, resultTemplate: "child_sensory", sortOrder: 1,
      questions: [
        { id: 100, itemNo: 1, questionType: "scale_0_5", question: "Respon suara", options: null, rangeMin: null, rangeMax: null, isRequired: true },
        { id: 101, itemNo: 2, questionType: "checkbox_multi", question: "Disukai", options: ["Musik", "Gambar"], isRequired: false },
        { id: 102, itemNo: 3, questionType: "range", question: "Skala", rangeMin: 1, rangeMax: 10, rangeMinLabel: "Rendah", rangeMaxLabel: "Tinggi", isRequired: true },
      ],
    },
  ],
};

describe("assessmentMapper", () => {
  it("soal: id string, default skala per tipe, required default true", () => {
    const q = questionFromApi(structure.sections[0].questions[0]);
    expect(q).toMatchObject({ id: "100", type: "scale_0_5", scaleMin: 0, scaleMax: 5, minLabel: "Tidak Berlaku", required: true, options: [] });
    const r = questionFromApi(structure.sections[0].questions[2]);
    expect(r).toMatchObject({ type: "range", scaleMin: 1, scaleMax: 10, minLabel: "Rendah", maxLabel: "Tinggi" });
    expect(questionFromApi(structure.sections[0].questions[1]).required).toBe(false);
  });

  it("soal ke body: opsi dan rentang hanya bila relevan", () => {
    expect(questionToApi({ question: "A", type: "free_text", options: [], required: false })).toMatchObject({ questionType: "free_text", options: null, rangeMin: null, isRequired: false });
    expect(questionToApi({ question: "B", type: "multiple_choice", options: ["x"], required: true })).toMatchObject({ options: ["x"], rangeMin: null });
    expect(questionToApi({ question: "C", type: "range", scaleMin: 1, scaleMax: 7, minLabel: "a", maxLabel: "b" })).toMatchObject({ rangeMin: 1, rangeMax: 7, rangeMinLabel: "a" });
  });

  it("section: sectionId string, template dari resultTemplate", () => {
    const s = sectionFromApi(structure.sections[0]);
    expect(s).toMatchObject({ sectionId: "10", template: "child_sensory", documentUrl: "" });
    expect(s.questions).toHaveLength(3);
  });

  it("kategori daftar vs detail; body ubah memuat version", () => {
    const list = categoryFromApi({ id: 3, typeCode: "SP2", name: "X", sectionCount: 7, questionCount: 65, fillingCount: 2, isActive: true, version: 4 });
    expect(list).toMatchObject({ id: "3", categoryName: "X", sectionCount: 7, questionCount: 65, fillingCount: 2, respondentProfile: "parent" });
    expect(list.sections).toBeUndefined();
    expect(categoryFromApi({ id: 3, name: "X", sections: [] }).sections).toEqual([]);
    expect(categoryUpdateToApi({ categoryName: "Baru", respondentProfile: "teacher" }, 4)).toEqual({ version: 4, name: "Baru", respondentProfile: "teacher" });
  });

  it("snapshot -> kategori FE lengkap dengan profil dan field pengisi", () => {
    const c = structureToCategory(structure);
    expect(c).toMatchObject({ id: "3", typeCode: "SP2", categoryName: "Child Sensory", respondentProfile: "parent" });
    expect(c.respondentFields[0].key).toBe("name");
    expect(c.sections[0].questions[1].type).toBe("checkbox_multi");
  });

  it("jawaban: nilai mentah <-> {t, v}", () => {
    expect(answerToApi("4 - Sering")).toEqual({ t: "4 - Sering" });
    expect(answerToApi(7)).toEqual({ t: "7" });
    expect(answerToApi(["a", "b"])).toEqual({ t: "", v: ["a", "b"] });
    expect(answerToApi(null)).toBeNull();
    expect(answersPatchToApi({ 100: "3 - x", 101: ["a"], 102: null })).toEqual({ 100: { t: "3 - x" }, 101: { t: "", v: ["a"] }, 102: null });

    const category = structureToCategory(structure);
    expect(answersFromApi({ 100: { t: "3 - x" }, 101: { t: "", v: ["Musik"] }, 102: { t: "8" } }, category)).toEqual({ 100: "3 - x", 101: ["Musik"], 102: 8 });
  });

  it("draft server -> draft FE", () => {
    const category = structureToCategory(structure);
    const d = draftFromApi({ answers: { 100: { t: "2 - y" } }, respondent: { name: "Siti" }, answeredCount: 1, lastSectionId: 10, consentAt: "2026-10-17T00:00:00Z", version: 3, startedAt: "x" }, category);
    expect(d).toMatchObject({ answers: { 100: "2 - y" }, respondent: { name: "Siti" }, lastSectionId: "10", version: 3 });
    expect(draftFromApi(null, category)).toBeNull();
  });

  it("kode: status issued/submitted, progres draft, body terbit", () => {
    const c = codeFromApi({ id: 5, code: "SP2-ABC234", categoryId: 3, category: { id: 3, name: "Child Sensory", typeCode: "SP2" }, status: "issued", invoiceRequired: true, hasDraft: true, answeredCount: 10, questionCount: 65, client: { id: 9, clientCode: "AE-00001", childName: "Anak" } });
    expect(c).toMatchObject({ id: "5", categoryId: "3", status: "issued", hasDraft: true, answeredCount: 10, questionCount: 65, name: "Child Sensory" });
    expect(c.client.clientName).toBe("Anak");
    expect(codeIssueToApi({ categoryId: "3", validityDays: 14, withInvoice: true, masterPackageId: "8" })).toEqual({ categoryId: 3, validityDays: 14, withInvoice: true, masterPackageId: 8 });
    expect(codeIssueToApi({ categoryId: "3", withInvoice: false, masterPackageId: "8" })).toEqual({ categoryId: 3, validityDays: null, withInvoice: false });
  });

  it("hasil: entri FE dengan struktur snapshot, teks soal dari snapshot, respondent", () => {
    const r = resultFromApi({
      id: 1, code: "SP2-ABC234", category: { id: 3, name: "Child Sensory", typeCode: "SP2" }, submittedAt: "2026-10-17T01:00:00Z", consentAt: "2026-10-17T00:00:00Z",
      respondent: { name: "Siti", relation: "Ibu" }, structure,
      answers: [{ questionId: 100, itemNo: 1, answerText: "4 - Sering", answerValues: null, score: 4 }, { questionId: 101, itemNo: 2, answerText: "Musik", answerValues: ["Musik"], score: null }],
    });
    expect(r).toMatchObject({ code: "SP2-ABC234", categoryId: "3", respondent: { name: "Siti", relation: "Ibu" } });
    expect(r.structure.sections[0].title).toBe("Auditori");
    expect(r.answers[0]).toMatchObject({ questionId: "100", sectionId: "10", template: "child_sensory", domain: "Auditori", question: "Respon suara", answer: "4 - Sering", score: 4 });
    expect(r.answers[1].answerValues).toEqual(["Musik"]);
  });
});
