import { useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import { listAuditLogs } from "../../services/admin";
import { useI18n } from "../../i18n/I18nContext";

const PAGE_SIZE = 50;

export default function AdminAuditLogs() {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    listAuditLogs({ action, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
      .then((data) => {
        if (!mounted) return;
        setRows(data);
        setTotal(data[0]?.total_count ? Number(data[0].total_count) : 0);
      })
      .catch((e) => { if (mounted) setError(e.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [action, page]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1>{t("admin.audit")}</h1>
      <p className="muted">{t("admin.auditSub")}</p>

      {error && <Alert variant="error">{error}</Alert>}

      <Card style={{ marginBottom: 12 }}>
        <input
          className="input"
          placeholder={t("admin.auditFilter")}
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(0); }}
        />
      </Card>

      <Card>
        {loading ? <p className="muted">{t("common.loading")}</p>
         : rows.length === 0 ? <p className="muted">{t("admin.noEntries")}</p>
         : (
          <>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("appointments.when")}</th>
                    <th>{t("staffAdmin.titleCol")}</th>
                    <th>{t("admin.actions")}</th>
                    <th>{t("admin.plans")}</th>
                    <th>{t("admin.businesses")}</th>
                    <th>Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td data-label={t("appointments.when")} style={{ fontSize: 13 }}>
                        {new Date(r.created_at).toLocaleString(locale === "fr" ? "fr-CA" : "en-US")}
                      </td>
                      <td data-label={t("staffAdmin.titleCol")}>{r.actor_role || "-"}</td>
                      <td data-label={t("admin.actions")}>
                        <code style={{ fontSize: 12 }}>{r.action}</code>
                      </td>
                      <td data-label={t("admin.plans")} style={{ fontSize: 12 }}>
                        {r.target_table} {r.target_id}
                      </td>
                      <td data-label={t("admin.businesses")}>{r.business_name || "-"}</td>
                      <td data-label="Metadata" style={{ fontSize: 12 }}>
                        <code style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(r.metadata)}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="row-between" style={{ marginTop: 12 }}>
              <span className="muted" style={{ fontSize: 13 }}>
                {t("admin.page", { page: page + 1, pages: pageCount })} · {t("admin.totalCount", { n: total })}
              </span>
              <div className="row" style={{ gap: 8 }}>
                <Button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  {t("admin.previous")}
                </Button>
                <Button disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>
                  {t("admin.next")}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}