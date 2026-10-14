import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";

const tooltipStyle = {
  background: "var(--admin-card)",
  border: "1px solid var(--admin-border)",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 12px 30px rgba(20, 20, 60, 0.12)",
  color: "var(--admin-text)",
};

export function AdminAreaChart({
  data, dataKey, xKey = "label", color = "#7c5cff",
  height = 260, formatValue,
}) {
  const gid = "admin-grad-" + dataKey;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.55} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false} />
          <XAxis dataKey={xKey} stroke="var(--admin-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--admin-text-muted)" fontSize={11} tickLine={false} axisLine={false} width={40} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatValue ? formatValue(v) : v, ""]} />
          <Area
            type="monotone" dataKey={dataKey}
            stroke={color} strokeWidth={2.4}
            fill={`url(#${gid})`}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AdminDonut({ data, height = 260, centerLabel, centerValue }) {
  return (
    <div style={{ width: "100%", height, position: "relative" }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%" cy="50%"
            innerRadius="62%" outerRadius="92%"
            paddingAngle={3}
            strokeWidth={0}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      {(centerValue || centerLabel) && (
        <div
          style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          {centerValue && (
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.02 }}>
              {centerValue}
            </div>
          )}
          {centerLabel && (
            <div className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
              {centerLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}