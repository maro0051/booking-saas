import { useEffect, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Card from "../../components/ui/Card";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import { myStaffRow, myBookings } from "../../services/staffPortal";
import { useI18n } from "../../i18n/I18nContext";
import { formatInTz } from "../../utils/datetime";

const RANGES = [
  { key: "week", days: 7 },
  { key: "month", days: 30 },
  { key: "past", days: -30 },
];

export default function StaffSchedule() {
  const { t } = useI18n();
  const [staff, setStaff] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState("week");

  async function load(rangeKey) {
    setLoading(true);
    setError("");
    try {
      const row = staff || (await myStaffRow());
      setStaff(row);
      if (!row) return;

      const days = RANGES.find((r) => r.key === rangeKey).days;
      const now = new Date();
      let from, to;
      if (days >= 0) {
        from = now;
        to = new Date();
        to.setDate(to.getDate() + days);
      } else {
        from = new Date();
        from.setDate(from.getDate() + days);
        to = now;
      }

      const data = await myBookings(from.toISOString(), to.toISOString());
      setRows(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(range);
    // eslint-disable-next-line
  }, [range]);

  if (loading && !staff) return <Card><p className="muted">{t("common.loading")}</p></Card>;
  if (error) return <Alert variant="error">{error}</Alert>;
  if (!staff) return null;

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 2 }}>{t("staffPortal.schedule")}</h1>
          <p className="muted" style={{ margin: 0 }}>{t("staffPortal.scheduleSub")}</p>
        </div>
        <div className="segmented">
          {RANGES.map((r) => (
            <button
              key={r.key}
              data-active={range === r.key}
              onClick={() => setRange(r.key)}
            >
              {r.key === "week" ? "7d"
               : r.key === "month" ? "30d"
               : t("common.past")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card><p className="muted">{t("common.loading")}</p></Card>
      ) : rows.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <Calendar size={24} style={{ color: "var(--fg-subtle)" }} />
            <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
              {t("staff.noBookings")}
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("appointments.when")}</th>
                  <th>{t("appointments.service")}</th>
                  <th>{t("appointments.customer")}</th>
                  <th>{t("booking.location")}</th>
                  <th>{t("appointments.status")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id}>
                    <td data-label={t("appointments.when")} style={{ fontSize: 13 }}>
                      {formatInTz(b.starts_at, staff.business_timezone, "EEE, MMM d, h:mm a")}
                    </td>
                    <td data-label={t("appointments.service")}>{b.service_name}</td>
                    <td data-label={t("appointments.customer")}>
                      <div>{b.customer_name}</div>
                      <div className="muted text-xs">{b.customer_email}</div>
                    </td>
                    <td data-label={t("booking.location")}>{b.location_name || "-"}</td>
                    <td data-label={t("appointments.status")}>
                      <span className="badge">
                        {t(`appointments.${b.status === "no_show" ? "noShow" : b.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}