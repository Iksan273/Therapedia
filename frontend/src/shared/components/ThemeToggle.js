import { Moon, Sun } from "lucide-react";
import { Button } from "@/shared/ui/button";

// Tombol ganti tema terang/gelap (state ada di useAppTheme, dipakai AppLayout).
export function ThemeToggle({ isDark, onToggle, className }) {
  const label = isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap";
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={className}
      onClick={onToggle}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      data-testid="theme-toggle-button"
    >
      {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
    </Button>
  );
}
