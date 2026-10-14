import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight, CreditCard,
} from "lucide-react";
import AdminKpiCard from "../../components/admin/AdminKpiCard";
import { AdminAreaChart, AdminDonut } from "../../components/admin/AdminCharts";
import { platformStats, dashboardAnalytics, listAuditLogs } from "../../services/admin";
import { formatMoney } from "../../utils/format";
import { useI18n } from "../../i18n/I18nContext";

const PLAN_COLORS = ["#7c5cff", "#22d3a5", "#4f8cff", "#f472b6", "#fbbf24"];

function deltaFromSeries(series, key) {
  if (!series || series.length < 2) return 0;
  const firstHalf = series.slice(0, 15).reduce((s, d) => s + (Number(d[key]) || 0), 0);
  const secondHalf = series.slice(15).reduce((s, d) => s + (Number(d[key]) || 0), 0);
  if (firstHalf === 0) return secondHalf > 0 ? 100 : 0;
  return Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
}

function timeAgo(iso, locale) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const fr = locale === "fr";
  if (diff < 60) return fr ? "à l'instant" : "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}${fr ? " min" : "m"}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${fr ? " h" : "h"}`;
  return `${Math.floor(diff / 86400)}${fr ? " j" : "d"}`;
}

export default function AdminDashboard() {
  const { t, locale } = useI18n();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.all([
      platformStats(),
      dashboardAnalytics(),
      listAuditLogs({ limit: 6 }),
    ])
      .then(([s, a, l]) => {
        if (!mounted) return;
        setStats(s);
        setAnalytics(a);
        setLogs(l);
      })
      .catch((e) => { if (mounted) setError(e.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const chartData = useMemo(() => {
    if (!analytics?.days) return [];
    const loc = locale === "fr" ? "fr-CA" : "en-US";
    return analytics.days.map((d) => ({
      label: new Date(d.day).toLocaleDateString(loc, { month: "short", day: "numeric" }),
      businesses: Number(d.new_businesses) || 0,
      customers: Number(d.new_customers) || 0,
      bookings: Number(d.bookings) || 0,
      revenue: Math.round((Number(d.revenue_cents) || 0) / 100),
    }));
  }, [analytics, locale]);

  const donutData = useMemo(() => {
    if (!analytics?.plan_breakdown) return [];
    return analytics.plan_breakdown
      .filter((p) => Number(p.count) > 0)
      .map((p, i) => ({
        name: p.plan_name,
        value: Number(p.count),
        color: PLAN_COLORS[i % PLAN_COLORS.length],
      }));
  }, [analytics]);

  const totalBusinessesPlanned = donutData.reduce((s, d) => s + d.value, 0);
  const topPlan = donutData.length
    ? donutData.reduce((a, b) => (a.value > b.value ? a : b))
    : null;
  const topPlanPct = totalBusinessesPlanned > 0 && topPlan
    ? Math.round((topPlan.value / totalBusinessesPlanned) * 100)
    : 0;

  const bookingsSparkline = useMemo(() => chartData.slice(-10).map((d) => d.bookings), [chartData]);
  const businessSparkline = useMemo(() => chartData.slice(-10).map((d) => d.businesses), [chartData]);
  const customerSparkline = useMemo(() => chartData.slice(-10).map((d) => d.customers), [chartData]);

  if (loading) return <div className="admin-card">{t("common.loading")}</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row-between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 2 }}>{t("admin.overview")}</h1>
          <p className="muted" style={{ margin: 0 }}>{t("admin.overviewSub")}</p>
        </div>
        <Link to="/admin/businesses">
          <button className="btn btn-primary">
            {t("admin.manageBusinesses")} <ArrowUpRight size={14} />
          </button>
        </Link>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
      }}>
        <AdminKpiCard
          label={t("admin.totalBusinesses")}
          value={stats.businesses}
          delta={deltaFromSeries(chartData, "businesses")}
          hint={t("common.growthHint")}
          sparkline={businessSparkline}
          variant="violet"
        />
        <AdminKpiCard
          label={t("admin.customers")}
          value={stats.customers}
          delta={deltaFromSeries(chartData, "customers")}
          hint={t("common.growthHint")}
          sparkline={customerSparkline}
          variant="teal"
        />
        <AdminKpiCard
          label={t("admin.appointments")}
          value={stats.appointments_total}
          delta={deltaFromSeries(chartData, "bookings")}
          hint={t("appointments.title")}
          sparkline={bookingsSparkline}
          variant="blue"
        />
        <AdminKpiCard
          label={t("admin.revenue30d")}
          value={formatMoney(stats.revenue_cents_30d, "CAD")}
          variant="pink"
        />
      </div>

      <div className="grid-2-responsive">
        <div className="admin-card">
          <div className="row-between" style={{ marginBottom: 8 }}>
            <div>
              <h3 style={{ margin: 0 }}>{t("admin.revenueOverview")}</h3>
              <div className="muted text-xs">{t("admin.last30")}</div>
            </div>
            <span className="badge">{t("admin.thisMonth")}</span>
          </div>
          {chartData.length === 0 ? (
            <p className="muted text-sm">{t("common.noData")}</p>
          ) : (
            <AdminAreaChart
              data={chartData}
              dataKey="revenue"
              height={260}
              color="#7c5cff"
              formatValue={(v) => formatMoney(Math.round(v * 100), "CAD")}
            />
          )}
        </div>

        <div className="admin-card">
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>{t("admin.planBreakdown")}</h3>
          {donutData.length === 0 ? (
            <p className="muted text-sm">{t("admin.noPlanBreakdown")}</p>
          ) : (
            <>
              <AdminDonut
                data={donutData}
                centerValue={`${topPlanPct}%`}
                centerLabel={topPlan?.name || ""}
                height={220}
              />
              <div className="stack" style={{ gap: 6, marginTop: 12 }}>
                {donutData.map((d) => (
                  <div key={d.name} className="row-between" style={{ fontSize: 13 }}>
                    <span className="row" style={{ gap: 8 }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: 4,
                        background: d.color, display: "inline-block",
                      }} />
                      {d.name}
                    </span>
                    <span className="muted">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid-2-responsive">
        <div className="admin-card">
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{t("admin.recentActivity")}</h3>
            <Link to="/admin/audit" className="text-xs muted">
              {t("common.viewAll")} →
            </Link>
          </div>
          {logs.length === 0 ? (
            <p className="muted text-sm">{t("admin.noActivity")}</p>
          ) : (
            <div className="stack" style={{ gap: 6 }}>
              {logs.map((l) => (
                <div key={l.id} className="row-between"
                     style={{
                       padding: "10px 12px",
                       border: "1px solid var(--admin-border)",
                       borderRadius: 12, fontSize: 13,
                     }}>
                  <div className="row" style={{ gap: 10, minWidth: 0 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 10,
                      background: "var(--admin-accent-soft)",
                      color: "var(--admin-accent)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <CreditCard size={14} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500 }} className="truncate">{l.action}</div>
                      <div className="muted text-xs truncate">
                        {l.business_name || l.target_table || ""}
                      </div>
                    </div>
                  </div>
                  <span className="muted text-xs" style={{ flexShrink: 0 }}>
                    {timeAgo(l.created_at, locale)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-card">
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>{t("admin.businessGrowth")}</h3>
          <AdminAreaChart data={chartData} dataKey="businesses" height={240} color="#22d3a5" />
        </div>
      </div>
    </div>
  );
}