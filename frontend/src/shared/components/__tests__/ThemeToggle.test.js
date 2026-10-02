// @vitest-environment jsdom
// Tema gelap: class `dark` dipasang di <html> selama AppLayout tampil, dipersist, dan dilepas saat keluar.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ThemeToggle } from "@/shared/components/ThemeToggle";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function Harness() {
  const { isDark, toggleTheme } = useAppTheme();
  return <ThemeToggle isDark={isDark} onToggle={toggleTheme} />;
}

const mount = async () => {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(<Harness />));
  return { el, root };
};
const click = (el) => act(async () => el.querySelector('[data-testid="theme-toggle-button"]').dispatchEvent(new MouseEvent("click", { bubbles: true })));

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
});

test("toggle memasang & melepas class dark, dan label tombol mengikuti", async () => {
  const { el, root } = await mount();
  const button = () => el.querySelector('[data-testid="theme-toggle-button"]');
  expect(document.documentElement.classList.contains("dark")).toBe(false);
  expect(button().getAttribute("aria-label")).toBe("Ganti ke mode gelap");

  await click(el);
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  expect(button().getAttribute("aria-label")).toBe("Ganti ke mode terang");

  await click(el);
  expect(document.documentElement.classList.contains("dark")).toBe(false);
  act(() => root.unmount());
});

test("pilihan gelap tersimpan dan class dilepas saat area aplikasi ditinggalkan", async () => {
  let ui = await mount();
  await click(ui.el);
  act(() => ui.root.unmount());
  // Keluar dari AppLayout → halaman publik kembali terang
  expect(document.documentElement.classList.contains("dark")).toBe(false);

  // Masuk lagi → preferensi gelap dipulihkan
  ui = await mount();
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  act(() => ui.root.unmount());
});
