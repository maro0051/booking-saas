import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";
import { useAuth } from "../../hooks/useAuth";
import { getMyBookings } from "../../services/customer";
import { formatInTz } from "../../utils/datetime";
import { formatMoney } from "../../utils/format";
import { useI18n } from "../../i18n/I18nContext";
import FloatingLanguageSwitcher from "../../components/common/FloatingLanguageSwitcher";
import ThemeToggle from "../../components/common/ThemeToggle";

const STATUS_BADGE = {
  pending: "badge-warning",
  confirmed: "badge-success",
  cancelled: "badge-danger",
  completed: "badge",
  no_show: "badge-danger",
  declined: "badge-danger",
};

function statusKey(status) {
  const map = {
    pending: "appointments.pending",
    confirmed: "appointments.confirmed",
    cancelled: "appointments.cancelled",
    completed: "appointments.completed",
    no_show: "appointments.noShow",
    declined: "appointments.declined",
  };
  return map[status] || "appointments.pending";
}

export default function CustomerDashboard() {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("upcoming");

  async function refresh() {
    setLoading(true);
    try {
      setBookings(await getMyBookings());
      setError("");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line
  }, []);

  const now = Date.now();
  const upcoming = useMemo(
    () =>
      bookings
        .filter((b) => b.status === "pending" || b.status === "confirmed")
        .filter((b) => new Date(b.starts_at).getTime() >= now - 3_600_000)
        .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)),
    [bookings, now]
  );

  const past = useMemo(
    () =>
      bookings
        .filter(
          (b) =>
            b.status === "cancelled" ||
            b.status === "completed" ||
            b.status === "no_show" ||
            b.status === "declined" ||
            new Date(b.starts_at).getTime() < now - 3_600_000
        )
        .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at)),
    [bookings, now]
  );

  const list = tab === "upcoming" ? upcoming : past;

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <FloatingLanguageSwitcher />
      <div className="row-between" style={{ marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: 2 }}>{t("customer.myBookings")}</h1>
          <p className="muted" style={{ margin: 0 }}>{user?.email}</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <ThemeToggle compact />
          <Link to="/customer/profile">
            <Button variant="ghost">{t("nav.myProfile")}</Button>
          </Link>
          <Button variant="ghost" onClick={signOut}>
            {t("common.signOut")}
          </Button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <Button
          variant={tab === "upcoming" ? "primary" : "ghost"}
          onClick={() => setTab("upcoming")}
        >
          {t("customer.upcoming")} ({upcoming.length})
        </Button>
        <Button
          variant={tab === "past" ? "primary" : "ghost"}
          onClick={() => setTab("past")}
        >
          {t("customer.past")} ({past.length})
        </Button>
      </div>

      {loading ? (
        <Card><p className="muted">{t("common.loading")}</p></Card>
      ) : list.length === 0 ? (
        <Card><p className="muted">{t("customer.noBookings")}</p></Card>
      ) : (
        <div className="stack">
          {list.map((b) => (
            <Card key={b.id}>
              <div className="row-between" style={{ alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ gap: 8, marginBottom: 6 }}>
                    <span className={`badge ${STATUS_BADGE[b.status] || "badge"}`}>
                      {t(statusKey(b.status))}
                    </span>
                    <code className="muted" style={{ fontSize: 12 }}>{b.reference}</code>
                  </div>
                  <div style={{ fontWeight: 600 }}>{b.service_name}</div>
                  <div className="muted" style={{ fontSize: 13 }}>{b.business_name}</div>
                  <div style={{ marginTop: 6, fontSize: 14 }}>
                    {formatInTz(b.starts_at, b.business_timezone, "EEEE, MMM d, yyyy 'at' h:mm a")}
                  </div>
                  {b.staff_name && (
                    <div className="muted" style={{ fontSize: 13 }}>
                      {t("booking.professional")}: {b.staff_name}
                    </div>
                  )}
                  {b.location_name && (
                    <div className="muted" style={{ fontSize: 13 }}>{b.location_name}</div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ marginBottom: 6 }}>{formatMoney(b.price_cents, b.currency)}</div>
                  <Link to={`/book/${b.business_slug}/confirmation/${b.reference}`}>
                    <Button variant="ghost">{t("common.open")}</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}