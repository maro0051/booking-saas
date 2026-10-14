import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Alert from "../ui/Alert";
import { listTimeOffRequests, reviewTimeOff } from "../../services/staffInvite";
import { formatInTz } from "../../utils/datetime";
import { useI18n } from "../../i18n/I18nContext";

const STATUS_LABELS = {
  pending: "statusPending",
  approved: "statusApproved",
  denied: "statusDenied",
  cancelled: "statusCancelled",
};

export default function TimeOffRequests({ business }) {
  const { t } = useI18n();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const rows = await listTimeOffRequests(business.id);
      setRequests(rows);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [business.id]);

  async function decide(req, decision) {
    setBusy(req.id);
    try {
      await reviewTimeOff(req.id, decision);
      await refresh();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  const pending = requests.filter((r) => r.status === "pending");
  const others = requests.filter((r) => r.status !== "pending");

  return (
    <Card style={{ marginTop: 24 }}>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>{t("staffAdmin.timeOff")}</h3>
          <p className="muted text-sm" style={{ margin: "4px 0 0" }}>
            {t("staffPortal.timeOffSub")}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={refresh}>
          <RefreshCw size={13} /> {t("billing.refresh")}
        </button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <p className="muted">{t("common.loading")}</p>
      ) : requests.length === 0 ? (
        <p className="muted">{t("staffAdmin.noTimeOff")}</p>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="stack" style={{ gap: 8 }}>
              {pending.map((r) => (
                <div key={r.id} style={{
                  padding: 12,
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  flexWrap: "wrap",
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                      <span className="badge badge-warning">
                        {t("staffPortal.statusPending")}
                      </span>
                      <strong>{r.staff_name}</strong>
                    </div>
                    <div style={{ fontSize: 13 }}>
                      {formatInTz(r.starts_at, business.timezone, "EEE, MMM d, yyyy h:mm a")}
                      {" - "}
                      {formatInTz(r.ends_at, business.timezone, "EEE, MMM d, yyyy h:mm a")}
                    </div>
                    {r.reason && (
                      <div className="muted text-sm" style={{ marginTop: 4 }}>
                        {r.reason}
                      </div>
                    )}
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <Button
                      variant="primary"
                      disabled={busy === r.id}
                      onClick={() => decide(r, "approved")}
                    >
                      <CheckCircle2 size={14} /> {t("appointments.confirm")}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy === r.id}
                      onClick={() => decide(r, "denied")}
                    >
                      <XCircle size={14} /> {t("appointments.decline")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {others.length > 0 && (
            <>
              <h4 style={{ marginTop: pending.length > 0 ? 20 : 0, marginBottom: 8 }}>
                {t("staffPortal.requestsHistory")}
              </h4>
              <div className="stack" style={{ gap: 6 }}>
                {others.map((r) => {
                  const badge = r.status === "approved" ? "badge-success"
                    : r.status === "denied" ? "badge-danger"
                    : "badge";
                  return (
                    <div key={r.id} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      fontSize: 13,
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="row" style={{ gap: 8, marginBottom: 2 }}>
                          <span className={`badge ${badge}`}>
                            {t(`staffPortal.${STATUS_LABELS[r.status] || "statusPending"}`)}
                          </span>
                          <strong>{r.staff_name}</strong>
                        </div>
                        <div className="muted">
                          {formatInTz(r.starts_at, business.timezone, "MMM d, yyyy h:mm a")}
                          {" - "}
                          {formatInTz(r.ends_at, business.timezone, "MMM d, yyyy h:mm a")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
}