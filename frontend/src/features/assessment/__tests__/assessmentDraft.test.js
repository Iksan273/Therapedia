// @vitest-environment jsdom
// Kuesioner dicicil: simpan otomatis, lanjutkan dengan kode yang sama, kirim final menghapus draft, kode ber-draft tidak bisa dihapus.
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import AssessmentFill from "@/features/assessment/pages/AssessmentFill";
import { useAssessmentFillActions } from "@/features/assessment/hooks/useAssessmentFillActions";
import { useQuestionnaireCodeActions } from "@/features/inquiry/hooks/useQuestionnaireCodeActions";
import { useClientDeleteActions } from "@/features/inquiry/hooks/useClientDeleteActions";
import { useAssessmentDrafts } from "@/stores/assessmentDraftsStore";
import { useAssessments } from "@/stores/assessmentsStore";
import { useClients } from "@/stores/clientsStore";
import { useCredits } from "@/stores/creditsStore";
import { buildSections, questionsOf } from "@/features/assessment/components/fill/fillSections";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };

const CODE = "TST-DRAFT1";
let ctx;
function Probe() {
  ctx = {
    fill: useAssessmentFillActions(),
    codes: useQuestionnaireCodeActions(),
    drafts: useAssessmentDrafts(),
    clients: useClients(),
    credits: useCredits(),
    del: useClientDeleteActions(),
    assessments: useAssessments(),
  };
  return null;
}

let root;
let container;
beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  window.localStorage.clear();
  await ensureSeedsIfNeeded();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
});

const mount = (ui) => act(async () => root.render(<AppProviders><Probe />{ui}</AppProviders>));
const renderFill = (url) => mount(<MemoryRouter initialEntries={[url]}><AssessmentFill /></MemoryRouter>);

// Client uji tanpa invoice assessment (agar tidak diminta unggah bukti), kode gratis
async function setupClientWithCode() {
  await mount(null); // provider aktif dulu (state bertahan saat form dirender di langkah berikutnya)
  const base = ctx.clients.clients.find((c) => !ctx.credits.getInvoicesForClient(c.id).some((i) => i.type === "assessment"));
  const item = { code: CODE, categoryId: "cat-001", name: "Sensory Profile", status: "issued", invoiceRequired: false };
  await act(async () => ctx.clients.updateClient(base.id, { assessmentCodes: [item], assessmentAnswers: [], status: "assessment_scheduled" }));
  return { client: ctx.clients.getClient(base.id), item };
}

const firstQuestions = (n) => {
  const sections = buildSections(ctx.assessments.getCategory("cat-001"));
  return questionsOf(sections).slice(0, n);
};

test("jawaban tersimpan otomatis ke draft setelah jeda, tanpa mengubah status kode", async () => {
  const { client } = await setupClientWithCode();
  await renderFill(`/assessment?code=${CODE}`);
  const [q1] = firstQuestions(1);
  const btn = container.querySelector(`[data-testid="assessment-scale-${q1.id}-4"]`);
  expect(btn).toBeTruthy();
  expect(ctx.drafts.getDraft(CODE)).toBeNull();

  await act(async () => btn.click());
  await act(async () => { vi.advanceTimersByTime(1200); });

  const draft = ctx.drafts.getDraft(CODE);
  expect(draft).toBeTruthy();
  expect(draft.clientId).toBe(client.id);
  expect(draft.answeredCount).toBe(1);
  expect(String(draft.answers[q1.id])).toMatch(/^4/);
  expect(draft.lastSectionId).toBeTruthy();
  expect(container.querySelector('[data-testid="assessment-save-status"]').getAttribute("data-status")).toBe("saved");
  // kode tetap `issued` (draft bukan hasil) dan jawaban final belum ada
  expect(ctx.clients.getClient(client.id).assessmentCodes[0].status).toBe("issued");
  expect(ctx.clients.getClient(client.id).assessmentAnswers).toHaveLength(0);
});

