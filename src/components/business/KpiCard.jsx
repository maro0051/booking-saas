import { TrendingUp, TrendingDown } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

// A tiny inline sparkline. data = array of numbers.
function Sparkline({ data, color = "var(--accent)", width = 90, height = 36 }) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} aria-hidden="true" />;
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - 4 - ((v - min) / range) * (height - 8);
    return `${x},${y}`;
  });
  const path = `M${points.join(" L")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = "brand",
  sparkline,
  sparklineColor,
}) {
  const { t } = useI18n();
  const positive = (delta ?? 0) >= 0;

  const toneColor = {
    brand:   "var(--accent)",
    success: "#10b981",
    warning: "#f59e0b",
    danger:  "#ef4444",
    purple:  "#8b5cf6",
  }[tone] || "var(--accent)";

  const toneBg = {
    brand:   "rgba(46, 125, 91, 0.10)",
    success: "rgba(16, 185, 129, 0.12)",
    warning: "rgba(245, 158, 11, 0.12)",
    danger:  "rgba(239, 68, 68, 0.12)",
    purple:  "rgba(139, 92, 246, 0.12)",
  }[tone] || "rgba(46, 125, 91, 0.10)";

  return (
    <div className="biz-card biz-card-hover">
      <div className="row-between" style={{ alignItems: "flex-start", marginBottom: 10 }}>
        {Icon && (
          <div
            style={{
              width: 42, height: 42, borderRadius: 14,
              background: toneBg, color: toneColor,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Icon size={20} />
          </div>
        )}
        <span className="text-xs" style={{ color: "var(--biz-text-muted)", fontWeight: 600 }}>
          {label}
        </span>
      </div>

      <div className="row-between" style={{ alignItems: "flex-end", gap: 8 }}>
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: -0.02,
            lineHeight: 1.05,
            color: "var(--biz-text)",
          }}
        >
          {value}
        </div>
        {sparkline && (
          <Sparkline data={sparkline} color={sparklineColor || toneColor} />
        )}
      </div>

      {delta !== undefined && delta !== null && (
        <div
          className="row"
          style={{
            gap: 4, marginTop: 8,
            color: positive ? "#059669" : "#dc2626",
            fontWeight: 600, fontSize: 12,
          }}
        >
          {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {Math.abs(delta)}% {t("business.vsLastMonth")}
        </div>
      )}
    </div>
  );
}