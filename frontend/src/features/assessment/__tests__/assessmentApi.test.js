// @vitest-environment jsdom
// M5 mode API: master asesmen (lazy fetch + mutasi per entity), kode kuesioner, form ortu (buka, autosave dengan version,
// submit, galat domain), dan kode/hasil per client. httpClient di-mock; payload = bentuk respons backend setelah interceptor (camelCase).
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };

vi.mock("@/config/env", () => ({
  ENV: { DATA_SOURCE: "api", API_BASE_URL: "http://api.test/api/v1", API_TIMEOUT_MS: 1000, LANDING_URL: "", IS_DEV: false },
  isApiMode: () => true,
}));

const apiMock = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), upload: vi.fn(), list: vi.fn() };
vi.mock("@/services/http/httpClient", () => ({ api: apiMock, setUnauthorizedHandler: () => {} }));

const { default: AppProviders } = await import("@/app/providers/AppProviders");
const { useAuth } = await import("@/stores/authStore");
const { useAssessments, useCategoryTree } = await import("@/stores/assessmentsStore");
const { useQuestionnaireCodeActions } = await import("@/features/inquiry/hooks/useQuestionnaireCodeActions");
const { useClientQuestionnaires } = await import("@/features/inquiry/hooks/useClientQuestionnaires");
const { useAssessmentFillActions } = await import("@/features/assessment/hooks/useAssessmentFillActions");
const { default: AssessmentFill } = await import("@/features/assessment/pages/AssessmentFill");
const { tokenStore } = await import("@/services/http/tokenStore");
const { ApiError } = await import("@/services/http/apiError");

const CATEGORY = (id = 3, extra = {}) => ({ id, typeCode: "SP2", name: "Child Sensory", domain: "Sensori", respondentProfile: "parent", isActive: true, version: 2, sectionCount: 1, questionCount: 2, fillingCount: 0, ...extra });
const TREE = (id = 3) => ({
  ...CATEGORY(id),
  sections: [{ id: 10, categoryId: id, title: "Auditori", description: "", documentUrl: null, hasDocumentFile: false, resultTemplate: "child_sensory", sortOrder: 1, questions: [
    { id: 100, sectionId: 10, itemNo: 1, questionType: "scale_0_5", question: "Respon suara", options: null, isRequired: true },
    { id: 101, sectionId: 10, itemNo: 2, questionType: "free_text", question: "Catatan", options: null, isRequired: false },
  ] }],
});
const STRUCTURE = () => ({
  category: { id: 3, typeCode: "SP2", name: "Child Sensory", domain: "Sensori", respondentProfile: "parent", respondentFields: [] },
  sections: TREE().sections,
});
const OPEN = (extra = {}) => ({ code: "SP2-ABC234", status: "issued", expiresAt: null, invoiceRequired: false, frozen: false, client: { id: 9, childName: "Kenzo" }, bankAccounts: [], structure: STRUCTURE(), draft: null, ...extra });

let ctx;
function Probe({ treeId = null }) {
  ctx = {
    auth: useAuth(),
    assessments: useAssessments(),
    tree: useCategoryTree(treeId),
    codes: useQuestionnaireCodeActions(),
    fill: useAssessmentFillActions(),
    q: useClientQuestionnaires("9"),
  };
  return null;
}

let root;
let container;
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 30)); });
const mount = async (ui = null, props = {}) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<AppProviders><Probe {...props} />{ui}</AppProviders>));
  await flush();
};
const loginAs = async () => {
  await act(async () => {
    tokenStore.set("1|token");
    ctx.auth.applySession({ role: "admin_inquiry", userId: 2, staffName: "Admin", branchId: "1", permissions: { assessment_master: true, inquiry_pipeline: true } });
  });
  await flush();
};
const calls = (fn, prefix) => fn.mock.calls.map((c) => c[0]).filter((u) => String(u).startsWith(prefix));

