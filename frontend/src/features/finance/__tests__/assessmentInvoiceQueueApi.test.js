// @vitest-environment jsdom
// Finance mode API: "Tagihan Menunggu Pembayaran" untuk invoice ASESMEN (daftar server + cari, unggah bukti, lihat bukti, Tandai Lunas).
// httpClient di-mock; payload = bentuk respons backend setelah interceptor (camelCase).
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
const { default: FinancePortal } = await import("@/features/finance/pages/FinancePortal");
const { tokenStore } = await import("@/services/http/tokenStore");
const { ApiError } = await import("@/services/http/apiError");
const { toast } = await import("sonner");

const INV = (id, extra = {}) => ({
  id, invoiceNumber: `INV-ASM-20261017-00${id}`, invoiceType: "assessment", typeCode: "ASM", status: "unpaid", packageName: "Assessment SP2 — Paket Asesmen",
  credits: 0, amount: 500000, grossAmount: 500000, isRenewal: false, issuedAt: "2026-10-17T05:00:00+00:00", paidAt: null, proofUploadCount: 0, hasProof: false,
  assessmentCode: "SP2-ABC234", client: { id: 9, clientCode: "KO-00001", childName: "Kenzo Wirawan", parentName: "Hendra" }, branchId: 2, branch: { id: 2, name: "Citraland" }, version: 3, ...extra,
});
const META = (total = 1) => ({ total, page: 1, perPage: 10, lastPage: Math.max(1, Math.ceil(total / 10)) });

let ctx;
function Probe() {
  ctx = { auth: useAuth() };
  return null;
}

let root;
let container;
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });
const byId = (id) => container.querySelector(`[data-testid="${id}"]`);
const portal = (id) => document.querySelector(`[data-testid="${id}"]`);

const mount = async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<AppProviders><Probe /><MemoryRouter><FinancePortal /></MemoryRouter></AppProviders>));
  await flush();
};
const loginFinance = async () => {
  await act(async () => {
    tokenStore.set("1|token");
    ctx.auth.applySession({ role: "finance", userId: 5, staffName: "Finance", branchId: null, permissions: { finance: true } });
  });
  await flush();
  await flush();
};
const invoiceCalls = () => apiMock.list.mock.calls.filter((c) => c[0] === "/invoices").map((c) => c[1]);
const pickFile = async (input, file) => {
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
  await act(async () => { await new Promise((r) => setTimeout(r, 60)); });
};

beforeEach(async () => {
  globalThis.URL.createObjectURL = vi.fn(() => "blob:proof");
  globalThis.URL.revokeObjectURL = vi.fn();
  window.localStorage.clear();
  Object.values(apiMock).forEach((fn) => fn.mockReset());
  apiMock.post.mockResolvedValue("");
  apiMock.get.mockResolvedValue([]);
  apiMock.list.mockImplementation(async (url) => (url === "/invoices" ? { items: [INV(1), INV(2, { invoiceNumber: "INV-ASM-20261017-002", proofUploadCount: 1, hasProof: true })], meta: META(2) } : { items: [], meta: META(0) }));
  await ensureSeedsIfNeeded();
});
afterEach(async () => {
  apiMock.post.mockReset();
  apiMock.post.mockResolvedValue("");
  await act(async () => ctx.auth.logout());
  await act(async () => root.unmount());
  container.remove();
});

test("antrean: shimmer saat memuat, lalu hanya invoice asesmen belum lunas dari server (10/halaman)", async () => {
  let release;
  const gate = new Promise((r) => (release = r));
  apiMock.list.mockImplementation(async (url) => {
    if (url === "/invoices") {
      await gate;
      return { items: [INV(1), INV(2, { proofUploadCount: 1, hasProof: true })], meta: META(2) };
    }
    return { items: [], meta: META(0) };
  });
  await mount();
  await loginFinance();

  expect(byId("verification-skeleton")).toBeTruthy(); // bukan "Tidak ada tagihan" sebelum data tiba
  expect(container.textContent).not.toContain("Tidak Ada Tagihan Menunggu");

  await act(async () => release());
  await flush();
  expect(byId("verification-skeleton")).toBeNull();
  expect(container.textContent).toContain("INV-ASM-20261017-001");
  expect(container.textContent).toContain("Kenzo Wirawan");
  expect(byId("pending-count").textContent).toBe("2");
  expect(invoiceCalls()[0]).toMatchObject({ status: ["unpaid"], type: "assessment", page: 1, perPage: 10 });
  // satu-satunya endpoint invoice yang dipanggil (tidak ada daftar "semua tagihan" di tab lain)
  expect(new Set(apiMock.list.mock.calls.map((c) => c[0]).filter((u) => u.startsWith("/invoices")))).toEqual(new Set(["/invoices"]));
  // tombol hapus invoice tidak tampil (menyusul di modul Finance); upload hanya untuk yang belum punya bukti
  expect(byId("delete-pending-invoice-1")).toBeNull();
  expect(byId("upload-proof-1")).toBeTruthy();
  expect(byId("upload-proof-2")).toBeNull();
  expect(byId("view-proof-2")).toBeTruthy();
});

