import { Link } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";

export default function MarketingFooter() {
  const { t } = useI18n();
  return (
    <footer style={{ borderTop: "1px solid var(--border)", marginTop: 40, padding: "32px 24px 40px" }}>
      <div style={{
        maxWidth: 1120, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 16, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span aria-hidden="true" style={{
            width: 10, height: 10, borderRadius: 999,
            background: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-soft)",
          }} />
          <span style={{ fontWeight: 700 }}>Booking SaaS</span>
        </div>

        <div className="row" style={{ gap: 18, flexWrap: "wrap" }}>
          <a href="/#features" className="muted text-sm">{t("nav.overview")}</a>
          <Link to="/pricing" className="muted text-sm">{t("billing.availablePlans")}</Link>
          <Link to="/how-it-works" className="muted text-sm">{t("booking.howItWorks")}</Link>
          <Link to="/help" className="muted text-sm">{t("admin.support")}</Link>
          <Link to="/login" className="muted text-sm">{t("auth.businessSignIn")}</Link>
          <Link to="/customer/login" className="muted text-sm">{t("auth.customerSignIn")}</Link>
        </div>

        <div className="muted text-xs">
          © {new Date().getFullYear()} Booking SaaS
        </div>
      </div>
    </footer>
  );
}