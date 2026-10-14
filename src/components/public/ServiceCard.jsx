import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, DollarSign } from "lucide-react";
import { getNextSlotsForService } from "../../services/publicBooking";
import { formatInTz } from "../../utils/datetime";
import { formatMoney, formatMinutes } from "../../utils/format";
import StaffAvatar from "./StaffAvatar";
import { useI18n } from "../../i18n/I18nContext";

export default function ServiceCard({
  businessSlug, service, currency, timezone, staff = [],
}) {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getNextSlotsForService({
      slug: businessSlug,
      serviceId: service.id,
      daysAhead: 5,
      maxPerDay: 3,
    })
      .then((rows) => { if (mounted) setSlots(rows.slice(0, 6)); })
      .catch(() => { if (mounted) setSlots([]); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [businessSlug, service.id]);

  function pickSlot(slotIso) {
    navigate(`/book/${businessSlug}/service/${service.id}?slot=${encodeURIComponent(slotIso)}`);
  }

  function goBook() {
    navigate(`/book/${businessSlug}/service/${service.id}`);
  }

  const eligibleStaff = staff.filter((s) => s.service_ids?.includes(service.id));
  const loc = locale === "fr" ? "fr-CA" : "en-US";

  return (
    <div className="card card-interactive" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="row-between" style={{ alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{service.name}</div>
          {service.description && (
            <div className="muted text-sm" style={{ marginTop: 2 }}>{service.description}</div>
          )}

          {eligibleStaff.length > 0 && (
            <div className="row" style={{ gap: 6, marginTop: 8 }}>
              <div className="row" style={{ gap: -8 }}>
                {eligibleStaff.slice(0, 4).map((s, i) => (
                  <div key={s.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                    <StaffAvatar
                      name={s.display_name}
                      color={s.color}
                      imageUrl={s.photo_url}
                      size={22}
                    />
                  </div>
                ))}
              </div>
              <span className="muted text-xs">
                {eligibleStaff.length === 1
                  ? eligibleStaff[0].display_name
                  : `${eligibleStaff.length} ${t("staffAdmin.title").toLowerCase()}`}
              </span>
            </div>
          )}
        </div>
        <div style={{ textAlign: "right", fontSize: 13, flexShrink: 0 }}>
          <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
            <Clock size={14} /> {formatMinutes(service.duration_minutes)}
          </div>
          <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
            <DollarSign size={14} />
            {formatMoney(service.price_cents, service.currency || currency)}
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
        <div className="text-xs muted" style={{ marginBottom: 6 }}>
          {loading ? t("booking.findingTimes")
           : slots.length === 0 ? t("booking.noSlotsNext")
           : t("booking.nextAvailable")}
        </div>

        {!loading && slots.length > 0 && (
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {slots.map((s, i) => {
              const label = formatInTz(s.starts_at, timezone, "EEE h:mm a");
              return (
                <button key={`${s.starts_at}-${i}`} type="button" onClick={() => pickSlot(s.starts_at)}
                  style={{
                    padding: "6px 10px",
                    border: "1px solid var(--border)", borderRadius: 8,
                    background: "var(--bg-elev)", fontSize: 12.5, cursor: "pointer",
                    fontWeight: 500,
                    transition: "background 120ms ease, border-color 120ms ease, transform 120ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}>
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <div className="row" style={{ gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-primary" onClick={goBook} style={{ minWidth: 100 }}>
            {t("booking.book")}
          </button>
        </div>
      </div>
    </div>
  );
}