import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar, Users, AlertCircle, DollarSign, Plus,
  CheckCircle2, Clock, Sparkles, ArrowUpRight,
} from "lucide-react";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";
import KpiCard from "../../components/business/KpiCard";
import PlanLimitBanner from "../../components/business/PlanLimitBanner";
import MiniLineChart from "../../components/business/MiniLineChart";
import MiniBarChart from "../../components/business/MiniBarChart";
import { useBusinessContext } from "../../hooks/useBusinessContext";
import { useRealtimeAppointments } from "../../hooks/useRealtimeAppointments";
import { useI18n } from "../../i18n/I18nContext";
import {
  businessAppointmentsRange,
  dashboardSummary,
  dashboardChartData,
} from "../../services/calendar";
import { billingSummary } from "../../services/billing";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import { listServices } from "../../services/services";
import { listStaff } from "../../services/staff";
import { listLocations } from "../../services/locations";
import AppointmentDrawer from "../../components/calendar/AppointmentDrawer";
import AppointmentFormModal from "../../components/calendar/AppointmentFormModal";
import { formatInTz, todayInTz } from "../../utils/datetime";
import { formatMoney } from "../../utils/format";

const STATUS_BADGE = {
  pending: "badge-warning",
  confirmed: "badge-success",
  cancelled: "badge-danger",
  completed: "badge",
  no_show: "badge-danger",
  declined: "badge-danger",
};

