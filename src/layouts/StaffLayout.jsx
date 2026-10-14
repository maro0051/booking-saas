import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, CalendarDays, Clock, Plane, User, LogOut, Menu,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../i18n/I18nContext";
import { myStaffRow } from "../services/staffPortal";
import MobileDrawer from "../components/common/MobileDrawer";
import ThemeToggle from "../components/common/ThemeToggle";
import LanguageSwitcher from "../components/common/LanguageSwitcher";
import SessionTimer from "../components/common/SessionTimer";

const NAV = [
  { to: "/staff", labelKey: "nav.overview", icon: LayoutDashboard, end: true },
  { to: "/staff/schedule", labelKey: "staffPortal.schedule", icon: CalendarDays },
  { to: "/staff/hours", labelKey: "staffPortal.hours", icon: Clock },
  { to: "/staff/time-off", labelKey: "staffPortal.timeOff", icon: Plane },
  { to: "/staff/profile", labelKey: "staffPortal.profile", icon: User },
];

function Brand({ staff }) {
  const { t } = useI18n();
  const initials = (staff?.display_name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="biz-brand" style={{ paddingBottom: 14 }}>
      <div className="biz-brand-logo">{initials}</div>
      <div className="biz-brand-meta">
        <div className="biz-brand-tag">{t("staff.portalName")}</div>
        <div className="biz-brand-name truncate">{staff?.display_name || "..."}</div>
        <div className="biz-brand-slug truncate">{staff?.business_name || ""}</div>
      </div>
    </div>
  );
}

function NavList({ onNavigate }) {
  const { t } = useI18n();
  return (
    <nav className="biz-nav">
      {NAV.map(({ to, labelKey, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate} className="biz-nav-item">
          <Icon size={16} />
          {t(labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}

export default function StaffLayout() {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    myStaffRow()
      .then((row) => { if (mounted) setStaff(row); })
      .catch(() => { /* guarded elsewhere */ });
    return () => { mounted = false; };
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate("/staff/login", { replace: true });
  }

  return (
    <div className="biz-shell">
      <SessionTimer kind="staff" />

      <aside className="biz-sidebar" style={{
        background: "linear-gradient(180deg, #1f6b4a 0%, #14432e 100%)",
      }}>
        <Brand staff={staff} />
        <NavList />
        <div className="biz-sidebar-footer">
          <button className="biz-signout" onClick={handleSignOut}>
            <LogOut size={15} /> {t("common.signOut")}
          </button>
        </div>
      </aside>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Menu"
      >
        <div style={{ background: "#1f6b4a", margin: -12, padding: 12, color: "#fff", minHeight: "100%" }}>
          <Brand staff={staff} />
          <NavList onNavigate={() => setDrawerOpen(false)} />
          <div style={{ paddingTop: 12, marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.15)" }}>
            <button className="biz-signout" onClick={handleSignOut}>
              <LogOut size={15} /> {t("common.signOut")}
            </button>
          </div>
        </div>
      </MobileDrawer>

      <div className="biz-main">
        <div className="biz-topbar">
          <button
            className="biz-icon-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            style={{ display: "none" }}
            id="staff-mobile-menu-btn"
          >
            <Menu size={18} />
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600 }} className="truncate">
              {staff?.business_name || ""}
            </div>
            <div className="text-xs muted truncate">{user?.email}</div>
          </div>

          <div className="biz-topbar-actions">
            <LanguageSwitcher compact />
            <ThemeToggle compact />
          </div>
        </div>

        <div className="biz-page">
          <Outlet context={{ staff }} />
        </div>
      </div>
    </div>
  );
}