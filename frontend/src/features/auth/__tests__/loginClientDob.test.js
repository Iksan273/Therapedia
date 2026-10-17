// @vitest-environment jsdom
// Form login ortu (revisi QA): kolom tanggal lahir memakai ikon kalender di kiri (sejajar ikon kunci), format "DD / MM / YYYY",
// ketik angka saja, dan yang dikirim ke server tetap ISO yyyy-MM-dd.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/config/env", () => ({
  ENV: { DATA_SOURCE: "api", API_BASE_URL: "http://api.test/api/v1", API_TIMEOUT_MS: 1000, LANDING_URL: "", IS_DEV: false },
  isApiMode: () => true,
}));

const apiMock = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), upload: vi.fn(), list: vi.fn() };
vi.mock("@/services/http/httpClient", () => ({ api: apiMock, setUnauthorizedHandler: () => {} }));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

const { default: AppProviders } = await import("@/app/providers/AppProviders");
const { default: Login } = await import("@/features/auth/pages/Login");
const { ensureSeedsIfNeeded } = await import("@/data/seedRegistry");

let root;
let container;
beforeEach(async () => {
  window.localStorage.clear();
  Object.values(apiMock).forEach((fn) => fn.mockReset());
  apiMock.post.mockRejectedValue(Object.assign(new Error("Kode atau tanggal lahir tidak cocok."), { status: 422, fieldErrors: {} }));
  await ensureSeedsIfNeeded();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const $ = (id) => container.querySelector(`[data-testid="${id}"]`);
const wait = (ms = 400) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const type = (el, value) =>
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });

async function openClientForm() {
  await act(async () => root.render(<AppProviders><MemoryRouter><Login /></MemoryRouter></AppProviders>));
  await act(async () => $("tab-client-login").click());
  await wait();
}

test("tanggal lahir: ikon kalender di kiri, placeholder 'DD / MM / YYYY', form satu kolom", async () => {
  await openClientForm();

  const dob = $("login-client-dob-input");
  expect(dob).not.toBeNull();
  expect(dob.placeholder).toBe("DD / MM / YYYY");
  expect(dob.type).toBe("text"); // bukan <input type="date"> bawaan browser (format mengikuti locale)
  expect(dob.inputMode).toBe("numeric");
  const picker = $("login-client-dob-input-picker-btn");
  expect(picker.parentElement.className).toContain("left-1"); // ikon di kiri seperti ikon kunci
  expect(picker.getAttribute("aria-label")).toMatch(/kalender/i);
  expect(container.querySelector("label[for='login-client-dob']")).not.toBeNull();
  expect(container.querySelector("form").className).toContain("space-y-4"); // tetap satu kolom
});

test("mengetik angka saja diformat otomatis dan yang dikirim ke server tetap yyyy-MM-dd", async () => {
  await openClientForm();

  await type($("login-client-code-input"), "ae-00006");
  const dob = $("login-client-dob-input");
  await type(dob, "05032018");
  expect(dob.value).toBe("05 / 03 / 2018");

  await act(async () => $("login-client-submit-button").click());
  await wait(50);

  expect(apiMock.post).toHaveBeenCalledWith(expect.stringContaining("client-login"), expect.objectContaining({ clientCode: "ae-00006", dateOfBirth: "2018-03-05" }));
});

test("tanggal belum lengkap tidak terkirim sebagai tanggal lama: nilai dikosongkan", async () => {
  await openClientForm();
  await type($("login-client-code-input"), "AE-00006");
  const dob = $("login-client-dob-input");
  await type(dob, "05032018");
  await type(dob, "0503201"); // hapus satu digit -> belum lengkap

  await act(async () => $("login-client-submit-button").click());
  await wait(50);

  expect(apiMock.post).not.toHaveBeenCalled(); // validasi: kode dan tanggal lahir wajib
});
