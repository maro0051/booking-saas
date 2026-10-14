import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import Card from "../../components/ui/Card";
import Alert from "../../components/ui/Alert";
import { myBookings } from "../../services/staffPortal";
import { useI18n } from "../../i18n/I18nContext";
import { formatInTz, todayInTz } from "../../utils/datetime";

export default function StaffDashboard() {
  const { t } = useI18n();
  const [staff, setStaff] = useState(null);
  const [today, setToday] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const row = await import("../../services/staffPortal").then((m) => m.myStaffRow());
        if (!mounted) return;
        setStaff(row);
        if (!row) { setError("Not a staff member"); setLoading(false); return; }

        const tz = row.business_timezone;
        const todayStr = todayInTz(tz);
        const dayStart = new Date(`${todayStr}T00:00:00`);
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
        const weekEnd = new Date(dayStart); weekEnd.setDate(weekEnd.getDate() + 7);

        const [todayRows, upcomingRows] = await Promise.all([
          myBookings(dayStart.toISOString(), dayEnd.toISOString()),
          myBookings(dayEnd.toISOString(), weekEnd.toISOString()),
        ]);
        if (!mounted) return;
        setToday(todayRows);
        setUpcoming(upcomingRows);
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const greeting = useMemo(() => {
    if (!staff) return "";
    return t("staffPortal.welcomeHello", { name: staff.display_name });
  }, [staff, t]);

  if (loading) return <Card><p className="muted">{t("common.loading")}</p></Card>;
  if (error) return <Alert variant="error">{error}</Alert>;
  if (!staff) return null;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h1 style={{ marginBottom: 4 }}>{greeting}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {t("staffPortal.yourBusiness", { business: staff.business_name })}
        </p>
      </div>

      <div className="grid-2-responsive">
        <Card>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{t("staffPortal.todaysBookings")}</h3>
            <span className="text-xs muted">{today.length}</span>
          </div>
          {today.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center" }}>
              <Clock size={22} style={{ color: "var(--fg-subtle)" }} />
              <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
                {t("staff.noBookingsToday")}
              </p>
            </div>
          ) : (
            <div className="stack" style={{ gap: 6 }}>
              {today.map((b) => (
                <div key={b.id} style={{
                  display: "flex", gap: 12, padding: 10,
                  border: "1px solid var(--border)", borderRadius: 10,
                }}>
                  <div style={{ minWidth: 60, fontWeight: 600, color: "var(--accent)", fontSize: 13 }}>
                    {formatInTz(b.starts_at, staff.business_timezone, "h:mm a")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500 }} className="truncate">{b.service_name}</div>
                    <div className="text-xs muted truncate">
                      {b.customer_name}
                      {b.location_name ? ` - ${b.location_name}` : ""}
                    </div>
                  </div>
                  <span className="badge">{b.status}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{t("staffPortal.upcomingBookings")}</h3>
            <Link to="/staff/schedule" className="text-xs muted">
              {t("common.viewAll")} <ArrowRight size={12} />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>{t("staff.noBookings")}</p>
          ) : (
            <div className="stack" style={{ gap: 6 }}>
              {upcoming.slice(0, 6).map((b) => (
                <div key={b.id} className="row" style={{ gap: 10, fontSize: 13 }}>
                  <Calendar size={14} style={{ color: "var(--fg-muted)", flexShrink: 0 }} />
                  <span className="muted" style={{ minWidth: 90 }}>
                    {formatInTz(b.starts_at, staff.business_timezone, "EEE h:mm a")}
                  </span>
                  <span className="truncate">{b.service_name}</span>
                </div>
              ))}
              {upcoming.length > 6 && (
                <Link to="/staff/schedule" className="text-xs">
                  + {upcoming.length - 6}
                </Link>
              )}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <p className="muted text-sm" style={{ margin: 0 }}>
          {t("staffPortal.readOnlyHint")}
        </p>
      </Card>
    </div>
  );
}