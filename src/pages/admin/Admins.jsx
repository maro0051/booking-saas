import { useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import Alert from "../../components/ui/Alert";
import { listAdmins } from "../../services/admin";
import { useI18n } from "../../i18n/I18nContext";

export default function AdminAdmins() {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    listAdmins()
      .then((d) => { if (mounted) setRows(d); })
      .catch((e) => { if (mounted) setError(e.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <div>
      <h1>{t("admin.admins")}</h1>
      <p className="muted">{t("admin.adminsSub")}</p>

      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        {loading ? <p className="muted">{t("common.loading")}</p>
         : rows.length === 0 ? <p className="muted">{t("admin.noAdmins")}</p>
         : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("common.email")}</th>
                  <th>{t("admin.granted")}</th>
                  <th>{t("admin.notes")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.user_id}>
                    <td data-label={t("common.email")}>{r.email}</td>
                    <td data-label={t("admin.granted")}>
                      {new Date(r.granted_at).toLocaleString(locale === "fr" ? "fr-CA" : "en-US")}
                    </td>
                    <td data-label={t("admin.notes")}>{r.notes || "-"}</td>
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