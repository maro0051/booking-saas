import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import ThemeToggle from "../common/ThemeToggle";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { supabase } from "../../lib/supabaseClient";
import { useI18n } from "../../i18n/I18nContext";

export default function MarketingHeader() {
  const location = useLocation();
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) { setUser(data?.user || null); setLoaded(true); }
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const links = [
    { to: "/", label: t("nav.overview") === "Overview" ? "Home" : "Accueil" },
    { to: "/how-it-works", label: t("booking.howItWorks") },
    { to: "/pricing", label: t("billing.availablePlans") ? "Pricing" : "Pricing" },
    { to: "/help", label: t("admin.support") === "Support requests" ? "Help" : "Aide" },
  ];

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 20,
      background: "color-mix(in srgb, var(--bg-elev) 82%, transparent)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{
        maxWidth: 1120, margin: "0 auto", padding: "14px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12,
      }}>
        <Link to="/" style={{
          display: "flex", alignItems: "center", gap: 10,
          fontWeight: 700, color: "var(--fg)", fontSize: 16, textDecoration: "none",
        }}>
          <span aria-hidden="true" style={{
            width: 12, height: 12, borderRadius: 999,
            background: "var(--accent)",
            boxShadow: "0 0 0 4px var(--accent-soft)",
          }} />
          Booking SaaS
        </Link>

        <nav className="marketing-nav only-desktop" style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {links.map((l) => (
            <Link key={l.to} to={l.to} style={{
              color: location.pathname === l.to ? "var(--accent)" : "var(--fg-muted)",
              fontSize: 14, fontWeight: 500, textDecoration: "none",
            }}>
              {l.label}
            </Link>
          ))}
          <LanguageSwitcher compact />
          <ThemeToggle compact />
          {loaded && user ? (
            <Link to="/dashboard">
              <button className="btn btn-primary btn-sm">
                {t("business.portalName") === "BUSINESS" ? "Go to dashboard" : "Tableau de bord"}
              </button>
            </Link>
          ) : (
            <div className="row" style={{ gap: 8 }}>
              <Link to="/login">
                <button className="btn btn-ghost btn-sm">{t("auth.signIn")}</button>
              </Link>
              <Link to="/signup">
                <button className="btn btn-primary btn-sm">{t("auth.signUp")}</button>
              </Link>
            </div>
          )}
        </nav>

        <div className="only-mobile" style={{ alignItems: "center", gap: 6 }}>
          <LanguageSwitcher compact />
          <ThemeToggle compact />
          <button
            className="btn btn-ghost btn-icon"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="only-mobile" style={{
          display: "flex", flexDirection: "column",
          borderTop: "1px solid var(--border)",
          padding: 12, gap: 4,
          background: "var(--bg-elev)",
        }}>
          {links.map((l) => (
            <Link key={l.to} to={l.to} style={{
              padding: "10px 12px", borderRadius: 10, textDecoration: "none",
              color: location.pathname === l.to ? "var(--accent-soft-fg)" : "var(--fg)",
              background: location.pathname === l.to ? "var(--accent-soft)" : "transparent",
              fontWeight: 600,
            }}>
              {l.label}
            </Link>
          ))}
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 6, paddingTop: 10 }}>
            {loaded && user ? (
              <Link to="/dashboard" style={{ display: "block" }}>
                <button className="btn btn-primary" style={{ width: "100%" }}>
                  {t("business.portalName") === "BUSINESS" ? "Go to dashboard" : "Tableau de bord"}
                </button>
              </Link>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                <Link to="/login" style={{ display: "block" }}>
                  <button className="btn" style={{ width: "100%" }}>{t("auth.signIn")}</button>
                </Link>
                <Link to="/signup" style={{ display: "block" }}>
                  <button className="btn btn-primary" style={{ width: "100%" }}>
                    {t("auth.signUp")}
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}