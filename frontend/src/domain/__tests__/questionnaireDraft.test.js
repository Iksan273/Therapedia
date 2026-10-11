import {
  applyDraftPatch,
  canDeleteQuestionnaireCode,
  canFinishExpiredWithDraft,
  checkQuestionnaireAccess,
  countAnswered,
  countCategoryQuestions,
  diffAnswers,
  draftProgress,
  isAnswerFilled,
} from "@/domain/assessment";

const NOW = "2026-11-01T03:00:00.000Z";
const client = { id: "c1", assessmentCodes: [], assessmentAnswers: [] };

describe("jawaban terisi", () => {
  test("angka 0 terisi; teks kosong, spasi, array kosong, null belum", () => {
    expect(isAnswerFilled(0)).toBe(true);
    expect(isAnswerFilled("4 - Sering")).toBe(true);
    expect(isAnswerFilled(["a"])).toBe(true);
    expect(isAnswerFilled("")).toBe(false);
    expect(isAnswerFilled("   ")).toBe(false);
    expect(isAnswerFilled([])).toBe(false);
    expect(isAnswerFilled(null)).toBe(false);
    expect(isAnswerFilled(undefined)).toBe(false);
  });

  test("countAnswered & countCategoryQuestions (bersarang atau datar)", () => {
    expect(countAnswered(["a", "b", "c"], { a: 0, b: "", c: "x" })).toBe(2);
    expect(countCategoryQuestions({ sections: [{ questions: [{}, {}] }, { questions: [{}] }] })).toBe(3);
    expect(countCategoryQuestions({ questions: [{}, {}, {}, {}] })).toBe(4);
    expect(countCategoryQuestions(null)).toBe(0);
  });
});

describe("selisih jawaban (patch)", () => {
  test("baru, berubah, dihapus; tidak berubah diabaikan", () => {
    const prev = { a: "1", b: "2", c: ["x"] };
    const next = { a: "1", b: "3", c: [], d: "baru" };
    expect(diffAnswers(prev, next)).toEqual({ b: "3", c: null, d: "baru" });
  });

  test("jawaban yang hilang dari peta = dihapus; peta sama = tanpa patch", () => {
    expect(diffAnswers({ a: "1" }, {})).toEqual({ a: null });
    expect(diffAnswers({ a: "1" }, { a: "1" })).toEqual({});
    expect(diffAnswers({}, { a: "" })).toEqual({});
  });
});

describe("draft: terapkan patch", () => {
  test("draft baru dibuat: versi 1, hitungan terjawab, waktu mulai", () => {
    const d = applyDraftPatch(null, { code: "SP2-AAAAAA", clientId: "c1", answers: { q1: "5 - Hampir Selalu", q2: "" }, lastSectionId: "sec-1" }, NOW);
    expect(d).toMatchObject({ code: "SP2-AAAAAA", clientId: "c1", answeredCount: 1, lastSectionId: "sec-1", version: 1, startedAt: NOW, updatedAt: NOW, consentAt: null });
    expect(d.answers).toEqual({ q1: "5 - Hampir Selalu" });
  });

  test("patch digabung, null menghapus, versi naik, startedAt tetap", () => {
    const d1 = applyDraftPatch(null, { code: "X", clientId: "c1", answers: { q1: "a", q2: "b" } }, NOW);
    const d2 = applyDraftPatch(d1, { answers: { q2: null, q3: ["x", "y"] } }, "2026-11-01T04:00:00.000Z");
    expect(d2.answers).toEqual({ q1: "a", q3: ["x", "y"] });
    expect(d2.answeredCount).toBe(2);
    expect(d2.version).toBe(2);
    expect(d2.startedAt).toBe(NOW);
    expect(d2.updatedAt).toBe("2026-11-01T04:00:00.000Z");
  });

  test("id soal di luar kategori dibuang (instrumen berubah)", () => {
    const d1 = applyDraftPatch(null, { code: "X", clientId: "c1", answers: { q1: "a", q9: "lama" } }, NOW);
    const d2 = applyDraftPatch(d1, { answers: { q2: "b" }, validQuestionIds: ["q1", "q2"] }, NOW);
    expect(Object.keys(d2.answers).sort()).toEqual(["q1", "q2"]);
    expect(d2.answeredCount).toBe(2);
  });

  test("consent: undefined = tetap, string = diset, null = dicabut", () => {
    const d1 = applyDraftPatch(null, { code: "X", clientId: "c1", answers: {}, consentAt: NOW }, NOW);
    expect(d1.consentAt).toBe(NOW);
    expect(applyDraftPatch(d1, { answers: { q1: "a" } }, NOW).consentAt).toBe(NOW);
    expect(applyDraftPatch(d1, { answers: {}, consentAt: null }, NOW).consentAt).toBeNull();
  });

  test("tidak mengubah draft asal (pure)", () => {
    const d1 = applyDraftPatch(null, { code: "X", clientId: "c1", answers: { q1: "a" } }, NOW);
    const snapshot = JSON.stringify(d1);
    applyDraftPatch(d1, { answers: { q1: null, q2: "b" } }, NOW);
    expect(JSON.stringify(d1)).toBe(snapshot);
  });
});

