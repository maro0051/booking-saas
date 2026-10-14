import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Menu, Loader2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useI18n } from "../../i18n/I18nContext";
import { searchBusiness, recentNotifications } from "../../services/businessSearch";
import { formatInTz } from "../../utils/datetime";
import ThemeToggle from "../common/ThemeToggle";
import LanguageSwitcher from "../common/LanguageSwitcher";

function timeAgo(iso, locale) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return locale === "fr" ? "à l'instant" : "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function notifLabel(template, t) {
  const map = {
    booking_confirmed: "notif.bookingCreated",
    booking_pending: "notif.bookingPending",
    booking_cancelled: "notif.bookingCancelled",
    booking_rescheduled: "notif.bookingRescheduled",
    booking_completed: "notif.bookingCompleted",
    booking_no_show: "notif.bookingNoShow",
    booking_declined: "notif.bookingDeclined",
  };
  return t(map[template] || "notif.newBooking");
}

export default function BusinessTopBar({ business, onOpenMobileNav }) {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [results, setResults] = useState({ appointments: [], customers: [] });
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [unread, setUnread] = useState(0);

  const searchBoxRef = useRef(null);
  const notifBoxRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (!business?.id) return;
    const handle = setTimeout(async () => {
      if (q.trim().length < 2) {
        setResults({ appointments: [], customers: [] });
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        const r = await searchBusiness(business.id, q);
        setResults(r);
      } catch {
        setResults({ appointments: [], customers: [] });
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [q, business?.id]);

  // Load notifications once + every 30s
  useEffect(() => {
    if (!business?.id) return;
    let mounted = true;
    async function load() {
      try {
        const rows = await recentNotifications(business.id, 8);
        if (!mounted) return;
        setNotifications(rows);
        setUnread(rows.filter((r) => !r.sent_at).length);
      } catch { /* non-fatal */ }
    }
    load();
    const interval = setInterval(load, 30_000);
    return () => { mounted = false; clearInterval(interval); };
  }, [business?.id]);

  // Close dropdowns on outside click
  useEffect(() => {
    function onDoc(e) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowResults(false);
      }
      if (notifBoxRef.current && !notifBoxRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function goToAppointment(appt) {
    setShowResults(false);
    setQ("");
    navigate("/dashboard/appointments");
  }

  function goToCustomer(cust) {
    setShowResults(false);
    setQ("");
    navigate("/dashboard/appointments");
  }

  const emailInitial = (user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="biz-topbar">
      <button
        className="biz-icon-btn"
        onClick={onOpenMobileNav}
        aria-label="Open menu"
        style={{ display: "none" }}
        id="biz-mobile-menu-btn"
      >
        <Menu size={18} />
      </button>

      {/* Search */}
      <div className="biz-search" ref={searchBoxRef}>
        <Search size={15} className="biz-search-icon" />
        <input
          placeholder={t("common.searchPlaceholder")}
          value={q}
          onChange={(e) => { setQ(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          aria-label={t("common.search")}
        />
        {searching && (
          <Loader2
            size={14}
            className="spin"
            style={{
              position: "absolute", right: 14, top: "50%",
              transform: "translateY(-50%)", color: "var(--biz-text-muted)",
            }}
          />
        )}

        {showResults && q.trim().length >= 2 && (
          <div className="biz-search-results">
            {results.appointments.length === 0 && results.customers.length === 0 && !searching && (
              <div style={{ padding: 14, color: "var(--biz-text-muted)", fontSize: 13 }}>
                {t("common.noData")}
              </div>
            )}

            {results.appointments.length > 0 && (
              <>
                <div className="biz-search-section">{t("business.appointments")}</div>
                {results.appointments.map((a) => (
                  <button
                    key={a.id}
                    className="biz-search-item"
                    style={{ width: "100%", textAlign: "left", border: "none", background: "transparent" }}
                    onClick={() => goToAppointment(a)}
                  >
                    <div className="row-between">
                      <span>
                        <strong>{a.reference}</strong>
                        {a.service?.name && <> · {a.service.name}</>}
                      </span>
                      <span className="muted">{a.status}</span>
                    </div>
                    <div className="muted">
                      {a.customer?.full_name} · {formatInTz(a.starts_at, business.timezone, "MMM d, h:mm a")}
                    </div>
                  </button>
                ))}
              </>
            )}

            {results.customers.length > 0 && (
              <>
                <div className="biz-search-section">{t("appointments.customer")}</div>
                {results.customers.map((c) => (
                  <button
                    key={c.id}
                    className="biz-search-item"
                    style={{ width: "100%", textAlign: "left", border: "none", background: "transparent" }}
                    onClick={() => goToCustomer(c)}
                  >
                    <div>{c.full_name || c.email}</div>
                    <div className="muted">{c.email || c.phone || ""}</div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="biz-topbar-actions">
        <LanguageSwitcher compact />
        <ThemeToggle compact />

        {/* Notifications */}
        <div style={{ position: "relative" }} ref={notifBoxRef}>
          <button
            className="biz-icon-btn"
            aria-label={t("common.notifications")}
            onClick={() => setShowNotif((v) => !v)}
          >
            <Bell size={16} />
            {unread > 0 && <span className="biz-notif-badge">{unread}</span>}
          </button>

          {showNotif && (
            <div className="biz-notif-panel">
              <div className="biz-notif-head">
                <span>{t("common.notifications")}</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setUnread(0)}
                  style={{ padding: "2px 8px", fontSize: 11.5 }}
                >
                  {t("common.markAllRead")}
                </button>
              </div>
              {notifications.length === 0 ? (
                <div className="biz-notif-empty">{t("common.noNotifications")}</div>
              ) : (
                <div className="biz-notif-list">
                  {notifications.map((n) => (
                    <div key={n.id} className="biz-notif-row">
                      <span className="biz-notif-dot" style={{
                        background: n.sent_at ? "var(--accent)" : "var(--warning-500)"
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500 }}>
                          {notifLabel(n.template, t)}
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {n.recipient_email || ""} · {timeAgo(n.created_at, locale)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile chip */}
        <div className="biz-profile">
          <div className="biz-profile-avatar">{emailInitial}</div>
          <span className="biz-profile-email">{user?.email}</span>
        </div>
      </div>
    </div>
  );
}