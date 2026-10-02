import { useCallback, useLayoutEffect } from "react";
import { usePersistentState } from "@/shared/hooks/usePersistentState";

// Preferensi tema (terang/gelap). Tanpa preferensi tersimpan, ikut pengaturan sistem.
const systemTheme = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

// Dipakai SATU kali di AppLayout: memasang class `dark` di <html> hanya selama area aplikasi tampil
// (halaman publik seperti landing & /assessment tetap terang). Dipasang sebelum paint agar tidak berkedip.
export function useAppTheme() {
  const [theme, setTheme] = usePersistentState("ui_theme", systemTheme);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    return () => document.documentElement.classList.remove("dark");
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), [setTheme]);
  return { theme, isDark: theme === "dark", toggleTheme };
}
