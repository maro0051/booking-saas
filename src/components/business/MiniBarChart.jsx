import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export default function MiniBarChart({
  data,
  dataKey,
  xKey = "label",
  color = "var(--chart-1)",
  height = 200,
  formatValue,
}) {
  return (
    <div className="chart-wrap" style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--biz-border)" vertical={false} />
          <XAxis dataKey={xKey} stroke="var(--biz-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--biz-text-muted)" fontSize={11} tickLine={false} axisLine={false} width={36} />
          <Tooltip
            cursor={{ fill: "rgba(46, 125, 91, 0.06)" }}
            contentStyle={{
              background: "var(--biz-card)",
              border: "1px solid var(--biz-border)",
              borderRadius: 12,
              fontSize: 12,
              boxShadow: "0 12px 30px rgba(16, 40, 26, 0.10)",
            }}
            formatter={(v) => [formatValue ? formatValue(v) : v, ""]}
          />
          <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} maxBarSize={34} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}