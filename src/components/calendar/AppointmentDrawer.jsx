import { X, CheckCircle2, XCircle, Ban, UserX, Clock } from "lucide-react";
import Button from "../ui/Button";
import { formatInTz } from "../../utils/datetime";
import { formatMoney, formatMinutes } from "../../utils/format";
import { supabase } from "../../lib/supabaseClient";
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

export default function AppointmentDrawer({
  appointment, timezone, onClose, onChange, onReschedule,
}) {
  const { t } = useI18n();
  if (!appointment) return null;
  const a = appointment;

  async function setStatus(status) {
    const { error } = await supabase
      .from("appointments")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", a.id);
    if (error) { alert(error.message); return; }
    await supabase.from("appointment_events").insert({
      appointment_id: a.id,
      event_type: status,
      actor_kind: "business",
      metadata: { via: "calendar" },
    });
    onChange?.();
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer">
        <div className="row-between" style={{ marginBottom: 16 }}>
          <div>
            <div className={`badge ${STATUS_BADGE[a.status] || "badge"}`}>
              {t(STATUS_KEY[a.status] || "appointments.pending")}
            </div>
            <div className="text-xs muted" style={{ marginTop: 6 }}>
              <code>{a.reference}</code>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t("common.close")}>
            <X size={16} />
          </button>
        </div>

        <h2 style={{ marginBottom: 4 }}>{a.service_name}</h2>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          {formatMinutes(
            a.ends_at && a.starts_at
              ? Math.round((new Date(a.ends_at) - new Date(a.starts_at)) / 60000)
              : 0
          )}
          {" - "}
          {formatMoney(a.price_cents, a.currency)}
        </p>

        <div className="stack" style={{ marginTop: 16 }}>
          <div>
            <div className="text-xs muted">{t("booking.when")}</div>
            <div>{formatInTz(a.starts_at, timezone, "EEEE, MMM d, yyyy 'at' h:mm a")}</div>
          </div>
          {a.staff_name && (
            <div>
              <div className="text-xs muted">{t("appointments.staffLabel")}</div>
              <div>{a.staff_name}</div>
            </div>
          )}
          {a.location_name && (
            <div>
              <div className="text-xs muted">{t("booking.location")}</div>
              <div>{a.location_name}</div>
            </div>
          )}
          <div>
            <div className="text-xs muted">{t("appointments.customer")}</div>
            <div>{a.customer_name}</div>
            <div className="text-xs muted">{a.customer_email}</div>
            {a.customer_phone && <div className="text-xs muted">{a.customer_phone}</div>}
          </div>
          {a.notes && (
            <div>
              <div className="text-xs muted">{t("booking.notes")}</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{a.notes}</div>
            </div>
          )}
          {a.internal_notes && (
            <div>
              <div className="text-xs muted">Internal notes</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{a.internal_notes}</div>
            </div>
          )}
        </div>

        <div className="stack" style={{ marginTop: 24, gap: 8 }}>
          {a.status === "pending" && (
            <>
              <Button variant="primary" onClick={() => setStatus("confirmed")}>
                <CheckCircle2 size={15} /> {t("appointments.confirm")}
              </Button>
              <Button variant="ghost" onClick={() => setStatus("declined")}>
                <XCircle size={15} /> {t("appointments.decline")}
              </Button>
            </>
          )}
          {a.status === "confirmed" && (
            <>
              <Button onClick={() => onReschedule?.(a)}>
                <Clock size={15} /> {t("booking.reschedule")}
              </Button>
              <Button variant="primary" onClick={() => setStatus("completed")}>
                <CheckCircle2 size={15} /> {t("appointments.complete")}
              </Button>
              <Button variant="ghost" onClick={() => setStatus("no_show")}>
                <UserX size={15} /> {t("appointments.noShowAction")}
              </Button>
              <Button variant="danger" onClick={() => setStatus("cancelled")}>
                <Ban size={15} /> {t("appointments.cancel")}
              </Button>
            </>
          )}
          {(a.status === "cancelled" || a.status === "no_show" || a.status === "completed") && (
            <p className="muted text-sm">{t("staff.readOnlyHint")}</p>
          )}
        </div>
      </aside>
    </>
  );
}