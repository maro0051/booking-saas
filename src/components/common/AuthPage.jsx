import FloatingLanguageSwitcher from "./FloatingLanguageSwitcher";

/**
 * Wraps a route element so the floating language switcher appears on top.
 * Use for all auth / standalone pages.
 */
export default function AuthPage({ children }) {
  return (
    <>
      <FloatingLanguageSwitcher />
      {children}
    </>
  );
}