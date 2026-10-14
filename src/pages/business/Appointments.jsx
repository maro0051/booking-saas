import { useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";
import { useBusinessContext } from "../../hooks/useBusinessContext";
import { supabase } from "../../lib/supabaseClient";
import { formatInTz } from "../../utils/datetime";
import { formatMoney } from "../../utils/format";
import { useI18n } from "../../i18n/I18nContext";

const STATUS_KEY = {
  pending: "appointments.pending",
  confirmed: "appointments.confirmed",
  cancelled: "appointments.cancelled",
  completed: "appointments.completed",
  no_show: "appointments.noShow",
  declined: "appointments.declined",
};

const STATUS_BADGE = {
  pending: "badge-warning",
  confirmed: "badge-success",
  cancelled: "badge-danger",
  completed: "badge",
  no_show: "badge-danger",
  declined: "badge-danger",
};

export default function BusinessAppointments() {
  const business = useBusinessContext();
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      let q = supabase
        .from("appointments")
        .select(`
          id, reference, status, starts_at, ends_at, price_cents, currency,
          notes, internal_notes,
          service:services(name, duration_minutes),
          staff:staff(display_name),
          customer:customers(full_name, email, phone),
          location:locations(name)
        `)
        .eq("business_id", business.id)
        .order("starts_at", { ascending: false })
        .limit(200);
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, error: err } = await q;
      if (err) throw err;
      setItems(data || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line
  }, [business.id, statusFilter]);

  async function setStatus(appt, status) {
    const { error: err } = await supabase
      .from("appointments")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", appt.id);
    if (err) { alert(err.message); return; }
    await supabase.from("appointment_events").insert({
      appointment_id: appt.id,
      event_type: status,
      actor_kind: "business",
      metadata: { via: "dashboard" },
    });
    refresh();
  }

  const filtered = items.filter((a) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.reference?.toLowerCase().includes(s) ||
      a.customer?.full_name?.toLowerCase().includes(s) ||
      a.customer?.email?.toLowerCase().includes(s)
    );
  });

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 16 }}>
        <div>
          <h1>{t("appointments.title")}</h1>
          <p className="muted">{t("appointments.sub")}</p>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Card style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <input
            className="input"
            placeholder={t("appointments.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="select"
            style={{ width: 180 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">{t("appointments.allStatuses")}</option>
            <option value="pending">{t("appointments.pending")}</option>
            <option value="confirmed">{t("appointments.confirmed")}</option>
            <option value="completed">{t("appointments.completed")}</option>
            <option value="cancelled">{t("appointments.cancelled")}</option>
            <option value="no_show">{t("appointments.noShow")}</option>
          </select>
        </div>
      </Card>

      {loading ? <Card><p className="muted">{t("common.loading")}</p></Card>
       : filtered.length === 0 ? <Card><p className="muted">{t("calendar.noAppointments")}</p></Card>
       : (
        <Card>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("appointments.when")}</th>
                  <th>{t("appointments.customer")}</th>
                  <th>{t("appointments.service")}</th>
                  <th>{t("appointments.staffLabel")}</th>
                  <th>{t("appointments.reference")}</th>
                  <th>{t("appointments.status")}</th>
                  <th style={{ width: 220 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td data-label={t("appointments.when")} style={{ fontSize: 13 }}>
                      {formatInTz(a.starts_at, business.timezone, "MMM d, h:mm a")}
                    </td>
                    <td data-label={t("appointments.customer")}>
                      <div>{a.customer?.full_name || "-"}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {a.customer?.email || ""}
                      </div>
                    </td>
                    <td data-label={t("appointments.service")}>
                      {a.service?.name || "-"}
                    </td>
                    <td data-label={t("appointments.staffLabel")}>
                      {a.staff?.display_name || "-"}
                    </td>
                    <td data-label={t("appointments.reference")}>
                      <code style={{ fontSize: 12 }}>{a.reference}</code>
                    </td>
                    <td data-label={t("appointments.status")}>
                      <span className={`badge ${STATUS_BADGE[a.status] || "badge"}`}>
                        {t(STATUS_KEY[a.status] || "appointments.pending")}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {a.status === "pending" && (
                        <>
                          <Button variant="primary" onClick={() => setStatus(a, "confirmed")}>
                            {t("appointments.confirm")}
                          </Button>{" "}
                          <Button variant="ghost" onClick={() => setStatus(a, "declined")}>
                            {t("appointments.decline")}
                          </Button>
                        </>
                      )}
                      {a.status === "confirmed" && (
                        <>
                          <Button variant="ghost" onClick={() => setStatus(a, "completed")}>
                            {t("appointments.complete")}
                          </Button>{" "}
                          <Button variant="ghost" onClick={() => setStatus(a, "no_show")}>
                            {t("appointments.noShowAction")}
                          </Button>{" "}
                          <Button variant="danger" onClick={() => setStatus(a, "cancelled")}>
                            {t("appointments.cancel")}
                          </Button>
                        </>
                      )}
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