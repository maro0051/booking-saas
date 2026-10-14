import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

export default function ThemeToggle({ compact = false }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      className="btn btn-ghost tip"
      data-tip={isDark ? "Light mode" : "Dark mode"}
      onClick={toggle}
      aria-label="Toggle theme"
      style={{ padding: compact ? 6 : 8 }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}