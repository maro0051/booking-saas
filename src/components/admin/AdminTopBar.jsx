import { useEffect, useRef, useState } from "react";
import { Search, Bell, Menu, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import ThemeToggle from "../common/ThemeToggle";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { listBusinesses } from "../../services/admin";
import { useI18n } from "../../i18n/I18nContext";

export default function AdminTopBar({ onOpenMobileNav }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchBoxRef = useRef(null);

  useEffect(() => {
    const handle = setTimeout(async () => {
      if (q.trim().length < 2) {
        setResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        const rows = await listBusinesses({ search: q, limit: 6, offset: 0 });
        setResults(rows);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [q]);

  useEffect(() => {
    function onDoc(e) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const emailInitial = (user?.email || "A").charAt(0).toUpperCase();

  return (
    <div className="admin-topbar">
      <button
        className="admin-icon-btn"
        onClick={onOpenMobileNav}
        aria-label="Open menu"
        style={{ display: "none" }}
        id="admin-mobile-menu-btn"
      >
        <Menu size={18} />
      </button>

      <div className="admin-search" ref={searchBoxRef}>
        <Search size={15} className="admin-search-icon" />
        <input
          placeholder={t("admin.businessesSearch")}
          value={q}
          onChange={(e) => { setQ(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
        />
        {searching && (
          <Loader2 size={14} className="spin"
                   style={{
                     position: "absolute", right: 14, top: "50%",
                     transform: "translateY(-50%)", color: "var(--admin-text-muted)",
                   }} />
        )}

        {showResults && q.trim().length >= 2 && (
          <div
            style={{
              position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
              background: "var(--admin-card)",
              border: "1px solid var(--admin-border)",
              borderRadius: 14,
              boxShadow: "0 12px 30px rgba(20,20,60,.14)",
              padding: 8, zIndex: 40,
              maxHeight: 380, overflowY: "auto",
            }}
          >
            {results.length === 0 && !searching && (
              <div style={{ padding: 14, color: "var(--admin-text-muted)", fontSize: 13 }}>
                {t("common.noData")}
              </div>
            )}
            {results.map((b) => (
              <button
                key={b.id}
                onClick={() => { setShowResults(false); setQ(""); navigate(`/admin/businesses/${b.id}`); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "8px 10px", borderRadius: 10, border: "none",
                  background: "transparent", color: "inherit", cursor: "pointer",
                  fontSize: 13.5,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--admin-bg)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ fontWeight: 600 }}>{b.name}</div>
                <div style={{ fontSize: 12, color: "var(--admin-text-muted)" }}>
                  /{b.slug} · {b.status}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="admin-topbar-actions">
        <LanguageSwitcher compact />
        <ThemeToggle compact />
        <button className="admin-icon-btn" aria-label={t("common.notifications")}>
          <Bell size={16} />
        </button>
        <div className="admin-profile">
          <div className="admin-profile-avatar">{emailInitial}</div>
          <span className="admin-profile-email">{user?.email}</span>
        </div>
      </div>
    </div>
  );
}