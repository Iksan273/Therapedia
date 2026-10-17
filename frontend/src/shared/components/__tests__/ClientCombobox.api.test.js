// @vitest-environment jsdom
// ClientCombobox mode API: daftar dari server (10/halaman, cari di server), diambil hanya saat popover dibuka, infinite scroll, label dari detail.
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
globalThis.scrollTo = globalThis.scrollTo || (() => {});
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

vi.mock("@/config/env", () => ({
  ENV: { DATA_SOURCE: "api", API_BASE_URL: "http://api.test/api/v1", API_TIMEOUT_MS: 1000, LANDING_URL: "", IS_DEV: false },
  isApiMode: () => true,
}));

const apiMock = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), upload: vi.fn(), list: vi.fn() };
vi.mock("@/services/http/httpClient", () => ({ api: apiMock, setUnauthorizedHandler: () => {} }));

const { default: AppProviders } = await import("@/app/providers/AppProviders");
const { useAuth } = await import("@/stores/authStore");
const { ClientCombobox } = await import("@/shared/components/ClientCombobox");
const { tokenStore } = await import("@/services/http/tokenStore");

const ROW = (n) => ({ id: n, clientCode: `AE-${String(n).padStart(5, "0")}`, childName: `Anak ${String(n).padStart(2, "0")}`, parentName: "Ortu", status: "admitted", branchId: 1, serviceCodes: [], version: 1 });
const PAGES = (total) => (params) => {
  const from = (params.page - 1) * 10 + 1;
  const items = Array.from({ length: Math.max(0, Math.min(10, total - from + 1)) }, (_, i) => ROW(from + i));
  return { items, meta: { total, page: params.page, perPage: 10, lastPage: Math.max(1, Math.ceil(total / 10)) } };
};

let ctx;
let changes;
function Harness({ value: initial = "", source = { statuses: ["admitted"] } }) {
  const [value, setValue] = useState(initial);
  ctx = { auth: useAuth() };
  return <ClientCombobox source={source} value={value} onChange={(id, client) => { changes.push([id, client?.clientName]); setValue(id); }} testId="cc" />;
}

let root;
let container;
const el = (id) => document.querySelector(`[data-testid="${id}"]`);
const optionCount = () => document.querySelectorAll('[data-testid^="cc-option-"]').length;
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });
const listCalls = () => apiMock.list.mock.calls.filter((c) => c[0] === "/clients").map((c) => c[1]);

const mount = async (props) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<AppProviders><Harness {...props} /></AppProviders>));
  await act(async () => {
    tokenStore.set("1|token");
    ctx.auth.applySession({ role: "finance", userId: 5, staffName: "Finance", branchId: null, permissions: { finance: true } });
  });
  await flush();
};

beforeEach(async () => {
  changes = [];
  window.localStorage.clear();
  Object.values(apiMock).forEach((fn) => fn.mockReset());
  apiMock.post.mockResolvedValue("");
  apiMock.get.mockResolvedValue([]);
  apiMock.list.mockImplementation(async (url, params) => (url === "/clients" ? PAGES(25)(params) : { items: [], meta: { total: 0, page: 1, perPage: 10, lastPage: 1 } }));
  await ensureSeedsIfNeeded();
});
afterEach(async () => {
  apiMock.post.mockReset();
  apiMock.post.mockResolvedValue("");
  await act(async () => ctx.auth.logout());
  await act(async () => root.unmount());
  container.remove();
  delete globalThis.IntersectionObserver;
});

test("tidak mengambil daftar sebelum dibuka; saat dibuka: shimmer lalu 10 client pertama dengan filter status", async () => {
  let release;
  const gate = new Promise((r) => (release = r));
  apiMock.list.mockImplementation(async (url, params) => {
    await gate;
    return PAGES(25)(params);
  });
  await mount();
  expect(listCalls()).toEqual([]); // aturan 22b: tidak ada request sebelum dipakai

  await act(async () => el("cc").click());
  await flush();
  expect(el("cc-skeleton")).toBeTruthy(); // bukan "tidak ditemukan" sebelum data tiba
  expect(el("cc-empty")).toBeNull();

  await act(async () => release());
  await flush();
  expect(el("cc-skeleton")).toBeNull();
  expect(optionCount()).toBe(10);
  expect(listCalls()[0]).toMatchObject({ status: ["admitted"], page: 1, perPage: 10, sort: "child_name" });
});

test("infinite scroll: sentinel terlihat -> halaman 2 dan 3 diminta ke server sampai habis", async () => {
  let trigger;
  globalThis.IntersectionObserver = class {
    constructor(cb) { trigger = () => cb([{ isIntersecting: true }]); }
    observe() {}
    disconnect() {}
  };
  await mount();
  await act(async () => el("cc").click());
  await flush();
  expect(optionCount()).toBe(10);

  await act(async () => trigger());
  await flush();
  expect(optionCount()).toBe(20);
  expect(listCalls().map((p) => p.page)).toEqual([1, 2]);

  await act(async () => trigger());
  await flush();
  expect(optionCount()).toBe(25);
  expect(listCalls().map((p) => p.page)).toEqual([1, 2, 3]);
  expect(el("cc-sentinel")).toBeNull(); // habis
});

test("cari: dikirim ke server (q) setelah jeda dan mengulang dari halaman 1; pilih mengembalikan objek client", async () => {
  await mount();
  await act(async () => el("cc").click());
  await flush();

  const input = el("cc-search");
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  await act(async () => { setter.call(input, "anak 0"); input.dispatchEvent(new Event("input", { bubbles: true })); });
  for (let i = 0; i < 3; i += 1) await act(async () => { await new Promise((r) => setTimeout(r, 200)); });
  await flush();
  expect(listCalls().some((p) => p.q === "anak 0" && p.page === 1)).toBe(true);

  await act(async () => el("cc-option-3").click());
  expect(changes).toEqual([["3", "Anak 03"]]); // id dari server dijadikan string oleh mapper
  expect(el("cc").textContent).toContain("Anak 03");
});

test("nilai awal yang belum ada di daftar termuat: label diambil dari GET /clients/{id} (tanpa membuka daftar)", async () => {
  apiMock.get.mockImplementation(async (url) => (url === "/clients/77" ? { ...ROW(77), childName: "Anak Tujuh Puluh Tujuh", parentName: "Ortu 77" } : []));
  await mount({ value: "77" });
  await flush();
  expect(el("cc").textContent).toContain("Anak Tujuh Puluh Tujuh (Ortu 77)");
  expect(listCalls()).toEqual([]); // daftar tetap tidak diambil
});