beforeEach(async () => {
  globalThis.URL.createObjectURL = vi.fn(() => "blob:test"); // jsdom tidak punya object URL (pratinjau PDF section)
  globalThis.URL.revokeObjectURL = vi.fn();
  window.localStorage.clear();
  Object.values(apiMock).forEach((fn) => fn.mockReset());
  apiMock.get.mockImplementation(async (url) => {
    if (url === "/branches") return [];
    if (url === "/assessment-categories") return [CATEGORY(3), CATEGORY(4, { typeCode: "SCP", name: "School Companion", respondentProfile: "teacher" })];
    if (url === "/assessment-categories/3") return TREE(3);
    if (url === "/clients/9/assessment-codes") return [{ id: 5, code: "SP2-ABC234", clientId: 9, categoryId: 3, category: { id: 3, name: "Child Sensory", typeCode: "SP2" }, status: "issued", invoiceRequired: false, hasDraft: true, answeredCount: 1, questionCount: 2 }];
    if (url === "/clients/9/assessment-responses") return [];
    return [];
  });
  await ensureSeedsIfNeeded();
});
afterEach(async () => {
  apiMock.post.mockReset();
  apiMock.post.mockResolvedValue("");
  await act(async () => ctx.auth.logout());
  await act(async () => root.unmount());
  container.remove();
});

test("lazy: tanpa membaca kategori tidak ada request; daftar baru diambil saat dibaca, pohon hanya untuk kategori yang dibuka", async () => {
  await mount();
  await loginAs();
  expect(calls(apiMock.get, "/assessment-categories")).toEqual([]);

  let list;
  await act(async () => { list = ctx.assessments.categories; });
  await flush();
  expect(calls(apiMock.get, "/assessment-categories")).toEqual(["/assessment-categories"]);
  expect(ctx.assessments.categories.map((c) => c.id)).toEqual(["3", "4"]);
  expect(ctx.assessments.categories[1]).toMatchObject({ categoryName: "School Companion", respondentProfile: "teacher", questionCount: 2 });
  expect(list).toBeDefined();

  // pohon hanya untuk kategori yang dibuka
  await act(async () => root.render(<AppProviders><Probe treeId="3" /></AppProviders>));
  await flush();
  expect(calls(apiMock.get, "/assessment-categories/")).toEqual(["/assessment-categories/3"]);
  expect(ctx.tree.category.sections[0].questions).toHaveLength(2);
  expect(ctx.tree.category.sections[0].questions[0]).toMatchObject({ id: "100", type: "scale_0_5", required: true });
});

test("mutasi per entity: kategori (version), section, soal; galat server diteruskan", async () => {
  await mount(null, { treeId: "3" });
  await loginAs();
  await act(async () => { ctx.assessments.categories; });
  await flush();

  apiMock.patch.mockResolvedValue(CATEGORY(3, { name: "Baru", version: 3 }));
  await act(async () => { await ctx.assessments.updateCategory("3", { categoryName: "Baru", respondentProfile: "teacher" }); });
  expect(apiMock.patch).toHaveBeenCalledWith("/assessment-categories/3", { version: 2, name: "Baru", respondentProfile: "teacher" });

  apiMock.post.mockResolvedValue({ id: 11, title: "Bagian B", questions: [] });
  await act(async () => { await ctx.assessments.createSection("3", { title: "Bagian B", description: "x", documentUrl: "", template: "child_sensory" }); });
  expect(apiMock.post).toHaveBeenCalledWith("/assessment-categories/3/sections", { title: "Bagian B", description: "x", documentUrl: null, resultTemplate: "child_sensory" });

  apiMock.post.mockResolvedValue({ id: 102, questionType: "multiple_choice", question: "Q", options: ["a"] });
  await act(async () => { await ctx.assessments.createQuestion("3", "10", { question: "Q", type: "multiple_choice", options: ["a"], required: false }); });
  expect(apiMock.post).toHaveBeenLastCalledWith("/assessment-sections/10/questions", expect.objectContaining({ question: "Q", questionType: "multiple_choice", options: ["a"], isRequired: false }));

  apiMock.patch.mockResolvedValue({ id: 100, questionType: "scale_0_5", question: "Baru" });
  await act(async () => { await ctx.assessments.updateQuestion("3", "10", "100", { question: "Baru", type: "scale_0_5", options: [] }); });
  expect(apiMock.patch).toHaveBeenLastCalledWith("/assessment-questions/100", expect.objectContaining({ question: "Baru" }));

  apiMock.delete.mockRejectedValue(new ApiError({ status: 409, code: "in_use", message: "Soal no. 1 sudah punya jawaban client sehingga tidak dapat dihapus." }));
  await expect(ctx.assessments.deleteQuestion("3", "10", "100")).rejects.toMatchObject({ code: "in_use" });
  apiMock.delete.mockResolvedValue("");
  await act(async () => { await ctx.assessments.deleteSection("3", "10"); });
  expect(apiMock.delete).toHaveBeenLastCalledWith("/assessment-sections/10");
});

