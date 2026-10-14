import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";
import StaffAvatar from "../../components/public/StaffAvatar";
import BackButton from "../../components/common/BackButton";
import {
  getPublicBusiness,
  getAvailability,
  getAvailabilityAnyStaff,
} from "../../services/publicBooking";
import { formatInTz, todayInTz, addDays } from "../../utils/datetime";
import { formatMoney, formatMinutes } from "../../utils/format";

export default function PublicServiceBooking() {
  const { businessSlug, serviceId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const prefillSlot = searchParams.get("slot") || "";

  const [business, setBusiness] = useState(null);
  const [service, setService] = useState(null);
  const [loadError, setLoadError] = useState("");

  const [staffId, setStaffId] = useState("");       // "" = no preference
  const [date, setDate] = useState("");
  const [locationId, setLocationId] = useState("");
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(prefillSlot);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState("");

  // Load business + service
  useEffect(() => {
    let mounted = true;
    getPublicBusiness(businessSlug)
      .then((b) => {
        if (!mounted) return;
        setBusiness(b);
        const sv = b?.services?.find((x) => x.id === serviceId);
        setService(sv || null);
        if (b && !date) {
          if (prefillSlot) {
            setDate(formatInTz(prefillSlot, b.timezone, "yyyy-MM-dd"));
          } else {
            setDate(todayInTz(b.timezone));
          }
        }
      })
      .catch((e) => { if (mounted) setLoadError(e.message); });
    return () => { mounted = false; };
    // eslint-disable-next-line
  }, [businessSlug, serviceId]);

  // Eligible staff for this service
  const eligibleStaff = useMemo(() => {
    if (!business || !service) return [];
    return (business.staff || []).filter((s) =>
      s.service_ids?.includes(service.id)
    );
  }, [business, service]);

  const hasStaff = eligibleStaff.length > 0;

  // Load slots based on staff choice
  useEffect(() => {
    if (!service || !date) return;
    let mounted = true;
    setLoadingSlots(true);
    setSlotError("");

    const useSpecific = !!staffId;

    const call = useSpecific
      ? getAvailability({
          slug: businessSlug,
          serviceId: service.id,
          date,
          staffId,
          locationId: locationId || null,
        })
      : (hasStaff
          ? getAvailabilityAnyStaff({
              slug: businessSlug,
              serviceId: service.id,
              date,
              locationId: locationId || null,
            })
          : getAvailability({
              slug: businessSlug,
              serviceId: service.id,
              date,
              staffId: null,
              locationId: locationId || null,
            })
        );

    call
      .then((s) => {
        if (!mounted) return;
        setSlots(s);
        // drop prefill if not present
        if (slot && !s.includes(slot)) setSlot("");
      })
      .catch((e) => { if (mounted) { setSlotError(e.message); setSlots([]); } })
      .finally(() => { if (mounted) setLoadingSlots(false); });

    return () => { mounted = false; };
    // eslint-disable-next-line
  }, [businessSlug, service, date, staffId, locationId, hasStaff]);

  function handleContinue() {
    if (!slot) return;
    const params = new URLSearchParams();
    params.set("slot", slot);
    if (staffId) params.set("staff", staffId);
    if (locationId) params.set("location", locationId);
    navigate(
      `/book/${businessSlug}/service/${service.id}/get-started?${params.toString()}`
    );
  }

  if (loadError) return <Alert variant="error">{loadError}</Alert>;
  if (!business) return <Card><p className="muted">Loadingâ€¦</p></Card>;
  if (!service) return <Alert variant="error">Service not available.</Alert>;

  const dates = Array.from({ length: 14 }, (_, i) =>
    addDays(todayInTz(business.timezone), i)
  );

  return (
    <div className="stack">
      <Card>
        <div className="row" style={{ gap: 6, marginBottom: 6 }}>
          <Link to={`/book/${businessSlug}`} className="muted text-sm">
            â† {business.name}
          </Link>
        </div>
        <h1 style={{ marginBottom: 4 }}>{service.name}</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          {formatMinutes(service.duration_minutes)} Â·{" "}
          {formatMoney(service.price_cents, service.currency || business.currency)}
        </p>
      </Card>

      {/* Step 1 â€” Choose a professional (only when staff exist) */}
      {hasStaff && (
        <Card>
          <h3 style={{ marginTop: 0 }}>1. Choose a professional</h3>
          <p className="muted text-sm" style={{ marginTop: 0, marginBottom: 14 }}>
            {eligibleStaff.length === 1
              ? "This service is performed by one professional."
              : "Pick who you'd like, or let us choose for you."}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={() => { setStaffId(""); setSlot(""); }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 8, padding: "14px 12px",
                borderRadius: 12, cursor: "pointer",
                border: `1px solid ${staffId === "" ? "var(--accent)" : "var(--border)"}`,
                background: staffId === "" ? "var(--accent-soft)" : "var(--bg-elev)",
                transition: "border-color 120ms ease, background 120ms ease, transform 120ms ease",
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 999,
                background: "var(--bg-sunken)",
                border: "2px solid var(--bg-elev)",
                boxShadow: "0 0 0 1px var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--fg-muted)", fontSize: 20, fontWeight: 600,
              }}>?</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>No preference</div>
                <div className="muted text-xs">First available</div>
              </div>
            </button>

            {eligibleStaff.map((s) => {
              const selected = staffId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setStaffId(s.id); setSlot(""); }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    gap: 8, padding: "14px 12px",
                    borderRadius: 12, cursor: "pointer",
                    border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                    background: selected ? "var(--accent-soft)" : "var(--bg-elev)",
                    transition: "border-color 120ms ease, background 120ms ease, transform 120ms ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  <StaffAvatar
                    name={s.display_name}
                    color={s.color}
                    imageUrl={s.photo_url}
                    size={48}
                  />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {s.display_name}
                    </div>
                    {s.title && <div className="muted text-xs">{s.title}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Step 2 â€” Choose a date */}
      <Card>
        <h3 style={{ marginTop: 0 }}>{hasStaff ? "2" : "1"}. Choose a date</h3>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
          {dates.map((d) => {
            const active = d === date;
            return (
              <button
                key={d}
                type="button"
                onClick={() => { setDate(d); setSlot(""); }}
                className="btn"
                style={{
                  minWidth: 76, flexDirection: "column", padding: "8px 10px",
                  background: active ? "var(--accent)" : undefined,
                  color: active ? "#fff" : undefined,
                  borderColor: active ? "var(--accent)" : undefined,
                }}
              >
                <span style={{ fontSize: 11, opacity: 0.85 }}>
                  {new Date(d + "T00:00:00Z").toLocaleDateString("en-US",
                    { weekday: "short", timeZone: "UTC" })}
                </span>
                <span style={{ fontWeight: 600 }}>
                  {new Date(d + "T00:00:00Z").toLocaleDateString("en-US",
                    { month: "short", day: "numeric", timeZone: "UTC" })}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Step 3 â€” Choose a time */}
      <Card>
        <h3 style={{ marginTop: 0 }}>{hasStaff ? "3" : "2"}. Choose a time</h3>
        <p className="muted text-sm" style={{ marginTop: 0, marginBottom: 12 }}>
          {staffId
            ? `Showing ${eligibleStaff.find((s) => s.id === staffId)?.display_name}'s availability.`
            : hasStaff
              ? "Showing slots with any available professional."
              : "Showing all available times."}
        </p>

        {slotError && <Alert variant="error">{slotError}</Alert>}
        {loadingSlots ? (
          <p className="muted">Loadingâ€¦</p>
        ) : slots.length === 0 ? (
          <p className="muted">
            No slots available on this date. Try another day
            {staffId ? " or pick another professional" : ""}.
          </p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {slots.map((s) => {
              const label = formatInTz(s, business.timezone, "h:mm a");
              const selected = slot === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlot(s)}
                  className="btn"
                  style={{
                    background: selected ? "var(--accent)" : undefined,
                    color: selected ? "#fff" : undefined,
                    borderColor: selected ? "var(--accent)" : undefined,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Optional location picker */}
      {business.locations?.length > 1 && slot && (
        <Card>
          <h3 style={{ marginTop: 0 }}>Location (optional)</h3>
          <select
            className="select"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            <option value="">Any location</option>
            {business.locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </Card>
      )}

      {/* Continue */}
      {slot && (
        <Card>
          <div className="row-between" style={{ alignItems: "center", gap: 12 }}>
            <div>
              <div className="muted text-xs">Selected</div>
              <div style={{ fontWeight: 500 }}>
                {formatInTz(slot, business.timezone, "EEE, MMM d 'at' h:mm a")}
                {staffId && eligibleStaff.find((s) => s.id === staffId)
                  ? ` Â· ${eligibleStaff.find((s) => s.id === staffId).display_name}`
                  : hasStaff
                    ? " Â· No preference"
                    : ""}
              </div>
            </div>
            <Button variant="primary" onClick={handleContinue}>
              Continue
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}