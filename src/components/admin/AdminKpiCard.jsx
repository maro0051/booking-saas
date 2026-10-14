import { TrendingUp, TrendingDown } from "lucide-react";

function Sparkline({ data, color = "#7c5cff", width = 90, height = 34 }) {
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
      <path d={path} fill="none" stroke={color} strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * variant: "violet" | "teal" | "blue" | "pink" | "amber"
 */
export default function AdminKpiCard({
  label, value, delta, sparkline, sparklineColor, variant = "violet", hint,
}) {
  const palette = {
    violet: { accent: "#7c5cff", soft: "rgba(124,92,255,.12)" },
    teal:   { accent: "#22d3a5", soft: "rgba(34,211,165,.12)" },
    blue:   { accent: "#4f8cff", soft: "rgba(79,140,255,.12)" },
    pink:   { accent: "#f472b6", soft: "rgba(244,114,182,.12)" },
    amber:  { accent: "#fbbf24", soft: "rgba(251,191,36,.14)" },
  }[variant] || { accent: "#7c5cff", soft: "rgba(124,92,255,.12)" };

  const positive = (delta ?? 0) >= 0;

  return (
    <div className="admin-card admin-card-hover">
      <div className="row-between" style={{ marginBottom: 10 }}>
        <span className="text-xs" style={{ color: "var(--admin-text-muted)", fontWeight: 600 }}>
          {label}
        </span>
      </div>

      <div className="row-between" style={{ alignItems: "flex-end", gap: 8 }}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: -0.02,
            lineHeight: 1.05,
            color: "var(--admin-text)",
          }}
        >
          {value}
        </div>
        {sparkline && (
          <Sparkline data={sparkline} color={sparklineColor || palette.accent} />
        )}
      </div>

      {delta !== undefined && delta !== null && (
        <div
          className="row"
          style={{
            gap: 4, marginTop: 8,
            color: positive ? "#16a34a" : "#dc2626",
            fontWeight: 600, fontSize: 12,
          }}
        >
          {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {Math.abs(delta)}%
          {hint && (
            <span style={{ color: "var(--admin-text-muted)", fontWeight: 500, marginLeft: 4 }}>
              {hint}
            </span>
          )}
        </div>
      )}
    </div>
  );
}