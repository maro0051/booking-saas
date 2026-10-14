import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

/**
 * resource: "staff" | "services" | "locations" | "appointments"
 */
export default function PlanLimitBanner({ limits, resource }) {
  const { t } = useI18n();
  if (!limits) return null;

  const usage = limits.usage || {};
  const canAdd = (limits.can_add || {})[resource];
  const max = limits[`max_${resource === "appointments" ? "appointments_per_month" : resource}`];

  const current =
    resource === "appointments" ? usage.appointments_this_month : usage[resource];

  const over = canAdd === false;
  const near = !over && max > 0 && current >= max * 0.8;

  if (!over && !near) return null;

  const tone = over ? "danger" : "warning";
  const colors = {
    danger: { bg: "rgba(239,68,68,.10)", border: "rgba(239,68,68,.25)", fg: "#991b1b", icon: "#dc2626" },
    warning: { bg: "rgba(245,158,11,.10)", border: "rgba(245,158,11,.25)", fg: "#92400e", icon: "#d97706" },
  }[tone];

  const quotaText = max > 0
    ? t("limits.quota", { current, max })
    : t("limits.quotaUnlimited", { current });

  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, flexWrap: "wrap",
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.fg,
        borderRadius: 14,
        padding: "12px 14px",
        marginBottom: 16,
      }}
    >
      <div className="row" style={{ gap: 10 }}>
        <AlertTriangle size={18} style={{ color: colors.icon }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>
            {over ? t("limits.planLimitReached") : t("limits.usageLabel")}
            {" · "}
            {quotaText}
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>
            {over ? t("limits.upgradePrompt") : ""}
          </div>
        </div>
      </div>

      <Link to="/dashboard/billing">
        <button className="btn btn-sm" style={{ background: colors.icon, color: "#fff", border: "none" }}>
          <ArrowUpRight size={14} /> {t("limits.upgradeCta")}
        </button>
      </Link>
    </div>
  );
}