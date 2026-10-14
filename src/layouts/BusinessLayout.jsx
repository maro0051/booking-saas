import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Calendar, ListChecks, Sparkles, Users,
  MapPin, Clock, CreditCard, BarChart3, Settings, LogOut, Menu,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useBusiness } from "../hooks/useBusiness";
import { useI18n } from "../i18n/I18nContext";
import Button from "../components/ui/Button";
import MobileDrawer from "../components/common/MobileDrawer";
import BusinessTopBar from "../components/business/BusinessTopBar";
import SessionTimer from "../components/common/SessionTimer";

const NAV = [
  { to: "/dashboard", labelKey: "business.overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/calendar", labelKey: "business.calendar", icon: Calendar },
  { to: "/dashboard/appointments", labelKey: "business.appointments", icon: ListChecks },
  { to: "/dashboard/services", labelKey: "business.services", icon: Sparkles },
  { to: "/dashboard/staff", labelKey: "business.staff", icon: Users },
  { to: "/dashboard/locations", labelKey: "business.locations", icon: MapPin },
  { to: "/dashboard/availability", labelKey: "business.availability", icon: Clock },
  { to: "/dashboard/analytics", labelKey: "business.analytics", icon: BarChart3 },
  { to: "/dashboard/payments", labelKey: "business.payments", icon: CreditCard },
  { to: "/dashboard/settings", labelKey: "business.settings", icon: Settings },
  { to: "/dashboard/billing", labelKey: "business.billing", icon: CreditCard },
];

function Brand({ business }) {
  const { t } = useI18n();
  return (
    <div className="biz-brand">
      <div className="biz-brand-logo">
        {business.logo_url ? (
          <img src={business.logo_url} alt="" />
        ) : (
          business.name?.[0]?.toUpperCase() || "?"
        )}
      </div>
      <div className="biz-brand-meta">
        <div className="biz-brand-tag">{t("business.portalName")}</div>
        <div className="biz-brand-name truncate">{business.name}</div>
        <div className="biz-brand-slug truncate">/{business.slug}</div>
      </div>
    </div>
  );
}

function NavList({ onNavigate }) {
  const { t } = useI18n();
  return (
    <nav className="biz-nav">
      {NAV.map(({ to, labelKey, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className="biz-nav-item"
        >
          <Icon size={16} />
          {t(labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}

export default function BusinessLayout() {
  const { signOut, user } = useAuth();
  const { business, loading, error } = useBusiness();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  if (loading) return <div className="container" style={{ padding: 32 }}>{t("common.loading")}</div>;
  if (error) {
    return (
      <div className="container" style={{ padding: 32 }}>
        <div className="alert alert-error">Error: {error}</div>
      </div>
    );
  }
  if (!business) {
    return (
      <div className="container" style={{ maxWidth: 520, padding: 32 }}>
        <div className="card">
          <h2>{t("business.welcome")}</h2>
          <p className="muted">Create your business to access the dashboard.</p>
          <Button variant="primary" onClick={() => navigate("/onboarding/business")}>
            Start onboarding
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="biz-shell">
      <SessionTimer kind="business" />
      {/* Desktop sidebar */}
      <aside className="biz-sidebar">
        <Brand business={business} />
        <NavList />
        <div className="biz-sidebar-footer">
          <button className="biz-signout" onClick={handleSignOut}>
            <LogOut size={15} /> {t("common.signOut")}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Menu"
      >
        <div style={{ background: "var(--biz-sidebar-bg)", margin: -12, padding: 12, color: "#fff", minHeight: "100%" }}>
          <Brand business={business} />
          <NavList onNavigate={() => setDrawerOpen(false)} />
          <div style={{ paddingTop: 12, marginTop: 12, borderTop: "1px solid var(--biz-sidebar-border)" }}>
            <button className="biz-signout" onClick={handleSignOut}>
              <LogOut size={15} /> {t("common.signOut")}
            </button>
          </div>
        </div>
      </MobileDrawer>

      {/* Main column */}
      <div className="biz-main">
        <BusinessTopBar business={business} onOpenMobileNav={() => setDrawerOpen(true)} />
        <div className="biz-page">
          <Outlet context={{ business }} />
        </div>
      </div>
    </div>
  );
}