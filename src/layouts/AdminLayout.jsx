import { useState } from "react";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard, Building2, CreditCard, LifeBuoy, ScrollText,
  ShieldCheck, LogOut, Menu, Sparkles,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import MobileDrawer from "../components/common/MobileDrawer";
import AdminTopBar from "../components/admin/AdminTopBar";
import SessionTimer from "../components/common/SessionTimer";
import { useI18n } from "../i18n/I18nContext";

const NAV = [
  { to: "/admin", labelKey: "nav.overview", icon: LayoutDashboard, end: true },
  { to: "/admin/businesses", labelKey: "admin.businesses", icon: Building2 },
  { to: "/admin/plans", labelKey: "admin.plans", icon: CreditCard },
  { to: "/admin/support", labelKey: "admin.support", icon: LifeBuoy },
  { to: "/admin/audit", labelKey: "admin.audit", icon: ScrollText },
  { to: "/admin/admins", labelKey: "admin.admins", icon: ShieldCheck },
  { to: "/admin/profile", labelKey: "nav.myProfile", icon: ShieldCheck },
];

function Brand() {
  const { t } = useI18n();
  return (
    <div className="admin-brand">
      <div className="admin-brand-icon"><Sparkles size={16} /></div>
      <div className="admin-brand-name">{t("business.welcome") ? "Booking SaaS" : "Booking SaaS"}</div>
    </div>
  );
}

function NavList({ onNavigate }) {
  const { t } = useI18n();
  return (
    <nav className="admin-nav">
      {NAV.map(({ to, labelKey, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate} className="admin-nav-item">
          <Icon size={16} />
          {t(labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const { signOut, user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="admin-shell">
      <SessionTimer kind="admin" />
      <aside className="admin-sidebar">
        <Brand />
        <NavList />

        <div className="admin-promo">
          <div className="admin-promo-icon"><Sparkles size={15} /></div>
          <div className="admin-promo-title">{t("admin.platformTools")}</div>
          <div className="admin-promo-body">{t("admin.platformToolsBody")}</div>
          <Link to="/admin/plans" className="admin-promo-cta">
            {t("admin.openPlans")}
          </Link>
        </div>

        <div className="admin-sidebar-footer">
          <span
            className="truncate"
            style={{ fontSize: 12, color: "var(--admin-sidebar-muted)", maxWidth: 130 }}
          >
            {user?.email}
          </span>
          <button className="admin-signout" onClick={handleSignOut} title={t("common.signOut")}>
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Menu">
        <div
          style={{
            background: "var(--admin-sidebar-bg)",
            margin: -12, padding: 12, color: "var(--admin-sidebar-fg)",
            minHeight: "100%",
          }}
        >
          <Brand />
          <NavList onNavigate={() => setDrawerOpen(false)} />
          <div style={{ paddingTop: 12, marginTop: 12, borderTop: "1px solid var(--admin-sidebar-border)" }}>
            <button className="admin-signout" onClick={handleSignOut}>
              <LogOut size={14} /> {t("common.signOut")}
            </button>
          </div>
        </div>
      </MobileDrawer>

      <div className="admin-main">
        <AdminTopBar onOpenMobileNav={() => setDrawerOpen(true)} />
        <div className="admin-page">
          <Outlet />
        </div>
      </div>
    </div>
  );
}