test("membuka kode yang sama melanjutkan jawaban tersimpan (dan persetujuan)", async () => {
  const { client } = await setupClientWithCode();
  const [q1, q2] = firstQuestions(2);
  await act(async () => {
    ctx.drafts.saveDraft({ code: CODE, clientId: client.id, answers: { [q1.id]: "5 - Hampir Selalu (90%+)", [q2.id]: "2 - Jarang (25%)" }, lastSectionId: null, consentAt: "2026-11-01T01:00:00.000Z" });
  });

  await renderFill(`/assessment?code=${CODE}`);
  expect(container.querySelector('[data-testid="assessment-resume-banner"]')).toBeTruthy();
  expect(container.querySelector('[data-testid="assessment-progress-label"]').textContent).toMatch(/^2 \//);
  // consent yang dicentang di awal ikut pulih
  expect(container.querySelector('[data-testid="assessment-consent-checkbox"]').getAttribute("data-state")).toBe("checked");
});

test("jawaban hasil resume tidak disimpan ulang bila tidak berubah (tanpa versi baru)", async () => {
  const { client } = await setupClientWithCode();
  const [q1] = firstQuestions(1);
  await act(async () => ctx.drafts.saveDraft({ code: CODE, clientId: client.id, answers: { [q1.id]: "3 - Kadang (50%)" } }));
  const v = ctx.drafts.getDraft(CODE).version;
  await renderFill(`/assessment?code=${CODE}`);
  await act(async () => { vi.advanceTimersByTime(5000); });
  expect(ctx.drafts.getDraft(CODE).version).toBe(v);
});

test("tanpa jawaban/persetujuan: membuka form tidak membuat draft (kode tetap bisa dihapus)", async () => {
  await setupClientWithCode();
  await renderFill(`/assessment?code=${CODE}`);
  await act(async () => { vi.advanceTimersByTime(35000); });
  expect(ctx.drafts.getDraft(CODE)).toBeNull();
});

test("kirim final: jawaban jadi hasil, status kode submitted, draft dihapus, status pipeline tidak berubah", async () => {
  const { client } = await setupClientWithCode();
  const category = ctx.assessments.getCategory("cat-001");
  const questions = questionsOf(buildSections(category));
  const answers = Object.fromEntries(questions.map((q) => [q.id, q.type === "scale_0_5" ? "4 - Sering (75%)" : q.options?.[0] ?? "x"]));
  await act(async () => ctx.drafts.saveDraft({ code: CODE, clientId: client.id, answers: { [questions[0].id]: "4 - Sering (75%)" }, consentAt: "2026-11-01T01:00:00.000Z" }));
  expect(ctx.drafts.getDraft(CODE)).toBeTruthy();

  let result;
  await act(async () => { result = ctx.fill.submit({ client: ctx.clients.getClient(client.id), category, code: CODE.toLowerCase(), questions, answers, consentAt: "2026-11-01T01:00:00.000Z" }); });
  expect(result.ok).toBe(true);

  const after = ctx.clients.getClient(client.id);
  expect(after.assessmentCodes[0].status).toBe("submitted");
  expect(after.assessmentAnswers).toHaveLength(1);
  expect(after.assessmentAnswers[0]).toMatchObject({ code: CODE, consentAt: "2026-11-01T01:00:00.000Z" });
  expect(after.assessmentAnswers[0].answers).toHaveLength(questions.length);
  expect(after.status).toBe("assessment_scheduled");
  expect(ctx.drafts.getDraft(CODE)).toBeNull();
});

test("kode yang sudah punya draft TIDAK bisa dihapus; tanpa draft bisa", async () => {
  const { client, item } = await setupClientWithCode();
  const [q1] = firstQuestions(1);
  await act(async () => ctx.drafts.saveDraft({ code: CODE, clientId: client.id, answers: { [q1.id]: "1 - Hampir Tidak Pernah (10%)" } }));

  let result;
  await act(async () => { result = ctx.codes.deleteCode(ctx.clients.getClient(client.id), item); });
  expect(result).toEqual({ deleted: false, reason: "draft" });
  expect(ctx.clients.getClient(client.id).assessmentCodes).toHaveLength(1);

  await act(async () => ctx.drafts.removeDraft(CODE));
  await act(async () => { result = ctx.codes.deleteCode(ctx.clients.getClient(client.id), item); });
  expect(result).toEqual({ deleted: true });
});

test("hapus client permanen ikut menghapus draft kuesionernya", async () => {
  const { client } = await setupClientWithCode();
  const [q1] = firstQuestions(1);
  await act(async () => ctx.drafts.saveDraft({ code: CODE, clientId: client.id, answers: { [q1.id]: "0 - Tidak Pernah / Tidak Berlaku" } }));
  await act(async () => { ctx.del.deleteClientCascade(ctx.clients.getClient(client.id)); });
  expect(ctx.drafts.getDraft(CODE)).toBeNull();
});

test("kode kedaluwarsa TANPA draft ditolak", async () => {
  const { client } = await setupClientWithCode();
  const expiresAt = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  await act(async () => ctx.clients.updateClient(client.id, { assessmentCodes: [{ code: CODE, categoryId: "cat-001", name: "x", status: "issued", invoiceRequired: false, expiresAt }] }));
  await renderFill(`/assessment?code=${CODE}`);
  expect(container.querySelector('[data-testid="assessment-code-error"]')).toBeTruthy();
  expect(container.querySelector('[data-testid="assessment-question-form"]')).toBeFalsy();
});

test("kode kedaluwarsa DENGAN draft yang dimulai sebelum kedaluwarsa tetap bisa diselesaikan", async () => {
  const { client } = await setupClientWithCode();
  const [q1] = firstQuestions(1);
  const realNow = Date.now();
  const expiresAt = new Date(realNow - 24 * 3600 * 1000).toISOString(); // sudah lewat 1 hari
  await act(async () => ctx.clients.updateClient(client.id, { assessmentCodes: [{ code: CODE, categoryId: "cat-001", name: "x", status: "issued", invoiceRequired: false, expiresAt }] }));
  vi.setSystemTime(realNow - 48 * 3600 * 1000); // draft dimulai 2 hari lalu (sebelum kedaluwarsa)
  await act(async () => ctx.drafts.saveDraft({ code: CODE, clientId: client.id, answers: { [q1.id]: "4 - Sering (75%)" } }));
  vi.setSystemTime(realNow);
  await renderFill(`/assessment?code=${CODE}`);
  expect(container.querySelector('[data-testid="assessment-question-form"]')).toBeTruthy();
  expect(container.querySelector('[data-testid="assessment-resume-banner"]')).toBeTruthy();
});
