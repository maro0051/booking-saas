import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";
import { getBusiness, setBusinessStatus } from "../../services/admin";
import { formatInTz } from "../../utils/datetime";
import { useI18n } from "../../i18n/I18nContext";

export default function AdminBusinessDetail() {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    try { setData(await getBusiness(id)); setError(""); }
    catch (e) { setError(e.message); }
    setLoading(false);
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [id]);

  async function changeStatus(status) {
    const label = status === "active" ? t("admin.statusActive")
      : status === "suspended" ? t("admin.statusSuspended")
      : t("admin.statusClosed");
    if (!confirm(t("admin.setStatus", { status: label }))) return;
    setBusy(true);
    try { await setBusinessStatus(id, status); await refresh(); }
    catch (e) { alert(e.message); }
    setBusy(false);
  }

  if (loading) return <Card><p className="muted">{t("common.loading")}</p></Card>;
  if (error) return <Alert variant="error">{error}</Alert>;
  if (!data || !data.business) return <Alert variant="error">{t("common.noData")}</Alert>;

  const b = data.business;

  return (
    <div>
      <Link to="/admin/businesses" className="muted" style={{ fontSize: 13 }}>
        ← {t("admin.businesses")}
      </Link>
      <div className="row-between" style={{ marginTop: 6, marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{b.name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            <code>/{b.slug}</code> · {b.timezone} · {b.currency}
          </p>
        </div>
        <span className={`badge ${
          b.status === "active" ? "badge-success"
          : b.status === "suspended" ? "badge-danger" : "badge-warning"
        }`} style={{ fontSize: 13, padding: "6px 12px" }}>
          {b.status === "active" ? t("admin.statusActive")
            : b.status === "suspended" ? t("admin.statusSuspended")
            : b.status === "pending" ? t("admin.statusPending")
            : t("admin.statusClosed")}
        </span>
      </div>

      <div className="grid-2-responsive">
        <Card>
          <h3>{t("admin.actions")}</h3>
          <div className="stack">
            {b.status !== "active" && (
              <Button variant="primary" disabled={busy} onClick={() => changeStatus("active")}>
                {t("admin.activateBusiness")}
              </Button>
            )}
            {b.status === "active" && (
              <Button variant="danger" disabled={busy} onClick={() => changeStatus("suspended")}>
                {t("admin.suspendBusiness")}
              </Button>
            )}
            {b.status !== "closed" && (
              <Button variant="ghost" disabled={busy} onClick={() => changeStatus("closed")}>
                {t("admin.closeBusiness")}
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <h3>{t("settings.profile")}</h3>
          <div className="stack" style={{ fontSize: 14 }}>
            <div><span className="muted">{t("settings.contactEmail")}: </span>{b.contact_email || "-"}</div>
            <div><span className="muted">{t("settings.contactPhone")}: </span>{b.contact_phone || "-"}</div>
            <div>
              <span className="muted">{t("admin.created")}: </span>
              {new Date(b.created_at).toLocaleString(locale === "fr" ? "fr-CA" : "en-US")}
            </div>
            <div>
              <span className="muted">{t("settings.requireAccount")}: </span>
              {b.require_account_to_book ? t("common.yes") : t("common.no")}
            </div>
            <div>
              <span className="muted">{t("settings.autoConfirm")}: </span>
              {b.auto_confirm_bookings ? t("common.yes") : t("common.no")}
            </div>
          </div>
        </Card>
      </div>

      <Card style={{ marginTop: 16 }}>
        <h3>{t("admin.members")}</h3>
        {data.members.length === 0 ? <p className="muted">{t("common.noData")}</p> : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("common.email")}</th>
                  <th>{t("staffAdmin.titleCol")}</th>
                  <th>{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((m) => (
                  <tr key={m.id}>
                    <td data-label={t("common.email")}>{m.email}</td>
                    <td data-label={t("staffAdmin.titleCol")}>{m.role}</td>
                    <td data-label={t("common.status")}>{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3>{t("admin.appointments")}</h3>
        {data.recent_appointments.length === 0 ? <p className="muted">{t("calendar.noAppointments")}</p> : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("appointments.reference")}</th>
                  <th>{t("appointments.when")}</th>
                  <th>{t("appointments.status")}</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_appointments.map((a) => (
                  <tr key={a.id}>
                    <td data-label={t("appointments.reference")}>
                      <code style={{ fontSize: 12 }}>{a.reference}</code>
                    </td>
                    <td data-label={t("appointments.when")} style={{ fontSize: 13 }}>
                      {formatInTz(a.starts_at, b.timezone, "MMM d, yyyy h:mm a")}
                    </td>
                    <td data-label={t("appointments.status")}>{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}