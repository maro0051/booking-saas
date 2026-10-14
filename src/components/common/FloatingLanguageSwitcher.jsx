import LanguageSwitcher from "./LanguageSwitcher";

/**
 * Renders a small language switcher in the top-right of the viewport.
 * Use on pages without a shell (auth, customer account, etc.).
 */
export default function FloatingLanguageSwitcher() {
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 60,
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}
    >
      <LanguageSwitcher compact />
    </div>
  );
}