// @vitest-environment jsdom
// Langkah bawaan "Data Pengisi": muncul sesuai profil kategori, ikut simpan otomatis, dipulihkan, memblokir kirim, tersimpan di hasil.
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import AppProviders from "@/app/providers/AppProviders";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";
import AssessmentFill from "@/features/assessment/pages/AssessmentFill";
import { useAssessmentFillActions } from "@/features/assessment/hooks/useAssessmentFillActions";
import { useAssessmentDrafts } from "@/stores/assessmentDraftsStore";
import { useAssessments } from "@/stores/assessmentsStore";
import { useClients } from "@/stores/clientsStore";
import { useCredits } from "@/stores/creditsStore";
import { buildSections, questionsOf } from "@/features/assessment/components/fill/fillSections";
import { listQuestionnaireResults } from "@/domain/assessment";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };

let ctx;
function Probe() {
  ctx = { fill: useAssessmentFillActions(), drafts: useAssessmentDrafts(), clients: useClients(), credits: useCredits(), assessments: useAssessments() };
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
const renderFill = (code) => mount(<MemoryRouter initialEntries={[`/assessment?code=${code}`]}><AssessmentFill /></MemoryRouter>);
const byId = (id) => container.querySelector(`[data-testid="${id}"]`);

// Client uji dengan kode gratis pada kategori tertentu
async function setupCode(categoryId, code) {
  await mount(null);
  const base = ctx.clients.clients.find((c) => !ctx.credits.getInvoicesForClient(c.id).some((i) => i.type === "assessment"));
  await act(async () => ctx.clients.updateClient(base.id, { assessmentCodes: [{ code, categoryId, name: "Uji", status: "issued", invoiceRequired: false }], assessmentAnswers: [], status: "assessment_scheduled" }));
  return ctx.clients.getClient(base.id);
}

const type = async (el, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  await act(async () => {
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

test("profil orang tua: kartu Data Pengisi tampil, field wajib memblokir kirim", async () => {
  await setupCode("cat-001", "TST-RESP01");
  await renderFill("TST-RESP01");

  expect(byId("assessment-respondent-card")).toBeTruthy();
  expect(byId("respondent-name-input")).toBeTruthy();
  expect(byId("respondent-school-input")).toBeNull(); // sekolah hanya untuk profil guru

  await act(async () => container.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(container.textContent).toContain("Mohon lengkapi Data Pengisi");
  expect(byId("respondent-name-error")).toBeTruthy();
});

test("profil guru: sekolah dan kelas ditampilkan", async () => {
  await setupCode("cat-002", "TST-RESP02");
  await renderFill("TST-RESP02");
  expect(byId("respondent-school-input")).toBeTruthy();
  expect(byId("respondent-class-input")).toBeTruthy();
});

test("profil none (KON/TDL): tanpa kartu Data Pengisi", async () => {
  await setupCode("cat-007", "TST-RESP03");
  await renderFill("TST-RESP03");
  expect(byId("assessment-question-form")).toBeTruthy();
  expect(byId("assessment-respondent-card")).toBeNull();
});

test("Data Pengisi ikut simpan otomatis ke draft dan dipulihkan saat dibuka lagi", async () => {
  await setupCode("cat-001", "TST-RESP04");
  await renderFill("TST-RESP04");

  await type(byId("respondent-name-input"), "Siti Aminah");
  await act(async () => byId("respondent-relation-option-Ibu").click());
  await act(async () => { vi.advanceTimersByTime(1200); });

  expect(ctx.drafts.getDraft("TST-RESP04").respondent).toEqual({ name: "Siti Aminah", relation: "Ibu" });

  // buka ulang halaman: nilai dipulihkan
  await act(async () => root.render(null));
  await renderFill("TST-RESP04");
  expect(byId("respondent-name-input").value).toBe("Siti Aminah");
  expect(byId("respondent-relation-option-Ibu").getAttribute("aria-pressed")).toBe("true");
});

test("submit menyimpan respondent di hasil dan menyaring key di luar profil", async () => {
  const client = await setupCode("cat-001", "TST-RESP05");
  const category = ctx.assessments.getCategory("cat-001");
  const questions = questionsOf(buildSections(category));
  const answers = Object.fromEntries(questions.map((q) => [q.id, "3 - Kadang-kadang (50%)"]));

  await act(async () => ctx.fill.submit({
    client: ctx.clients.getClient(client.id), category, code: "TST-RESP05", questions, answers,
    respondent: { name: " Siti ", relation: "Ibu", school: "Tidak dipakai" }, consentAt: new Date().toISOString(),
  }));

  const result = listQuestionnaireResults(ctx.clients.getClient(client.id)).find((r) => r.code === "TST-RESP05");
  expect(result.entry.respondent).toEqual({ name: "Siti", relation: "Ibu" });
});

test("seed demo: hasil lama menyertakan respondent sesuai profil", async () => {
  await mount(null);
  const kenzo = ctx.clients.getClient("c-009");
  expect(kenzo.assessmentAnswers[0].respondent.name).toBe(kenzo.parentName);
  const alea = ctx.clients.getClient("c-026").assessmentAnswers.find((a) => a.categoryId === "cat-002");
  expect(alea.respondent.school).toBeTruthy();
  expect(alea.respondent.class).toBeTruthy();
  expect(ctx.assessments.getCategory("cat-002").respondentProfile).toBe("teacher");
});

test('hubungan "Lainnya": kolom isian muncul, yang tersimpan teks yang diketik (mis. Paman), kosong menahan kirim, dan dipulihkan', async () => {
  await setupCode("cat-001", "TST-RESP06");
  await renderFill("TST-RESP06");

  expect(byId("respondent-relation-other-input")).toBeNull(); // belum memilih Lainnya
  await type(byId("respondent-name-input"), "Dodi");
  await act(async () => byId("respondent-relation-option-Lainnya").click());
  expect(byId("respondent-relation-other-input")).toBeTruthy();
  expect(byId("respondent-relation-option-Lainnya").getAttribute("aria-pressed")).toBe("true");

  // belum diketik: kirim ditahan dengan pesan "Sebutkan hubungan"
  await act(async () => container.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(byId("respondent-relation-error").textContent).toContain("Sebutkan");

  await type(byId("respondent-relation-other-input"), "Paman");
  await act(async () => { vi.advanceTimersByTime(1200); });
  expect(ctx.drafts.getDraft("TST-RESP06").respondent).toEqual({ name: "Dodi", relation: "Paman" }); // bukan kata "Lainnya"

  // pindah ke pilihan baku lalu kembali ke Lainnya
  await act(async () => byId("respondent-relation-option-Ibu").click());
  expect(byId("respondent-relation-other-input")).toBeNull();
  await act(async () => byId("respondent-relation-option-Lainnya").click());
  expect(byId("respondent-relation-other-input").value).toBe(""); // dikosongkan sampai diketik lagi

  // buka ulang dengan draft "Paman": otomatis mode Lainnya dengan teks terisi
  await type(byId("respondent-relation-other-input"), "Paman");
  await act(async () => { vi.advanceTimersByTime(1200); });
  await act(async () => root.render(null));
  await renderFill("TST-RESP06");
  expect(byId("respondent-relation-other-input").value).toBe("Paman");
  expect(byId("respondent-relation-option-Lainnya").getAttribute("aria-pressed")).toBe("true");
});

test('peran guru "Lainnya" juga bisa diisi sendiri (mis. Kepala sekolah)', async () => {
  await setupCode("cat-002", "TST-RESP07");
  await renderFill("TST-RESP07");
  await act(async () => byId("respondent-relation-option-Lainnya").click());
  await type(byId("respondent-relation-other-input"), "Kepala sekolah");
  await act(async () => { vi.advanceTimersByTime(1200); });
  expect(ctx.drafts.getDraft("TST-RESP07").respondent.relation).toBe("Kepala sekolah");
});
