import { useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import { listSupport, updateSupport } from "../../services/admin";
import { useI18n } from "../../i18n/I18nContext";

const STATUS_KEY = {
  open: "admin.all",
  in_progress: "admin.inProgress",
  resolved: "admin.resolved",
  closed: "admin.closed",
};

export default function AdminSupport() {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function refresh() {
    setLoading(true);
    try { setRows(await listSupport({ status })); setError(""); }
    catch (e) { setError(e.message); }
    setLoading(false);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [status]);

  async function change(row, newStatus) {
    try { await updateSupport(row.id, newStatus); await refresh(); }
    catch (e) { alert(e.message); }
  }

  return (
    <div>
      <h1>{t("admin.support")}</h1>
      <p className="muted">{t("admin.supportSub")}</p>

      {error && <Alert variant="error">{error}</Alert>}

      <Card style={{ marginBottom: 12 }}>
        <select className="select" style={{ width: 200 }}
                value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t("admin.all")}</option>
          <option value="open">Open</option>
          <option value="in_progress">{t("admin.inProgress")}</option>
          <option value="resolved">{t("admin.resolved")}</option>
          <option value="closed">{t("admin.closed")}</option>
        </select>
      </Card>

      {loading ? <Card><p className="muted">{t("common.loading")}</p></Card>
       : rows.length === 0 ? <Card><p className="muted">{t("admin.noSupport")}</p></Card>
       : (
        <div className="stack">
          {rows.map((r) => (
            <Card key={r.id}>
              <div className="row-between" style={{ alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                    <span className="badge">{r.status}</span>
                    <span className="badge badge-warning">{r.priority}</span>
                  </div>
                  <div style={{ fontWeight: 600 }}>{r.subject}</div>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                    {r.business_name || "-"} · {r.user_email || "-"} ·{" "}
                    {new Date(r.created_at).toLocaleString(locale === "fr" ? "fr-CA" : "en-US")}
                  </div>
                  <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{r.body}</p>
                </div>
                <div className="stack" style={{ gap: 6 }}>
                  <Button variant="ghost" onClick={() => change(r, "in_progress")}>
                    {t("admin.inProgress")}
                  </Button>
                  <Button variant="primary" onClick={() => change(r, "resolved")}>
                    {t("admin.resolve")}
                  </Button>
                  <Button variant="ghost" onClick={() => change(r, "closed")}>
                    {t("admin.closed")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}