import { useEffect, useState } from "react";
import { getStoredTheme, applyTheme } from "../lib/theme";

export function useTheme() {
  const [theme, setThemeState] = useState(() => getStoredTheme());

  useEffect(() => { applyTheme(theme); }, [theme]);

  function toggle() { setThemeState((t) => (t === "dark" ? "light" : "dark")); }
  function set(t) { setThemeState(t); }

  return { theme, toggle, set };
}