function pct(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export default function BusinessDashboard() {
  const business = useBusinessContext();
  const navigate = useNavigate();
  const { t } = useI18n();

  const { limits } = usePlanLimits(business.id);
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [billing, setBilling] = useState(null);
  const [today, setToday] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const refreshTimer = useRef(null);

  async function refresh() {
    setLoading(true);
    try {
      const todayStr = todayInTz(business.timezone);
      const dayStart = new Date(`${todayStr}T00:00:00`);
      const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
      const weekEnd = new Date(dayStart); weekEnd.setDate(weekEnd.getDate() + 7);

      const [s, c, b, tt, uu] = await Promise.all([
        dashboardSummary(business.id),
        dashboardChartData(business.id, 30),
        billingSummary(business.id),
        businessAppointmentsRange({
          businessId: business.id,
          from: dayStart.toISOString(),
          to: dayEnd.toISOString(),
        }),
        businessAppointmentsRange({
          businessId: business.id,
          from: dayEnd.toISOString(),
          to: weekEnd.toISOString(),
          status: "confirmed",
        }),
      ]);
      setSummary(s);
      setCharts(c);
      setBilling(b);
      setToday(tt);
      setUpcoming(uu);
      setError("");
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [business.id]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      listServices(business.id),
      listStaff(business.id),
      listLocations(business.id),
    ]).then(([s, st, l]) => {
      if (!mounted) return;
      setServices(s.filter((x) => x.is_active));
      setStaff(st.filter((x) => x.is_active));
      setLocations(l.filter((x) => x.is_active));
    }).catch(() => {});
    return () => { mounted = false; };
  }, [business.id]);

  useRealtimeAppointments(business.id, () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(refresh, 400);
  });

  const revenueDelta = useMemo(() => {
    if (!summary) return 0;
    return pct(summary.month_revenue_cents, summary.prev_month_revenue_cents);
  }, [summary]);
  const customerDelta = useMemo(() => {
    if (!summary) return 0;
    return pct(summary.month_new_customers, summary.prev_month_new_customers);
  }, [summary]);

  const bookingSparkline = useMemo(
    () => (charts?.byDay || []).slice(-10).map((d) => d.bookings),
    [charts]
  );
  const revenueSparkline = useMemo(
    () => (charts?.byDay || []).slice(-10).map((d) => d.revenue),
    [charts]
  );

  if (loading && !summary) {
    return <div className="biz-card">{t("common.loading")}</div>;
  }

  const pendingToday = today.filter((a) => a.status === "pending").length;
  const currentPlan = billing?.plan;

  return (
    <div className="stack" style={{ gap: 20 }}>
      {/* Hero */}
      <div
        className="biz-card"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          gap: 20,
          alignItems: "center",
          background:
            "linear-gradient(135deg, #8fd6b4 0%, #2e7d5b 100%)",
          color: "#fff",
          border: "none",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>
            {formatInTz(new Date(), business.timezone, "EEEE, MMMM d, yyyy")}
          </div>
          <h1
            style={{
              margin: "4px 0 8px",
              color: "#fff",
              fontSize: "clamp(22px, 3vw, 30px)",
              letterSpacing: -0.02,
            }}
          >
            {t("business.welcome")}, {business.name}
          </h1>
          <p style={{ margin: 0, opacity: 0.92, fontSize: 14 }}>
            {t("business.todaysAppointments")}: {summary?.today_count || 0}
            {" Â· "}
            {t("business.pendingRequests")}: {summary?.pending_count || 0}
          </p>

          <div className="row" style={{ gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <button
              className="btn btn-lg"
              onClick={() => navigate("/dashboard/calendar")}
              style={{
                background: "rgba(255,255,255,0.18)",
                borderColor: "rgba(255,255,255,0.35)",
                color: "#fff",
                backdropFilter: "blur(6px)",
              }}
            >
              <Calendar size={15} /> {t("business.openCalendar")}
            </button>
            <button
              className="btn btn-lg"
              disabled={limits && limits.can_add?.appointments === false}
              onClick={() => setShowForm(true)}
              style={{
                background: "#ffffff",
                borderColor: "#ffffff",
                color: "#1e5c43",
                fontWeight: 700,
              }}
            >
              <Plus size={15} /> {t("business.newAppointment")}
            </button>
          </div>
        </div>

        {/* Decorative rings â€” no images needed */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            right: -40, top: -40,
            width: 220, height: 220,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.10)",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 40, bottom: -60,
            width: 180, height: 180,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
          }}
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Plan banner */}
      {currentPlan && (
        <div
          className="biz-card"
          style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 12, flexWrap: "wrap",
            borderColor: "var(--accent)",
          }}
        >
          <div className="row" style={{ gap: 12 }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: "rgba(46, 125, 91, 0.10)",
                color: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div className="text-xs" style={{ color: "var(--biz-text-muted)" }}>
                {t("business.currentPlan")}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {currentPlan.name}
                {currentPlan.price_cents > 0 && (
                  <span className="muted" style={{ fontWeight: 500, fontSize: 13 }}>
                    {" Â· "}
                    {formatMoney(currentPlan.price_cents, currentPlan.currency)} / {currentPlan.interval}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Link to="/dashboard/billing">
            <button className="btn btn-primary btn-sm">
              <ArrowUpRight size={14} /> {t("business.managePlan")}
            </button>
          </Link>
        </div>
      )}

      <PlanLimitBanner limits={limits} resource="appointments" />
      {/* KPI row */}
      {summary && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <KpiCard
            label={t("common.today")}
            value={summary.today_count}
            icon={Calendar}
            tone="brand"
            sparkline={bookingSparkline}
          />
          <KpiCard
            label={t("business.pendingRequests")}
            value={summary.pending_count}
            icon={AlertCircle}
            tone={summary.pending_count > 0 ? "warning" : "brand"}
          />
          <KpiCard
            label={t("business.revenueThisMonth")}
            value={formatMoney(summary.month_revenue_cents, business.currency)}
            delta={revenueDelta}
            icon={DollarSign}
            tone="success"
            sparkline={revenueSparkline}
          />
          <KpiCard
            label={t("business.newCustomers")}
            value={summary.month_new_customers}
            delta={customerDelta}
            icon={Users}
            tone="purple"
          />
        </div>
      )}

      {/* Charts row */}
      {charts && (
        <div className="grid-2-responsive">
          <div className="biz-card">
            <div className="row-between" style={{ marginBottom: 6 }}>
              <h3 style={{ margin: 0 }}>{t("business.bookings30d")}</h3>
              <Link to="/dashboard/analytics" className="text-xs muted">
                {t("common.viewAll")} â†’
              </Link>
            </div>
            {charts.byDay.length === 0 ? (
              <p className="muted text-sm">{t("common.noData")}</p>
            ) : (
              <MiniLineChart
                data={charts.byDay}
                dataKey="bookings"
                height={240}
                color="var(--chart-2)"
              />
            )}
          </div>

          <div className="biz-card">
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>{t("business.topServices")}</h3>
            {charts.byService.length === 0 ? (
              <p className="muted text-sm">{t("common.noData")}</p>
            ) : (
              <MiniBarChart
                data={charts.byService}
                dataKey="bookings"
                height={240}
                color="var(--chart-1)"
              />
            )}
          </div>
        </div>
      )}

      {charts && charts.byDay.length > 0 && (
        <div className="biz-card">
          <h3 style={{ marginTop: 0, marginBottom: 6 }}>{t("business.revenue30d")}</h3>
          <MiniBarChart
            data={charts.byDay}
            dataKey="revenue"
            height={220}
            color="var(--chart-2)"
            formatValue={(v) => formatMoney(Math.round(v * 100), business.currency)}
          />
        </div>
      )}

      {/* Bottom row */}
      <div className="grid-2-responsive">
        <div className="biz-card">
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{t("business.todaysSchedule")}</h3>
            {today.length > 0 && (
              <span className="text-xs muted">
                {today.length} {t("business.scheduled")}
              </span>
            )}
          </div>
          {today.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center" }}>
              <Clock size={24} style={{ color: "var(--biz-text-muted)" }} />
              <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
                {t("business.noAppointmentsToday")}
              </p>
            </div>
          ) : (
            <div className="stack" style={{ gap: 6 }}>
              {today.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelected(a)}
                  style={{
                    display: "flex", gap: 12, width: "100%", textAlign: "left",
                    padding: 12, borderRadius: 12, cursor: "pointer",
                    border: "1px solid var(--biz-border)",
                    background: "var(--biz-card)",
                    transition: "border-color 140ms, transform 140ms, box-shadow 140ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(16,40,26,.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--biz-border)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{
                    minWidth: 60, fontSize: 13, fontWeight: 700,
                    color: "var(--accent)",
                  }}>
                    {formatInTz(a.starts_at, business.timezone, "h:mm a")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 500 }} className="truncate">
                        {a.service_name}
                      </span>
                      <span className={`badge ${STATUS_BADGE[a.status] || "badge"}`}>
                        {t(`appointments.${a.status === "no_show" ? "noShow" : a.status}`)}
                      </span>
                    </div>
                    <div className="text-xs muted truncate">
                      {a.customer_name}
                      {a.staff_name ? ` Â· ${a.staff_name}` : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <div className="biz-card">
            <h3 style={{ marginTop: 0 }}>{t("business.pendingRequests")}</h3>
            {pendingToday === 0 && (summary?.pending_count || 0) === 0 ? (
              <div className="row" style={{ gap: 8, color: "#059669" }}>
                <CheckCircle2 size={16} />
                <span>{t("business.allCaughtUp")}</span>
              </div>
            ) : (
              <>
                <p className="muted text-sm" style={{ marginTop: 0 }}>
                  {summary?.pending_count === 1
                    ? t("business.pendingSingular")
                    : t("business.pendingPlural", { n: summary?.pending_count || 0 })}
                </p>
                <Link to="/dashboard/appointments">
                  <Button variant="primary">{t("business.reviewRequests")}</Button>
                </Link>
              </>
            )}
          </div>

          <div className="biz-card">
            <h3 style={{ marginTop: 0 }}>{t("business.upcoming7d")}</h3>
            {upcoming.length === 0 ? (
              <p className="muted text-sm" style={{ margin: 0 }}>{t("business.nothingScheduled")}</p>
            ) : (
              <div className="stack" style={{ gap: 6 }}>
                {upcoming.slice(0, 5).map((a) => (
                  <div key={a.id} className="row" style={{ gap: 8, fontSize: 13 }}>
                    <span className="muted" style={{ minWidth: 70 }}>
                      {formatInTz(a.starts_at, business.timezone, "EEE h:mm a")}
                    </span>
                    <span className="truncate">{a.service_name}</span>
                  </div>
                ))}
                {upcoming.length > 5 && (
                  <Link to="/dashboard/calendar" className="text-xs">
                    {t("common.viewAll")} ({upcoming.length}) â†’
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="biz-card">
            <h3 style={{ marginTop: 0 }}>{t("business.publicBookingLink")}</h3>
            <p className="muted text-sm" style={{ marginTop: 0 }}>
              {t("business.publicBookingHint")}
            </p>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              <input
                className="input"
                readOnly
                value={`${window.location.origin}/book/${business.slug}`}
                style={{ fontSize: 12, minWidth: 0, flex: 1 }}
              />
              <Button
                size="sm"
                onClick={() => navigator.clipboard.writeText(
                  `${window.location.origin}/book/${business.slug}`
                )}
              >
                {t("common.copy")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AppointmentDrawer
        appointment={selected}
        timezone={business.timezone}
        onClose={() => setSelected(null)}
        onChange={async () => { setSelected(null); await refresh(); }}
        onReschedule={() => {}}
      />

      {showForm && (
        <AppointmentFormModal
          business={business}
          services={services}
          staff={staff}
          locations={locations}
          onClose={() => setShowForm(false)}
          onCreated={async () => { setShowForm(false); await refresh(); }}
        />
      )}
    </div>
  );
}