// @vitest-environment jsdom
// Section kuesioner: teks panduan + dokumen embed (kesepakatan) dan soal opsional (tidak menahan pengiriman).
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import AssessmentFill from "@/features/assessment/pages/AssessmentFill";
import { useClients } from "@/stores/clientsStore";
import { useCredits } from "@/stores/creditsStore";
import { useAssessments } from "@/stores/assessmentsStore";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };

const CODE = "KON-SEC001";
let ctx;
function Probe() {
  ctx = { clients: useClients(), credits: useCredits(), assessments: useAssessments() };
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
const byId = (id) => container.querySelector(`[data-testid="${id}"]`);

async function openForm() {
  await mount(null);
  const base = ctx.clients.clients.find((c) => !ctx.credits.getInvoicesForClient(c.id).some((i) => i.type === "assessment"));
  const item = { code: CODE, categoryId: "cat-006", name: "Konsultasi", status: "issued", invoiceRequired: false };
  await act(async () => ctx.clients.updateClient(base.id, { assessmentCodes: [item], assessmentAnswers: [], status: "assessment_scheduled" }));
  await mount(<MemoryRouter initialEntries={[`/assessment?code=${CODE}`]}><AssessmentFill /></MemoryRouter>);
  return base.id;
}

const typeInto = async (el, value) => {
  const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
};
const choose = async (questionId, optionText) => {
  const card = byId(`assessment-question-${questionId}`);
  const optionLabel = [...card.querySelectorAll("label")].find((l) => l.querySelector('button[role="radio"]') && l.textContent.trim() === optionText);
  await act(async () => optionLabel.querySelector('button[role="radio"]').click());
};

test("section kesepakatan menampilkan teks panduan dan dokumen PDF lokal (pdf.js, bukan iframe)", async () => {
  await openForm();
  const desc = byId("assessment-section-description-sec-kon-kesepakatan");
  expect(desc.textContent).toContain("kesepakatan dan peraturan");
  expect(byId("assessment-section-document-sec-kon-kesepakatan-pdf")).toBeTruthy();
  expect(byId("assessment-section-document-sec-kon-kesepakatan-open-link").getAttribute("href")).toBe("/documents/kesepakatan-asesmen.pdf");
  // PDF dirender di canvas, tidak memakai iframe
  expect(container.querySelectorAll("iframe")).toHaveLength(0);
});

test("soal opsional ditandai dan tidak menahan kirim; soal wajib tetap menahan", async () => {
  const clientId = await openForm();
  expect(byId("assessment-optional-kon-06")).toBeTruthy();
  expect(byId("assessment-optional-kon-01")).toBeNull();
  expect(byId("assessment-progress-label").textContent).toContain("0 / 5 Wajib Terisi");

  // Kirim kosong → ditolak, pesan menyebut soal wajib (5), bukan 6
  await act(async () => byId("assessment-submit-button").click());
  expect(byId("assessment-form-error").textContent).toContain("5 belum diisi");

  await typeInto(byId("assessment-answer-input-kon-01"), "Ibu Budi");
  await choose("kon-02", "Ibu");
  await choose("kon-03", "Saya telah membaca dan setuju dengan kesepakatan di atas");
  await typeInto(byId("assessment-answer-input-kon-04"), "Sulit berbicara");
  await choose("kon-05", "Tidak");
  expect(byId("assessment-progress-label").textContent).toContain("5 / 5 Wajib Terisi (100%)");

  await act(async () => byId("assessment-consent-checkbox").click());
  await act(async () => byId("assessment-submit-button").click());
  expect(byId("assessment-success-card")).toBeTruthy();

  const saved = ctx.clients.getClient(clientId).assessmentAnswers.find((a) => a.code === CODE);
  const optional = saved.answers.find((a) => a.questionId === "kon-06");
  expect(optional.answer).toBe(""); // bukan "undefined"
  expect(optional.score).toBeNull();
  expect(saved.answers.find((a) => a.questionId === "kon-01").answer).toBe("Ibu Budi");
});