test("cari: dikirim ke server setelah jeda (q), halaman kembali ke 1", async () => {
  await mount();
  await loginFinance();
  const input = document.querySelector('[data-testid="finance-search"], input[type="search"], input[placeholder*="Cari"]');
  expect(input).toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  await act(async () => { setter.call(input, "kenz"); input.dispatchEvent(new Event("input", { bubbles: true })); });
  // rantai jeda: kotak cari (250 ms) -> hook (300 ms); tiap tahap butuh act tersendiri agar timer berikutnya terpasang
  for (let i = 0; i < 4; i += 1) await act(async () => { await new Promise((r) => setTimeout(r, 330)); });
  await flush();
  expect(invoiceCalls().some((p) => p.q === "kenz" && p.page === 1)).toBe(true);
});

test("unggah bukti oleh Finance: multipart ke /invoices/{id}/proof lalu daftar disegarkan; galat ditampilkan", async () => {
  await mount();
  await loginFinance();
  apiMock.upload.mockResolvedValue(INV(1, { proofUploadCount: 1, hasProof: true }));
  const before = invoiceCalls().length;

  await pickFile(byId("upload-proof-1-input"), new File(["%PDF-1.4 mutasi"], "mutasi.pdf", { type: "application/pdf" }));
  await flush();

  expect(apiMock.upload).toHaveBeenCalledTimes(1);
  expect(apiMock.upload.mock.calls[0][0]).toBe("/invoices/1/proof");
  expect(apiMock.upload.mock.calls[0][1].get("file").name).toBe("mutasi.pdf");
  expect(invoiceCalls().length).toBeGreaterThan(before); // disegarkan
  expect(apiMock.post).not.toHaveBeenCalledWith(expect.stringContaining("/verify"), expect.anything()); // unggah tidak mengubah status
});

test("lihat bukti: file terbaru diambil sebagai Blob (bearer) lalu pratinjau terbuka", async () => {
  await mount();
  await loginFinance();
  apiMock.get.mockImplementation(async (url, params, config) => {
    if (url === "/invoices/2") return { ...INV(2, { proofUploadCount: 2, hasProof: true }), proofs: [{ id: 5, fileName: "lama.jpg", mimeType: "image/jpeg", fileSize: 10, uploadedByType: "client", uploadedAt: "2026-10-17T06:00:00Z" }, { id: 6, fileName: "slip.pdf", mimeType: "application/pdf", fileSize: 20, uploadedByType: "user", uploadedAt: "2026-10-17T07:00:00Z" }] };
    if (url === "/invoices/2/proofs/6/file" && config?.responseType === "blob") return new Blob(["%PDF-1.4"], { type: "application/pdf" });
    return [];
  });

  await act(async () => byId("view-proof-2").click());
  await flush();

  expect(apiMock.get).toHaveBeenCalledWith("/invoices/2/proofs/6/file", undefined, { responseType: "blob" }); // bukti TERBARU
  expect(portal("proof-viewer-iframe") || document.querySelector("[role=dialog] iframe")).toBeTruthy();
  expect(document.querySelector("[role=dialog]").textContent).toContain("INV-ASM-20261017-002");
});

test("Tandai Lunas: POST verify dengan version, daftar disegarkan; galat server (409 versi / 422 not_supported_yet) jadi pesan, bukan klaim berhasil", async () => {
  const success = vi.spyOn(toast, "success").mockImplementation(() => {});
  const failure = vi.spyOn(toast, "error").mockImplementation(() => {});
  await mount();
  await loginFinance();
  const markButton = () => [...container.querySelectorAll("button")].find((b) => b.textContent.trim() === "Tandai Lunas");

  await act(async () => markButton().click());
  await flush();
  expect(apiMock.post).toHaveBeenCalledWith("/invoices/1/verify", { version: 3 });
  expect(success).toHaveBeenCalledWith(expect.stringContaining("ditandai lunas"));

  apiMock.post.mockRejectedValueOnce(new ApiError({ status: 409, code: "version_conflict", message: "Data sudah diubah oleh pengguna lain. Muat ulang lalu coba lagi." }));
  const before = invoiceCalls().length;
  await act(async () => markButton().click());
  await flush();
  expect(failure).toHaveBeenCalledWith(expect.stringContaining("Data sudah diubah oleh pengguna lain"));
  expect(success).toHaveBeenCalledTimes(1); // yang gagal tidak mengklaim berhasil
  expect(invoiceCalls().length).toBe(before); // dan tidak menyegarkan daftar

  apiMock.post.mockRejectedValueOnce(new ApiError({ status: 422, code: "not_supported_yet", message: "Tandai lunas untuk invoice paket dan cuti tersedia di modul Finance berikutnya." }));
  await act(async () => markButton().click());
  await flush();
  expect(failure).toHaveBeenLastCalledWith(expect.stringContaining("modul Finance berikutnya"));
  success.mockRestore();
  failure.mockRestore();
});

test("tab Finance yang belum tersambung API ditandai 'Sedang dalam pengembangan' (bukan data dummy); tombol terbit/renewal dinonaktifkan", async () => {
  await mount();
  for (const tab of ["renewal", "billing", "history", "ledger", "leftover", "leave"]) {
    expect(document.querySelector(`[data-testid="dev-badge-${tab}"]`), tab).toBeTruthy();
  }
  expect(document.querySelector('[data-testid="dev-badge-packages"]')).toBeNull();
  expect(document.querySelector('[data-testid="issue-invoice-button"]').disabled).toBe(true);
  expect(document.querySelector('[data-testid="renew-credit-button"]').disabled).toBe(true);
});
