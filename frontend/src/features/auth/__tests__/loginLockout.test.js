// @vitest-environment jsdom
// Lockout login (429): form dikunci dan hitung mundur berjalan real-time dari retryAfter server, lalu terbuka lagi.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "@/services/http/apiError";

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
  vi.useFakeTimers({ shouldAdvanceTime: false });
  window.localStorage.clear();
  Object.values(apiMock).forEach((fn) => fn.mockReset());
  await ensureSeedsIfNeeded();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

const $ = (id) => container.querySelector(`[data-testid="${id}"]`);
const type = (el, value) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const lockedError = (seconds) => new ApiError({ status: 429, code: "too_many_attempts", message: `Terlalu banyak percobaan login. Coba lagi dalam ${seconds} detik.`, retryAfter: seconds });

async function mountAndFailLogin(seconds) {
  apiMock.post.mockRejectedValue(lockedError(seconds));
  await act(async () => root.render(<AppProviders><MemoryRouter><Login /></MemoryRouter></AppProviders>));
  const emailInput = container.querySelector('input[type="email"]');
  await act(async () => type(emailInput, "staf@therapedia.id"));
  await act(async () => type(container.querySelector('input[type="password"]'), "salah"));
  await act(async () => container.querySelector('button[type="submit"]').dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await act(async () => { await Promise.resolve(); });
  return emailInput;
}

test("429 menampilkan hitung mundur real-time, mengunci tombol, lalu membuka lagi saat habis", async () => {
  await mountAndFailLogin(45);

  const notice = $("staff-lockout");
  expect(notice).not.toBeNull();
  expect($("staff-lockout-timer").textContent).toBe("0:45");
  const submit = container.querySelector('button[type="submit"]');
  expect(submit.disabled).toBe(true);
  expect(submit.textContent).toContain("Coba lagi dalam 0:45");

  await act(async () => vi.advanceTimersByTime(10_500));
  expect($("staff-lockout-timer").textContent).toMatch(/0:3[3-5]/); // berjalan mundur tiap detik
  expect(submit.textContent).toMatch(/Coba lagi dalam 0:3\d/);

  const callsBefore = apiMock.post.mock.calls.length;
  await act(async () => container.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(apiMock.post.mock.calls.length).toBe(callsBefore); // selama terkunci tidak mengirim request

  await act(async () => vi.advanceTimersByTime(40_000));
  expect($("staff-lockout")).toBeNull();
  expect(container.querySelector('button[type="submit"]').disabled).toBe(false);
  expect(container.querySelector('button[type="submit"]').textContent).toContain("Masuk ke Dashboard Staf");
});

test("mengganti email membuka kunci di layar (server menilai ulang per email)", async () => {
  const emailInput = await mountAndFailLogin(120);
  expect($("staff-lockout")).not.toBeNull();

  await act(async () => type(emailInput, "lain@therapedia.id"));
  expect($("staff-lockout")).toBeNull();
  expect(container.querySelector('button[type="submit"]').disabled).toBe(false);
});
