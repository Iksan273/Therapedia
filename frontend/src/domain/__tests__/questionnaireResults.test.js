import { listQuestionnaireResults } from "@/domain/assessment";

const code = (c, categoryId, extra = {}) => ({ code: c, categoryId, name: `Kategori ${categoryId}`, status: "issued", issuedAt: "2026-10-01T00:00:00Z", ...extra });

test("satu opsi per kode; kode sekategori dibedakan lewat code di jawaban", () => {
  const client = {
    assessmentCodes: [code("ASM-AAA111", "cat-1", { status: "submitted" }), code("ASM-BBB222", "cat-1", { status: "submitted" }), code("SCP-CCC333", "cat-2")],
    assessmentAnswers: [
      { code: "asm-bbb222", categoryId: "cat-1", categoryName: "Kategori cat-1", submittedAt: "2026-10-03", answers: [{ q: 2 }] },
      { code: "ASM-AAA111", categoryId: "cat-1", categoryName: "Kategori cat-1", submittedAt: "2026-10-02", answers: [{ q: 1 }] },
    ],
  };
  const list = listQuestionnaireResults(client);
  expect(list.map((o) => [o.key, o.filled])).toEqual([["ASM-AAA111", true], ["ASM-BBB222", true], ["SCP-CCC333", false]]);
  expect(list[0].entry.answers[0].q).toBe(1);
  expect(list[1].entry.answers[0].q).toBe(2);
});

test("jawaban lama tanpa code dipasangkan ke kode sekategori yang sudah terisi, sisanya tetap tampil", () => {
  const client = {
    assessmentCodes: [code("ASM-OLD001", "cat-1", { status: undefined })],
    assessmentAnswers: [
      { categoryId: "cat-1", categoryName: "Lama", answers: [] },
      { categoryId: "cat-9", categoryName: "Tanpa kode", answers: [] },
    ],
  };
  const list = listQuestionnaireResults(client);
  expect(list).toHaveLength(2);
  expect(list[0]).toMatchObject({ key: "ASM-OLD001", filled: true });
  expect(list[1]).toMatchObject({ key: "ans-1", code: null, categoryName: "Tanpa kode" });
});

test("client tanpa kode/jawaban → daftar kosong", () => {
  expect(listQuestionnaireResults({})).toEqual([]);
});