describe("akses kode: kedaluwarsa dengan draft", () => {
  const expired = { code: "SP2-AAAAAA", categoryId: "cat-001", status: "issued", expiresAt: "2026-11-05T00:00:00.000Z" };
  const after = new Date("2026-11-10T00:00:00.000Z");

  test("kedaluwarsa tanpa draft ditolak", () => {
    expect(checkQuestionnaireAccess({ client, codeItem: expired, now: after })).toEqual({ ok: false, reason: "expired" });
  });

  test("draft dimulai SEBELUM kedaluwarsa: boleh diselesaikan", () => {
    const draft = { startedAt: "2026-11-02T01:00:00.000Z" };
    expect(canFinishExpiredWithDraft(expired, draft)).toBe(true);
    expect(checkQuestionnaireAccess({ client, codeItem: expired, now: after, draft })).toEqual({ ok: true });
  });

  test("draft dimulai SETELAH kedaluwarsa tetap ditolak; kode tanpa masa berlaku tak terpengaruh", () => {
    expect(canFinishExpiredWithDraft(expired, { startedAt: "2026-11-06T00:00:00.000Z" })).toBe(false);
    expect(canFinishExpiredWithDraft({ code: "X" }, { startedAt: NOW })).toBe(false);
  });

  test("kode yang sudah dikirim tetap ditolak walau ada draft", () => {
    const submitted = { ...expired, status: "submitted" };
    expect(checkQuestionnaireAccess({ client, codeItem: submitted, now: after, draft: { startedAt: NOW } })).toEqual({ ok: false, reason: "submitted" });
  });
});

describe("hapus kode kuesioner", () => {
  const issued = { code: "SP2-AAAAAA", categoryId: "cat-001", status: "issued" };

  test("belum diisi & belum ada draft: boleh", () => {
    expect(canDeleteQuestionnaireCode(client, issued, null)).toEqual({ ok: true });
  });

  test("sudah punya draft (sedang diisi): TIDAK boleh", () => {
    expect(canDeleteQuestionnaireCode(client, issued, { code: "SP2-AAAAAA" })).toEqual({ ok: false, reason: "draft" });
  });

  test("sudah dikirim: tidak boleh (prioritas di atas draft)", () => {
    expect(canDeleteQuestionnaireCode(client, { ...issued, status: "submitted" }, null)).toEqual({ ok: false, reason: "filled" });
  });
});

describe("progres draft", () => {
  test("persen dibulatkan dan dibatasi 100; tanpa draft = 0", () => {
    expect(draftProgress({ answeredCount: 105 }, 210)).toEqual({ answered: 105, total: 210, percent: 50 });
    expect(draftProgress({ answeredCount: 250 }, 210).percent).toBe(100);
    expect(draftProgress(null, 210)).toEqual({ answered: 0, total: 210, percent: 0 });
    expect(draftProgress({ answeredCount: 1 }, 0).percent).toBe(0);
  });
});

describe("peringatan draft aktif per kategori", () => {
  test("hanya menghitung draft dari kode kategori itu (kode tidak peka huruf besar/kecil)", async () => {
    const { countActiveDraftsForCategory } = await import("@/domain/assessment");
    const clients = [
      { id: "c1", assessmentCodes: [{ code: "SP2-AAAAAA", categoryId: "cat-001" }, { code: "SC-BBBBBB", categoryId: "cat-002" }] },
      { id: "c2", assessmentCodes: [{ code: "SP2-CCCCCC", categoryId: "cat-001" }] },
    ];
    const drafts = [{ code: "SP2-AAAAAA" }, { code: "sc-bbbbbb" }];
    expect(countActiveDraftsForCategory(clients, drafts, "cat-001")).toBe(1);
    expect(countActiveDraftsForCategory(clients, drafts, "cat-002")).toBe(1);
    expect(countActiveDraftsForCategory(clients, [], "cat-001")).toBe(0);
  });
});
