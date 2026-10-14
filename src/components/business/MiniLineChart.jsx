import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export default function MiniLineChart({
  data,
  dataKey,
  xKey = "label",
  color = "var(--chart-2)",
  height = 200,
  formatValue,
}) {
  const gid = "grad-" + dataKey;
  return (
    <div className="chart-wrap" style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--biz-border)" vertical={false} />
          <XAxis dataKey={xKey} stroke="var(--biz-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--biz-text-muted)" fontSize={11} tickLine={false} axisLine={false} width={36} />
          <Tooltip
            contentStyle={{
              background: "var(--biz-card)",
              border: "1px solid var(--biz-border)",
              borderRadius: 12,
              fontSize: 12,
              boxShadow: "0 12px 30px rgba(16, 40, 26, 0.10)",
            }}
            formatter={(v) => [formatValue ? formatValue(v) : v, ""]}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gid})`}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}