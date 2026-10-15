// @vitest-environment jsdom
// Active Clients mode API: roster & birthday dari server (paginasi server, per_page 10), bukan dari cache client global.
// httpClient di-mock; payload = bentuk respons backend setelah interceptor (key camelCase).
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/config/env", () => ({
  ENV: { DATA_SOURCE: "api", API_BASE_URL: "http://api.test/api/v1", API_TIMEOUT_MS: 1000, LANDING_URL: "", IS_DEV: false },
  isApiMode: () => true,
}));

const apiMock = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), upload: vi.fn(), list: vi.fn() };
vi.mock("@/services/http/httpClient", () => ({ api: apiMock, setUnauthorizedHandler: () => {} }));

const { default: AppProviders } = await import("@/app/providers/AppProviders");
const { useAuth } = await import("@/stores/authStore");
const { tokenStore } = await import("@/services/http/tokenStore");
const { default: ActiveClients } = await import("@/features/schedule/pages/ActiveClients");

const ROW = (id, extra = {}) => ({
  id, clientCode: `AE-0000${id}`, childName: `Anak ${id}`, gender: "female", dateOfBirth: "2019-03-10", parentName: "Ortu", parentPhone: "0812",
  branchId: 1, branch: { id: 1, code: "EAST", name: "East" }, status: "admitted", creditBalance: id === 2 ? 0 : 5, frozen: id === 2, serviceCodes: [], version: 1, createdAt: "2026-10-15T08:00:00+00:00", ...extra,
});

let auth;
function AuthProbe() {
  auth = useAuth();
  return null;
}
let root;
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });
const mount = async () => {
  root = createRoot(document.createElement("div"));
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<AppProviders><AuthProbe /><MemoryRouter><ActiveClients /></MemoryRouter></AppProviders>));
  await flush();
  return container;
};
const login = async () => {
  await act(async () => {
    tokenStore.set("1|token");
    auth.applySession({ role: "admin_schedule", userId: 2, staffName: "Admin", branchId: "1", permissions: { active_clients: true } });
  });
  await flush();
};
const listCalls = () => apiMock.list.mock.calls.filter(([url]) => url === "/clients");

beforeEach(async () => {
  window.localStorage.clear();
  Object.values(apiMock).forEach((fn) => fn.mockReset());
  apiMock.post.mockResolvedValue("");
  apiMock.get.mockImplementation(async (url) => (url === "/branches" ? [{ id: 1, code: "EAST", name: "East", city: "Surabaya", isActive: true, bankAccounts: [] }] : []));
  apiMock.list.mockImplementation(async (url, params) => {
    if (params?.birthMonth) return { items: [ROW(9, { dateOfBirth: "2018-03-05" })], meta: { total: 1, page: 1, perPage: 10, lastPage: 1 } };
    return { items: [ROW(1), ROW(2)], meta: { total: 23, page: params?.page ?? 1, perPage: 10, lastPage: 3 } };
  });
  await ensureSeedsIfNeeded();
});
afterEach(async () => {
  await act(async () => auth.logout());
  await act(async () => root.unmount());
});

test("roster diambil dari server (status admitted/discharged/discontinued, per_page 10), jumlah asli dari meta, saldo kredit dari server", async () => {
  const container = await mount();
  await login();

  expect(listCalls()).toHaveLength(1); // hanya roster: bukan cache client global
  expect(listCalls()[0][1]).toMatchObject({ status: ["admitted", "discharged", "discontinued"], branchId: "1", sort: "child_name", page: 1, perPage: 10 });
  expect(container.querySelector('[data-testid="roster-row-1"]')).not.toBeNull();
  expect(container.textContent).toContain("Client Roster (23)"); // total server, bukan jumlah baris yang termuat
  expect(container.querySelector('[data-testid="roster-packages-1"]').textContent).toContain("5 sisa");
  expect(container.querySelector('[data-testid="roster-row-2"]').textContent).toContain("0 Kredit"); // Frozen
  expect(container.textContent).toContain("Menampilkan 1 – 10 dari 23 client");
});

test("halaman berikutnya dan ukuran halaman diminta ke server; tab Birthday baru mengambil data saat dibuka", async () => {
  const container = await mount();
  await login();
  expect(listCalls().some(([, p]) => p.birthMonth)).toBe(false); // belum dibuka: tidak diambil

  const next = [...container.querySelectorAll("button")].find((b) => /next|berikut/i.test(b.textContent));
  await act(async () => next.click());
  await flush();
  expect(listCalls().some(([, p]) => p.page === 2 && p.perPage === 10)).toBe(true);

  const birthdayTab = [...container.querySelectorAll('[role="tab"]')].find((t) => t.textContent.includes("Birthday"));
  await act(async () => birthdayTab.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
  await flush();
  const call = listCalls().find(([, p]) => p.birthMonth);
  expect(call[1]).toMatchObject({ status: ["admitted"], branchId: "1", perPage: 10 });
});

test("selama memuat pertama kali tampil shimmer, bukan tabel kosong", async () => {
  let release;
  apiMock.list.mockImplementation(async () => {
    await new Promise((r) => { release = r; });
    return { items: [ROW(1)], meta: { total: 1, page: 1, perPage: 10, lastPage: 1 } };
  });
  const container = await mount();
  await login();

  expect(container.querySelector('[data-testid="roster-loading"]')).not.toBeNull();
  expect(container.textContent).toContain("Memuat data…");
  await act(async () => { release(); });
  await flush();
  expect(container.querySelector('[data-testid="roster-loading"]')).toBeNull();
  expect(container.querySelector('[data-testid="roster-row-1"]')).not.toBeNull();
});
