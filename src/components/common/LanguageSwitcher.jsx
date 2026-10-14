import { useI18n } from "../../i18n/I18nContext";

export default function LanguageSwitcher({ compact = false }) {
  const { locale, setLocale } = useI18n();

  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    border: "1px solid var(--border)",
    borderRadius: 999,
    padding: 2,
    background: "var(--bg-elev)",
  };
  const btnStyle = (active) => ({
    padding: compact ? "4px 9px" : "5px 12px",
    fontSize: 11.5,
    fontWeight: 600,
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    background: active ? "var(--accent)" : "transparent",
    color: active ? "#fff" : "var(--fg-muted)",
    transition: "background 140ms ease, color 140ms ease",
  });

  return (
    <div style={base} role="group" aria-label="Language">
      <button
        type="button"
        style={btnStyle(locale === "en")}
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
      <button
        type="button"
        style={btnStyle(locale === "fr")}
        onClick={() => setLocale("fr")}
        aria-pressed={locale === "fr"}
      >
        FR
      </button>
    </div>
  );
}