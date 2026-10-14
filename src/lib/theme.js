const KEY = "booking-saas-theme";

export function getStoredTheme() {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark") return v;
  } catch {}
  if (typeof window !== "undefined" && window.matchMedia) {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  }
  return "light";
}

export function applyTheme(theme) {
  const t = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem(KEY, t); } catch {}
}

export function initTheme() {
  applyTheme(getStoredTheme());
}