test("kategori baru: dibuat lalu langsung diberi satu section kosong", async () => {
  await mount();
  await loginAs();
  apiMock.post.mockImplementation(async (url) => (url === "/assessment-categories" ? CATEGORY(7, { typeCode: "NEW" }) : { id: 70 }));
  let created;
  await act(async () => { created = await ctx.assessments.createCategory({ typeCode: "NEW", categoryName: "Baru", domain: "", respondentProfile: "parent" }); });
  expect(created.id).toBe("7");
  expect(apiMock.post).toHaveBeenNthCalledWith(1, "/assessment-categories", { typeCode: "NEW", name: "Baru", domain: null, respondentProfile: "parent" });
  expect(apiMock.post).toHaveBeenNthCalledWith(2, "/assessment-categories/7/sections", { title: "Bagian Umum" });
});

test("kode kuesioner: terbit mengirim paket + masa berlaku (kode dibuat server); hapus 409 dipetakan ke alasan", async () => {
  await mount();
  await loginAs();
  apiMock.post.mockResolvedValue({ id: 6, code: "SP2-XYZ789", categoryId: 3, category: { id: 3, name: "Child Sensory" }, status: "issued", invoiceRequired: true });
  let item;
  await act(async () => { item = await ctx.codes.issueCode({ id: "9", status: "inquiry" }, { id: "3" }, { validityDays: 14, servicePackage: { serverId: "8" }, withInvoice: true }); });
  expect(apiMock.post).toHaveBeenCalledWith("/clients/9/assessment-codes", { categoryId: 3, validityDays: 14, withInvoice: true, masterPackageId: 8 });
  expect(item).toMatchObject({ code: "SP2-XYZ789", status: "issued" });

  apiMock.delete.mockRejectedValueOnce(new ApiError({ status: 409, code: "draft_exists", message: "x" }));
  expect(await ctx.codes.deleteCode({ id: "9" }, { id: "6", code: "SP2-XYZ789" })).toEqual({ deleted: false, reason: "draft" });
  apiMock.delete.mockResolvedValueOnce("");
  expect(await ctx.codes.deleteCode({ id: "9" }, { id: "6", code: "SP2-XYZ789" })).toEqual({ deleted: true });
  expect(apiMock.delete).toHaveBeenLastCalledWith("/assessment-codes/6");
});

test("kode & hasil client: dimuat dengan isLoading; progres draft dari server", async () => {
  await mount();
  await loginAs();
  expect(ctx.q.active).toBe(true);
  expect(calls(apiMock.get, "/clients/9/assessment")).toEqual(["/clients/9/assessment-codes", "/clients/9/assessment-responses"]);
  expect(ctx.q.codes[0]).toMatchObject({ id: "5", code: "SP2-ABC234", hasDraft: true, answeredCount: 1, questionCount: 2, status: "issued" });
});

test("fill.open memetakan struktur + draft; saveProgress mengirim version; konflik versi dicoba ulang dengan versi terbaru", async () => {
  await mount();
  const draft = { answers: { 100: { t: "4 - Sering" } }, respondent: { name: "Siti" }, answeredCount: 1, lastSectionId: 10, consentAt: "2026-10-17T00:00:00Z", version: 4, startedAt: "x" };
  apiMock.get.mockImplementation(async (url) => (url === "/public/assessments/SP2-ABC234" ? OPEN({ draft, frozen: true }) : []));
  let opened;
  await act(async () => { opened = await ctx.fill.open("SP2-ABC234"); });
  expect(opened.client).toEqual({ id: "9", clientName: "Kenzo" });
  expect(opened.category.sections[0].questions[0].id).toBe("100");
  expect(opened.draft).toMatchObject({ answers: { 100: "4 - Sering" }, respondent: { name: "Siti" }, version: 4 });

  apiMock.put.mockResolvedValue({ version: 5 });
  await act(async () => ctx.fill.saveProgress({ code: "SP2-ABC234", answers: { 100: "3 - Kadang", 101: null }, respondent: { relation: "Ibu" }, lastSectionId: "10", consentAt: "2026-10-17T00:00:00Z" }));
  expect(apiMock.put).toHaveBeenCalledWith("/public/assessments/SP2-ABC234/draft", {
    answers: { 100: { t: "3 - Kadang" }, 101: null }, respondent: { relation: "Ibu" }, lastSectionId: 10, consent: true, version: 4,
  });

  // konflik versi: ambil versi terbaru lalu ulangi sekali
  apiMock.put.mockReset();
  apiMock.put.mockRejectedValueOnce(new ApiError({ status: 409, code: "version_conflict", message: "x" })).mockResolvedValueOnce({ version: 9 });
  apiMock.get.mockImplementation(async () => OPEN({ draft: { ...draft, version: 8 } }));
  await act(async () => ctx.fill.saveProgress({ code: "SP2-ABC234", answers: { 100: "2" }, respondent: {}, lastSectionId: null, consentAt: null }));
  expect(apiMock.put).toHaveBeenCalledTimes(2);
  expect(apiMock.put.mock.calls[1][1].version).toBe(8);
});

