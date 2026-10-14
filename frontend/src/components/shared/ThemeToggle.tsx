import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/store/themeStore";

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export function ThemeToggle({ className = "", compact = false }: ThemeToggleProps) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === "dark";
  const label = isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-control border border-line bg-surface px-3 text-sm font-medium text-ink-muted transition-colors duration-200 hover:bg-surface-muted hover:text-ink ${compact ? "w-11 px-0" : ""} ${className}`}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      {!compact && <span>{isDark ? "Claro" : "Oscuro"}</span>}
    </button>
  );
}
