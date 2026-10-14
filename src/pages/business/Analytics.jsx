import { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import Card from "../../components/ui/Card";
import Alert from "../../components/ui/Alert";
import { useBusinessContext } from "../../hooks/useBusinessContext";
import { businessAnalytics } from "../../services/calendar";
import { formatMoney } from "../../utils/format";
import { useI18n } from "../../i18n/I18nContext";

const STATUS_COLORS = {
  pending: "#f59e0b",
  confirmed: "#10b981",
  cancelled: "#ef4444",
  completed: "#6366f1",
  no_show: "#dc2626",
  declined: "#f97316",
};

function rangeToDates(days) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from, to };
}

export default function BusinessAnalytics() {
  const business = useBusinessContext();
  const { t, locale } = useI18n();
  const [rangeKey, setRangeKey] = useState("30");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const RANGES = [
    { key: "7", label: t("analytics.range7") },
    { key: "30", label: t("analytics.range30") },
    { key: "90", label: t("analytics.range90") },
  ];

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const { from, to } = rangeToDates(Number(rangeKey));
    businessAnalytics({
      businessId: business.id,
      from: from.toISOString(),
      to: to.toISOString(),
    })
      .then((d) => { if (mounted) setData(d); })
      .catch((e) => { if (mounted) setError(e.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [business.id, rangeKey]);

  const chartData = useMemo(() => {
    if (!data?.by_day) return [];
    return data.by_day.map((d) => ({
      day: new Date(d.day).toLocaleDateString(locale === "fr" ? "fr-CA" : "en-US", {
        month: "short", day: "numeric",
      }),
      bookings: Number(d.bookings),
      revenue: Number(d.revenue_cents) / 100,
    }));
  }, [data, locale]);

  const serviceData = useMemo(() => {
    if (!data?.by_service) return [];
    return data.by_service.slice(0, 8).map((s) => ({
      name: s.service_name,
      bookings: Number(s.bookings),
      revenue: Number(s.revenue_cents) / 100,
    }));
  }, [data]);

  const staffData = useMemo(() => {
    if (!data?.by_staff) return [];
    return data.by_staff.map((s) => ({
      name: s.staff_name,
      bookings: Number(s.bookings),
    }));
  }, [data]);

  const statusData = useMemo(() => {
    if (!data?.by_status) return [];
    return data.by_status.map((s) => ({
      name: t(`appointments.${s.status === "no_show" ? "noShow" : s.status}`),
      value: Number(s.count),
      color: STATUS_COLORS[s.status] || "#94a3b8",
    }));
  }, [data, t]);

  if (loading && !data) return <Card><p className="muted">{t("common.loading")}</p></Card>;
  if (error) return <Alert variant="error">{error}</Alert>;
  if (!data) return null;

  const totals = data.totals;
  const avg = totals.bookings > 0 ? totals.revenue_cents / totals.bookings : 0;
  const cancelRate = totals.bookings > 0 ? Math.round((totals.cancelled / totals.bookings) * 100) : 0;
  const noShowRate = totals.bookings > 0 ? Math.round((totals.no_show / totals.bookings) * 100) : 0;

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 2 }}>{t("analytics.title")}</h1>
          <p className="muted" style={{ margin: 0 }}>{t("analytics.sub")}</p>
        </div>
        <div className="segmented">
          {RANGES.map((r) => (
            <button
              key={r.key}
              data-active={rangeKey === r.key}
              onClick={() => setRangeKey(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 16, marginBottom: 24,
      }}>
        <Card>
          <div className="text-xs muted">{t("analytics.bookings")}</div>
          <div style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }}>{totals.bookings}</div>
        </Card>
        <Card>
          <div className="text-xs muted">{t("analytics.revenue")}</div>
          <div style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }}>
            {formatMoney(totals.revenue_cents, business.currency)}
          </div>
        </Card>
        <Card>
          <div className="text-xs muted">{t("analytics.avgBooking")}</div>
          <div style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }}>
            {formatMoney(Math.round(avg), business.currency)}
          </div>
        </Card>
        <Card>
          <div className="text-xs muted">{t("analytics.cancellationRate")}</div>
          <div style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }}>{cancelRate}%</div>
        </Card>
        <Card>
          <div className="text-xs muted">{t("analytics.noShowRate")}</div>
          <div style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }}>{noShowRate}%</div>
        </Card>
        <Card>
          <div className="text-xs muted">{t("analytics.newCustomers")}</div>
          <div style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }}>{totals.new_customers}</div>
        </Card>
      </div>

      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>{t("analytics.bookingsOverTime")}</h3>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--fg-muted)" fontSize={12} />
              <YAxis yAxisId="left" stroke="var(--fg-muted)" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--fg-muted)" fontSize={12} />
              <Tooltip contentStyle={{
                background: "var(--bg-elev)", border: "1px solid var(--border)",
                borderRadius: 8, fontSize: 12,
              }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="left" type="monotone" dataKey="bookings"
                    stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="revenue"
                    stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid-2-responsive">
        <Card>
          <h3 style={{ marginTop: 0 }}>{t("analytics.topServicesRevenue")}</h3>
          {serviceData.length === 0 ? (
            <p className="muted">{t("analytics.noData")}</p>
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={serviceData} layout="vertical"
                          margin={{ top: 6, right: 12, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--fg-muted)" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="var(--fg-muted)"
                         fontSize={12} width={100} />
                  <Tooltip contentStyle={{
                    background: "var(--bg-elev)", border: "1px solid var(--border)",
                    borderRadius: 8, fontSize: 12,
                  }} />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <h3 style={{ marginTop: 0 }}>{t("analytics.bookingsByStaff")}</h3>
          {staffData.length === 0 ? (
            <p className="muted">{t("analytics.noData")}</p>
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={staffData}
                          margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--fg-muted)" fontSize={12} />
                  <YAxis stroke="var(--fg-muted)" fontSize={12} />
                  <Tooltip contentStyle={{
                    background: "var(--bg-elev)", border: "1px solid var(--border)",
                    borderRadius: 8, fontSize: 12,
                  }} />
                  <Bar dataKey="bookings" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>{t("analytics.bookingsByStatus")}</h3>
        {statusData.length === 0 ? (
          <p className="muted">{t("analytics.noData")}</p>
        ) : (
          <div className="grid-2-responsive" style={{ alignItems: "center" }}>
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name"
                       cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{
                    background: "var(--bg-elev)", border: "1px solid var(--border)",
                    borderRadius: 8, fontSize: 12,
                  }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="stack" style={{ gap: 6 }}>
              {statusData.map((s) => (
                <div key={s.name} className="row" style={{ gap: 10 }}>
                  <span style={{
                    width: 12, height: 12, borderRadius: 4,
                    background: s.color, display: "inline-block",
                  }} />
                  <span style={{ flex: 1 }}>{s.name}</span>
                  <span className="muted">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}