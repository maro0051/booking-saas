import { Outlet } from "react-router-dom";
import ThemeToggle from "../components/common/ThemeToggle";
import LanguageSwitcher from "../components/common/LanguageSwitcher";

export default function PublicLayout() {
  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "color-mix(in srgb, var(--bg-elev) 82%, transparent)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: "var(--fg)",
              fontSize: 15,
              letterSpacing: -0.2,
              cursor: "default",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: "var(--accent)",
                boxShadow: "0 0 0 3px var(--accent-soft)",
              }}
            />
            Booking SaaS
          </span>
          <div className="row" style={{ gap: 8 }}>
            <LanguageSwitcher compact />
            <ThemeToggle compact />
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 960, margin: "0 auto", padding: 24, position: "relative", zIndex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}