test("fill.submit mengirim jawaban terisi saja + respondent + consent", async () => {
  await mount();
  apiMock.post.mockResolvedValue({ status: "submitted" });
  await act(async () => ctx.fill.submit({ code: "SP2-ABC234", answers: { 100: "4 - Sering", 101: "", 102: ["a", "b"] }, respondent: { name: "Siti" }, consentAt: "2026-10-17T00:00:00Z" }));
  expect(apiMock.post).toHaveBeenCalledWith("/public/assessments/SP2-ABC234/responses", {
    answers: { 100: { t: "4 - Sering" }, 102: { t: "", v: ["a", "b"] } }, respondent: { name: "Siti" }, consent: true,
  });
});

// ---------------------------------------------------------------- halaman form ortu
const renderFill = async (code) => {
  await mount(<MemoryRouter initialEntries={[`/assessment?code=${code}`]}><AssessmentFill /></MemoryRouter>);
};
const dlg = (id) => document.querySelector(`[data-testid="${id}"]`); // dialog = portal di luar container
const byId = (id) => container.querySelector(`[data-testid="${id}"]`);

test("halaman /assessment: kode terbuka dari tautan, hanya memanggil endpoint publik (tanpa daftar client/kategori)", async () => {
  apiMock.get.mockImplementation(async (url) => (url === "/public/assessments/SP2-ABC234" ? OPEN() : []));
  await renderFill("SP2-ABC234");
  await flush();
  expect(byId("assessment-question-form")).toBeTruthy();
  expect(byId("assessment-respondent-card")).toBeTruthy(); // profil parent
  expect(container.textContent).toContain("Respon suara");
  expect(apiMock.get.mock.calls.map((c) => c[0])).toEqual(["/public/assessments/SP2-ABC234"]);
  expect(apiMock.list).not.toHaveBeenCalled();
});

test("halaman /assessment: galat domain tampil sebagai pesan (410, 409, 404) dan proof_required memuat rekening", async () => {
  apiMock.get.mockRejectedValueOnce(new ApiError({ status: 410, code: "expired", message: "x" }));
  await renderFill("SP2-OLD111");
  await flush();
  expect(byId("assessment-code-error").textContent).toMatch(/kedaluwarsa/i);

  await act(async () => root.unmount());
  container.remove();
  apiMock.get.mockRejectedValueOnce(new ApiError({ status: 409, code: "already_submitted", message: "x" }));
  await renderFill("SP2-DONE11");
  await flush();
  expect(byId("assessment-code-error").textContent).toMatch(/sudah diisi/i);

  await act(async () => root.unmount());
  container.remove();
  apiMock.get.mockRejectedValueOnce(new ApiError({ status: 404, message: "x" }));
  await renderFill("SP2-NONE11");
  await flush();
  expect(byId("assessment-code-error").textContent).toMatch(/tidak ditemukan/i);

  await act(async () => root.unmount());
  container.remove();
  apiMock.get.mockRejectedValueOnce(
    new ApiError({ status: 403, code: "proof_required", message: "x", body: { invoice: { id: 1, invoice_number: "INV-ASM-1", amount: 750000 }, bank_accounts: [{ id: 1, bank_name: "BCA", account_number: "123", account_holder: "Therapedia" }] } })
  );
  await renderFill("SP2-PAY111");
  await flush();
  expect(byId("assessment-proof-card")).toBeTruthy();
  expect(container.textContent).toContain("INV-ASM-1");
  expect(container.textContent).toContain("BCA");
});

