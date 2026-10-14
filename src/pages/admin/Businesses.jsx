import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";
import { listBusinesses } from "../../services/admin";
import { useI18n } from "../../i18n/I18nContext";

const PAGE_SIZE = 25;

export default function AdminBusinesses() {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    listBusinesses({ search, status, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
      .then((data) => {
        if (!mounted) return;
        setRows(data);
        setTotal(data[0]?.total_count ? Number(data[0].total_count) : 0);
      })
      .catch((e) => { if (mounted) setError(e.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [search, status, page]);

  function updateSearch(v) { setSearch(v); setPage(0); }
  function updateStatus(v) { setStatus(v); setPage(0); }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 16 }}>
        <div>
          <h1>{t("admin.businesses")}</h1>
          <p className="muted">{t("admin.businessesSub")}</p>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Card style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <input
            className="input"
            placeholder={t("admin.businessesSearch")}
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
          />
          <select
            className="select"
            style={{ width: 180 }}
            value={status}
            onChange={(e) => updateStatus(e.target.value)}
          >
            <option value="">{t("admin.allStatuses")}</option>
            <option value="active">{t("admin.statusActive")}</option>
            <option value="suspended">{t("admin.statusSuspended")}</option>
            <option value="pending">{t("admin.statusPending")}</option>
            <option value="closed">{t("admin.statusClosed")}</option>
          </select>
        </div>
      </Card>

      <Card>
        {loading ? <p className="muted">{t("common.loading")}</p>
         : rows.length === 0 ? <p className="muted">{t("common.noData")}</p>
         : (
          <>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("admin.planName")}</th>
                    <th>{t("admin.code")}</th>
                    <th>{t("common.status")}</th>
                    <th>{t("admin.members")}</th>
                    <th>{t("admin.appointments")}</th>
                    <th>{t("admin.created")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => (
                    <tr key={b.id}>
                      <td data-label={t("admin.planName")} style={{ fontWeight: 500 }}>{b.name}</td>
                      <td data-label={t("admin.code")}>
                        <code style={{ fontSize: 12 }}>/{b.slug}</code>
                      </td>
                      <td data-label={t("common.status")}>
                        <span className={`badge ${
                          b.status === "active" ? "badge-success"
                          : b.status === "suspended" ? "badge-danger"
                          : "badge-warning"
                        }`}>
                          {b.status === "active" ? t("admin.statusActive")
                            : b.status === "suspended" ? t("admin.statusSuspended")
                            : b.status === "pending" ? t("admin.statusPending")
                            : t("admin.statusClosed")}
                        </span>
                      </td>
                      <td data-label={t("admin.members")}>{b.members_count}</td>
                      <td data-label={t("admin.appointments")}>{b.appointments_count}</td>
                      <td data-label={t("admin.created")} style={{ fontSize: 13 }}>
                        {new Date(b.created_at).toLocaleDateString(locale === "fr" ? "fr-CA" : "en-US")}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link to={`/admin/businesses/${b.id}`}>
                          <Button variant="ghost">{t("admin.manage")}</Button>
                        </Link>
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