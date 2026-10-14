import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Card from "../../components/ui/Card";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import {
  myStaffRow, myTimeOffRequests, requestTimeOff, cancelTimeOff,
} from "../../services/staffPortal";
import { useI18n } from "../../i18n/I18nContext";
import { formatInTz } from "../../utils/datetime";

const STATUS_KEY = {
  pending: "staffPortal.statusPending",
  approved: "staffPortal.statusApproved",
  denied: "staffPortal.statusDenied",
  cancelled: "staffPortal.statusCancelled",
};

const STATUS_BADGE = {
  pending: "badge-warning",
  approved: "badge-success",
  denied: "badge-danger",
  cancelled: "badge",
};

export default function StaffTimeOff() {
  const { t } = useI18n();
  const [staff, setStaff] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ starts_at: "", ends_at: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [row, reqs] = await Promise.all([myStaffRow(), myTimeOffRequests()]);
      setStaff(row);
      setRequests(reqs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    if (!form.starts_at || !form.ends_at) return;

    const startsAt = new Date(form.starts_at);
    const endsAt = new Date(form.ends_at);

    if (startsAt.getTime() - Date.now() < 24 * 3600 * 1000) {
      setSubmitError(t("staffPortal.rule24h"));
      return;
    }

    setSubmitting(true);
    try {
      await requestTimeOff({
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        reason: form.reason,
      });
      setForm({ starts_at: "", ends_at: "", reason: "" });
      await load();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(id) {
    if (!confirm(t("staffPortal.cancelRequest") + "?")) return;
    try {
      await cancelTimeOff(id);
      await load();
    } catch (e) {
      alert(e.message);
    }
  }

  if (loading) return <Card><p className="muted">{t("common.loading")}</p></Card>;
  if (error) return <Alert variant="error">{error}</Alert>;
  if (!staff) return <Alert variant="error">{t("auth.notStaffHere")}</Alert>;

  return (
    <div>
      <h1>{t("staffPortal.timeOff")}</h1>
      <p className="muted">{t("staffPortal.timeOffSub")}</p>

      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>{t("staffPortal.newRequest")}</h3>
        <p className="muted text-sm">{t("staffPortal.rule24h")}</p>

        {submitError && <Alert variant="error">{submitError}</Alert>}

        <form onSubmit={handleSubmit} className="stack">
          <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
            <Input label={t("staffPortal.requestStarts")} type="datetime-local"
                   value={form.starts_at}
                   onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))} required />
            <Input label={t("staffPortal.requestEnds")} type="datetime-local"
                   value={form.ends_at}
                   onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))} required />
          </div>
          <Input label={t("staffPortal.requestReason")} value={form.reason}
                 onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
          <div>
            <Button variant="primary" type="submit" disabled={submitting}>
              <Plus size={14} /> {submitting ? t("staffPortal.submitting") : t("staffPortal.submitRequest")}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>{t("staffPortal.requestsHistory")}</h3>
        {requests.length === 0 ? (
          <p className="muted">{t("staffPortal.noRequestsYet")}</p>
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            {requests.map((r) => (
              <div key={r.id} style={{
                padding: 12, border: "1px solid var(--border)", borderRadius: 12,
                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                gap: 12, flexWrap: "wrap",
              }}>
                <div style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                    <span className={`badge ${STATUS_BADGE[r.status] || "badge"}`}>
                      {t(STATUS_KEY[r.status] || "staffPortal.statusPending")}
                    </span>
                  </div>
                  <div style={{ fontSize: 13 }}>
                    {formatInTz(r.starts_at, staff.business_timezone, "EEE, MMM d, yyyy h:mm a")}
                    {" - "}
                    {formatInTz(r.ends_at, staff.business_timezone, "EEE, MMM d, yyyy h:mm a")}
                  </div>
                  {r.reason && (
                    <div className="muted text-sm" style={{ marginTop: 4 }}>{r.reason}</div>
                  )}
                  {r.review_notes && (
                    <div className="muted text-xs" style={{ marginTop: 4 }}>
                      {r.review_notes}
                    </div>
                  )}
                </div>
                {r.status === "pending" && (
                  <Button variant="ghost" onClick={() => handleCancel(r.id)}>
                    <Trash2 size={14} /> {t("staffPortal.cancelRequest")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}