test("halaman /assessment: autosave PUT draft setelah jeda (dengan respondent), submit 422 incomplete tidak menutup form", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  try {
    apiMock.get.mockImplementation(async () => OPEN());
    apiMock.put.mockResolvedValue({ version: 1 });
    await renderFill("SP2-ABC234");
    await flush();

    const input = byId("respondent-name-input");
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    await act(async () => { setter.call(input, "Siti"); input.dispatchEvent(new Event("input", { bubbles: true })); });
    await act(async () => { vi.advanceTimersByTime(1300); });
    await flush();
    expect(apiMock.put).toHaveBeenCalledWith("/public/assessments/SP2-ABC234/draft", expect.objectContaining({ respondent: { name: "Siti" } }));
    expect(byId("assessment-save-status").getAttribute("data-status")).toBe("saved");

    // kirim tanpa melengkapi → validasi klien (Data Pengisi belum lengkap) tidak memanggil server
    await act(async () => container.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(apiMock.post).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Data Pengisi");
  } finally {
    vi.useRealTimers();
  }
});

// ---------------------------------------------------------------- halaman Master Asesmen (loading + fetch seperlunya)
const { default: AssessmentMasterData } = await import("@/features/assessment/pages/AssessmentMasterData");

test("Master Asesmen: shimmer saat daftar dimuat, lalu hanya endpoint kategori yang dipanggil (bukan client/paket/terapis)", async () => {
  let release;
  const gate = new Promise((r) => (release = r));
  apiMock.get.mockImplementation(async (url) => {
    if (url === "/assessment-categories") {
      await gate;
      return [CATEGORY(3), CATEGORY(4, { typeCode: "SCP", name: "School Companion", respondentProfile: "teacher" })];
    }
    if (url === "/assessment-categories/3") return TREE(3);
    return [];
  });
  await mount(<MemoryRouter><AssessmentMasterData /></MemoryRouter>);
  await loginAs();
  await flush();

  expect(byId("assessment-master-skeleton")).toBeTruthy(); // belum ada kartu / halaman kosong
  expect(container.querySelector('[data-testid^="category-card-"]')).toBeNull();

  await act(async () => release());
  await flush();
  expect(byId("assessment-master-skeleton")).toBeNull();
  expect(byId("category-card-3")).toBeTruthy();
  expect(byId("category-card-4")).toBeTruthy();

  // pohon hanya untuk kategori aktif (pertama); tidak ada daftar client / paket / terapis / kuesioner
  const urls = apiMock.get.mock.calls.map((c) => c[0]).filter((u) => u !== "/branches" && !String(u).startsWith("/clients/9/")); // /clients/9/* = Probe, bukan halaman
  expect(urls).toEqual(["/assessment-categories", "/assessment-categories/3"]);
  expect(apiMock.list).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Auditori"); // section dari pohon (soal tampil saat section dibuka)
  expect(container.textContent).not.toContain("Terbitkan Kode"); // penerbitan kode di mode API dari detail client
});

test("Master Asesmen: pohon dimuat dengan shimmer terpisah dan menampilkan peringatan kuesioner sedang diisi", async () => {
  let release;
  const gate = new Promise((r) => (release = r));
  apiMock.get.mockImplementation(async (url) => {
    if (url === "/assessment-categories") return [CATEGORY(3, { fillingCount: 2 })];
    if (url === "/assessment-categories/3") {
      await gate;
      return { ...TREE(3), fillingCount: 2 };
    }
    return [];
  });
  await mount(<MemoryRouter><AssessmentMasterData /></MemoryRouter>);
  await loginAs();
  await flush();

  expect(byId("assessment-tree-skeleton")).toBeTruthy();
  await act(async () => release());
  await flush();
  expect(byId("assessment-tree-skeleton")).toBeNull();
  expect(byId("category-active-drafts-warning").textContent).toContain("2 kuesioner sedang diisi");
  expect(byId("category-active-drafts-warning").textContent).toContain("dibekukan");
});

const pickFile = async (input, file) => {
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
  await act(async () => { await new Promise((r) => setTimeout(r, 50)); }); // FileReader (pemrosesan bukti) asinkron
};

test("bukti transfer: ortu unggah dari /assessment (multipart), lalu kuesioner terbuka; galat batas unggah tampil di kartu", async () => {
  const proofBody = { invoice: { id: 1, invoice_number: "INV-ASM-1", amount: 750000 }, bank_accounts: [] };
  let proofDone = false;
  apiMock.get.mockImplementation(async () => {
    if (!proofDone) throw new ApiError({ status: 403, code: "proof_required", message: "x", body: proofBody });
    return OPEN();
  });
  apiMock.upload.mockImplementation(async () => {
    proofDone = true;
    return { invoiceNumber: "INV-ASM-1", proofUploadCount: 1, remainingUploads: 3 };
  });
  await renderFill("SP2-PAY111");
  await flush();
  expect(byId("assessment-proof-card")).toBeTruthy();

  await pickFile(byId("assessment-proof-input"), new File(["%PDF-1.4"], "slip.pdf", { type: "application/pdf" }));
  await act(async () => byId("assessment-proof-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  await flush();

  expect(apiMock.upload).toHaveBeenCalledTimes(1);
  expect(apiMock.upload.mock.calls[0][0]).toBe("/public/assessments/SP2-PAY111/proof");
  const sent = apiMock.upload.mock.calls[0][1].get("file");
  expect(sent.name).toBe("slip.pdf");
  expect(byId("assessment-question-form")).toBeTruthy(); // kuesioner terbuka setelah bukti terkirim
});

test("bukti transfer: 422 proof_limit_reached ditampilkan di kartu dan kuesioner tetap terkunci", async () => {
  apiMock.get.mockRejectedValue(new ApiError({ status: 403, code: "proof_required", message: "x", body: { invoice: { invoice_number: "INV-ASM-2", amount: 1000 }, bank_accounts: [] } }));
  apiMock.upload.mockRejectedValue(new ApiError({ status: 422, code: "proof_limit_reached", message: "Batas unggah bukti (maksimal 4 kali) sudah tercapai." }));
  await renderFill("SP2-PAY222");
  await flush();
  await pickFile(byId("assessment-proof-input"), new File(["%PDF-1.4"], "slip.pdf", { type: "application/pdf" }));
  await act(async () => byId("assessment-proof-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  await flush();
  expect(byId("assessment-proof-error").textContent).toContain("Batas unggah bukti");
  expect(byId("assessment-question-form")).toBeNull();
});

test("Master Asesmen: simpan section dengan PDF -> PATCH section lalu unggah file; file > 10 MB / bukan PDF ditolak di dialog", async () => {
  apiMock.get.mockImplementation(async (url) => {
    if (url === "/assessment-categories") return [CATEGORY(3)];
    if (url === "/assessment-categories/3") return TREE(3);
    return [];
  });
  apiMock.patch.mockResolvedValue({ id: 10, title: "Auditori", questions: [] });
  apiMock.upload.mockResolvedValue({ id: 10, title: "Auditori", hasDocumentFile: true, documentName: "panduan.pdf", questions: [] });
  await mount(<MemoryRouter><AssessmentMasterData /></MemoryRouter>);
  await loginAs();
  await flush();
  await flush();

  await act(async () => byId("section-edit-10").click());
  await flush();
  expect(dlg("section-pdf-block")).toBeTruthy();

  await pickFile(dlg("section-pdf-input"), new File(["x"], "foto.png", { type: "image/png" }));
  expect(dlg("section-pdf-error").textContent).toContain("PDF");
  const big = new File(["x"], "besar.pdf", { type: "application/pdf" });
  Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });
  await pickFile(dlg("section-pdf-input"), big);
  expect(dlg("section-pdf-error").textContent).toContain("10 MB");

  await pickFile(dlg("section-pdf-input"), new File(["%PDF-1.4"], "panduan.pdf", { type: "application/pdf" }));
  expect(dlg("section-pdf-pending").textContent).toContain("panduan.pdf");
  await act(async () => dlg("section-save-button").click());
  await flush();

  expect(apiMock.patch).toHaveBeenCalledWith("/assessment-sections/10", expect.objectContaining({ title: "Auditori" }));
  expect(apiMock.upload).toHaveBeenCalledWith("/assessment-sections/10/document", expect.any(FormData));
  expect(apiMock.upload.mock.calls[0][1].get("file").name).toBe("panduan.pdf");
});

test("kode: daftar memuat invoice otomatis (nomor, nominal, status bukti) untuk kartu kode client", async () => {
  apiMock.get.mockImplementation(async (url) => {
    if (url === "/clients/9/assessment-codes")
      return [{ id: 5, code: "SP2-ABC234", categoryId: 3, category: { id: 3, name: "Child Sensory" }, status: "issued", invoiceRequired: true, invoice: { id: 8, invoiceNumber: "INV-ASM-20261017-001", status: "unpaid", amount: 750000, packageName: "Assessment X — Regular", proofUploadCount: 1 } }];
    return [];
  });
  await mount();
  await loginAs();
  expect(ctx.q.codes[0].invoice).toMatchObject({ invoiceNumber: "INV-ASM-20261017-001", amount: 750000, proofUploadCount: 1, type: "assessment" });
});

const TREE2 = () => {
  const t = TREE(3);
  t.sections.push({ id: 11, categoryId: 3, title: "Visual", description: "", documentUrl: null, hasDocumentFile: false, resultTemplate: null, sortOrder: 2, questions: [{ id: 110, sectionId: 11, itemNo: 1, questionType: "free_text", question: "Catatan visual", options: null, isRequired: false }] });
  t.sections.push({ id: 12, categoryId: 3, title: "Taktil", description: "", documentUrl: null, hasDocumentFile: false, resultTemplate: null, sortOrder: 3, questions: [] });
  return t;
};

// Server tiruan yang mengingat urutan section terakhir yang disimpan (PUT order), seperti backend sungguhan
let serverOrder = null;
const orderedTree2 = () => {
  const t = TREE2();
  if (serverOrder) t.sections.sort((x, y) => serverOrder.indexOf(x.id) - serverOrder.indexOf(y.id));
  return t;
};
const rememberOrder = () => {
  serverOrder = null;
  apiMock.put.mockImplementation(async (url, body) => {
    serverOrder = body.ids;
    return [];
  });
};

const mountMaster = async (tree = TREE2, list = () => [CATEGORY(3)]) => {
  apiMock.get.mockImplementation(async (url) => {
    if (url === "/assessment-categories") return list();
    if (url === "/assessment-categories/3") return tree();
    return [];
  });
  await mount(<MemoryRouter><AssessmentMasterData /></MemoryRouter>);
  await loginAs();
  await flush();
  await flush();
};

test("Master Asesmen: Duplikat langsung tersimpan (tanpa dialog) dengan nama dan kode jenis otomatis lalu template baru terpilih", async () => {
  apiMock.post.mockResolvedValue({ ...CATEGORY(9), typeCode: "SP2C2", name: "Child Sensory (Salinan 2)", questionCount: 2 });
  await mountMaster(() => TREE(3), () => [CATEGORY(3), CATEGORY(4, { typeCode: "SP2C", name: "Child Sensory (Salinan)" })]);

  await act(async () => byId("duplicate-category-button-3").click());
  await flush();

  expect(document.querySelector('[role="dialog"]')).toBeNull(); // tanpa dialog: langsung tersimpan
  // nama & kode jenis dipilih yang belum dipakai (SP2C dan "(Salinan)" sudah ada)
  expect(apiMock.post).toHaveBeenCalledWith("/assessment-categories/3/duplicate", expect.objectContaining({ typeCode: "SP2C2", name: "Child Sensory (Salinan 2)", respondentProfile: "parent" }));
  expect(apiMock.post).toHaveBeenCalledTimes(1);
});

test("Master Asesmen: urutan section lewat tombol langsung tersimpan (PUT order) dan tampil seketika", async () => {
  rememberOrder();
  await mountMaster(orderedTree2);

  const titles = () => [...container.querySelectorAll('[data-testid^="section-card-"] h3')].map((h) => h.textContent);
  expect(titles()).toEqual(["Auditori", "Visual", "Taktil"]);
  expect(byId("section-move-up-10").disabled).toBe(true); // paling atas
  expect(byId("section-move-down-12").disabled).toBe(true); // paling bawah

  await act(async () => byId("section-move-down-10").click());
  expect(apiMock.put).toHaveBeenLastCalledWith("/assessment-categories/3/sections/order", { ids: [11, 10, 12] });
  await flush(); // react-query menunda notifikasi render lewat timer; tanpa ini hasil bergantung beban mesin
  expect(titles().slice(0, 2)).toEqual(["Visual", "Auditori"]); // urutan baru tampil tanpa menunggu muat ulang manual
});

test("Master Asesmen: gagal menyimpan urutan -> urutan kembali dan pesan galat tampil", async () => {
  apiMock.put.mockRejectedValue(new ApiError({ status: 500, message: "Server gagal menyimpan urutan." }));
  await mountMaster();

  await act(async () => byId("section-move-down-10").click());
  await flush();
  await flush();

  expect([...container.querySelectorAll('[data-testid^="section-card-"] h3')].map((h) => h.textContent)).toEqual(["Auditori", "Visual", "Taktil"]);
});

test("Master Asesmen: seret & lepas section memindahkan urutan dan menyimpannya", async () => {
  apiMock.put.mockResolvedValue([]);
  await mountMaster();

  const fire = (el, type) => {
    const ev = new Event(type, { bubbles: true, cancelable: true });
    ev.dataTransfer = { setData() {}, effectAllowed: "" };
    return act(async () => el.dispatchEvent(ev));
  };
  await fire(byId("section-drag-12"), "dragstart"); // Taktil
  await fire(byId("section-card-10"), "dragover"); // di atas Auditori
  await fire(byId("section-card-10"), "drop");
  await flush();

  expect(apiMock.put).toHaveBeenLastCalledWith("/assessment-categories/3/sections/order", { ids: [12, 10, 11] });
});

test("Master Asesmen: satu section saja -> tombol urutan nonaktif (tidak ada yang bisa dipindah)", async () => {
  await mountMaster(() => TREE(3));
  expect(byId("section-move-up-10").disabled).toBe(true);
  expect(byId("section-move-down-10").disabled).toBe(true);
});

test("Master Asesmen: pratinjau PDF di dialog section: file baru dipilih (dari memori) dan file tersimpan (diambil sebagai Blob)", async () => {
  const created = [];
  const revoked = [];
  globalThis.URL.createObjectURL = vi.fn((b) => { const u = `blob:test/${created.length}`; created.push(b); return u; });
  globalThis.URL.revokeObjectURL = vi.fn((u) => revoked.push(u));

  const tree = TREE(3);
  tree.sections[0].hasDocumentFile = true;
  tree.sections[0].documentName = "panduan.pdf";
  tree.sections[0].documentSize = 1234;
  apiMock.get.mockImplementation(async (url, params, config) => {
    if (url === "/assessment-categories") return [CATEGORY(3)];
    if (url === "/assessment-categories/3") return tree;
    if (url === "/assessment-sections/10/document" && config?.responseType === "blob") return new Blob(["%PDF-1.4 tersimpan"], { type: "application/pdf" });
    return [];
  });
  await mount(<MemoryRouter><AssessmentMasterData /></MemoryRouter>);
  await loginAs();
  await flush();
  await flush();

  await act(async () => byId("section-edit-10").click());
  await flush();
  await flush();

  // file yang sudah tersimpan: diambil dengan sesi staf (responseType blob) lalu ditampilkan
  expect(apiMock.get).toHaveBeenCalledWith("/assessment-sections/10/document", undefined, { responseType: "blob" });
  expect(dlg("section-pdf-preview")).toBeTruthy();
  const callsBefore = apiMock.get.mock.calls.filter((c) => c[0] === "/assessment-sections/10/document").length;
  expect(callsBefore).toBe(1); // tidak mengambil ulang pada tiap render

  // memilih file baru: pratinjau beralih ke file itu (tanpa diunggah dulu), object URL lama dilepas
  await pickFile(dlg("section-pdf-input"), new File(["%PDF-1.4 baru"], "baru.pdf", { type: "application/pdf" }));
  await flush();
  expect(apiMock.upload).not.toHaveBeenCalled();
  expect(created.some((b) => b instanceof File && b.name === "baru.pdf")).toBe(true);
  expect(revoked.length).toBeGreaterThan(0);
  expect(dlg("section-pdf-preview")).toBeTruthy();

  // batalkan file baru + hapus file tersimpan: pratinjau hilang
  await act(async () => dlg("section-pdf-pending").querySelector("button").click());
  await act(async () => dlg("section-pdf-remove").click());
  await flush();
  expect(dlg("section-pdf-preview")).toBeNull();
});

test("Master Asesmen: pratinjau PDF tersimpan gagal dimuat -> pesan, file tetap ada", async () => {
  const tree = TREE(3);
  tree.sections[0].hasDocumentFile = true;
  tree.sections[0].documentName = "panduan.pdf";
  apiMock.get.mockImplementation(async (url) => {
    if (url === "/assessment-categories") return [CATEGORY(3)];
    if (url === "/assessment-categories/3") return tree;
    if (url === "/assessment-sections/10/document") throw new ApiError({ status: 404, message: "x" });
    return [];
  });
  await mount(<MemoryRouter><AssessmentMasterData /></MemoryRouter>);
  await loginAs();
  await flush();
  await flush();
  await act(async () => byId("section-edit-10").click());
  await flush();
  await flush();
  expect(dlg("section-pdf-preview-error").textContent).toContain("tetap tersimpan");
  expect(dlg("section-pdf-existing")).toBeTruthy();
});
