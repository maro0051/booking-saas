import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CheckCircle2, CalendarPlus, MapPin, Navigation, XCircle, Clock,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import StaffAvatar from "../../components/public/StaffAvatar";
import BackButton from "../../components/common/BackButton";
import {
  getBookingByReference,
  cancelBookingByReference,
} from "../../services/publicBooking";
import { formatInTz } from "../../utils/datetime";
import { formatMoney } from "../../utils/format";
import { downloadBookingIcs, directionsUrl } from "../../utils/ics";

const STAGES = [
  { key: "created",   label: "Booked",     icon: Clock },
  { key: "confirmed", label: "Confirmed",  icon: CheckCircle2 },
  { key: "completed", label: "Completed",  icon: CheckCircle2 },
];

function Timeline({ booking }) {
  const cancelled = ["cancelled", "declined"].includes(booking.status);
  const currentIdx =
    booking.status === "pending" ? 0
    : booking.status === "confirmed" ? 1
    : booking.status === "completed" ? 2
    : 0;

  if (cancelled) {
    return (
      <div className="row" style={{ gap: 10 }}>
        <XCircle size={20} color="var(--danger-600)" />
        <span style={{ fontWeight: 500, color: "var(--danger-600)" }}>
          This booking was {booking.status}.
        </span>
      </div>
    );
  }

  return (
    <div className="row" style={{ gap: 0, alignItems: "flex-start" }}>
      {STAGES.map((stage, i) => {
        const Icon = stage.icon;
        const done = i <= currentIdx;
        return (
          <div key={stage.key} style={{ display: "flex", alignItems: "flex-start", flex: 1 }}>
            <div className="row" style={{ gap: 8, flex: "0 0 auto", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: 30, height: 30, borderRadius: 999,
                  background: done ? "var(--accent)" : "var(--bg-sunken)",
                  color: done ? "#fff" : "var(--fg-subtle)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: done ? "none" : "1px solid var(--border)",
                }}
              >
                <Icon size={14} />
              </div>
              <span
                className="text-xs"
                style={{
                  color: done ? "var(--fg)" : "var(--fg-muted)",
                  fontWeight: done ? 600 : 500,
                  whiteSpace: "nowrap",
                }}
              >
                {stage.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div
                style={{
                  height: 2, flex: 1, marginTop: 14,
                  background: i < currentIdx ? "var(--accent)" : "var(--border)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PublicConfirmation() {
  const { businessSlug, reference } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelEmail, setCancelEmail] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const b = await getBookingByReference(businessSlug, reference);
      if (!b) setError("Booking not found.");
      setBooking(b);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [businessSlug, reference]);

  async function handleCancel(e) {
    e.preventDefault();
    setCancelError("");
    setCancelling(true);
    try {
      await cancelBookingByReference(businessSlug, reference, cancelEmail);
      await load();
    } catch (err) {
      setCancelError(err.message || "Could not cancel this booking.");
    } finally { setCancelling(false); }
  }

  if (loading) return <Card><p className="muted">LoadingÃ¢â‚¬Â¦</p></Card>;
  if (error) return <Alert variant="error">{error}</Alert>;
  if (!booking) return <Alert variant="error">Booking not found.</Alert>;

  const canCancel = booking.status === "pending" || booking.status === "confirmed";
  const address = booking.location?.address;
  const directions = directionsUrl(address);

  return (
    <div className="stack">
      <Card>
        <div className="row" style={{ gap: 10 }}>
          <CheckCircle2 size={24} color="var(--color-success)" />
          <h1 style={{ margin: 0 }}>Booking {booking.status}</h1>
        </div>
        <p className="muted" style={{ marginBottom: 18 }}>
          Reference: <strong>{booking.reference}</strong>
        </p>

        <Timeline booking={booking} />
      </Card>

      <Card>
        <div className="stack">
          <div>
            <div className="muted text-xs">Business</div>
            <div style={{ fontWeight: 500 }}>{booking.business.name}</div>
          </div>
          <div>
            <div className="muted text-xs">Service</div>
            <div style={{ fontWeight: 500 }}>{booking.service.name}</div>
          </div>
          <div>
            <div className="muted text-xs">When</div>
            <div style={{ fontWeight: 500 }}>
              {formatInTz(booking.starts_at, booking.business.timezone,
                "EEEE, MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
          {booking.staff && (
            <div>
              <div className="muted text-xs">Professional</div>
              <div className="row" style={{ gap: 8, marginTop: 2 }}>
                <StaffAvatar
                  name={booking.staff.display_name}
                  color={booking.staff.color}
                  imageUrl={booking.staff.photo_url}
                  size={26}
                />
                <span>{booking.staff.display_name}</span>
              </div>
            </div>
          )}
          {booking.location && (
            <div>
              <div className="muted text-xs">Location</div>
              <div>{booking.location.name}</div>
              {address && (
                <div className="muted text-xs">
                  {[address.line1, address.city, address.region]
                    .filter(Boolean).join(", ")}
                </div>
              )}
            </div>
          )}
          <div>
            <div className="muted text-xs">Price</div>
            <div>{formatMoney(booking.price_cents, booking.currency)}</div>
          </div>
        </div>

        <div className="row" style={{ gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <Button
            onClick={() => downloadBookingIcs({
              reference: booking.reference,
              starts_at: booking.starts_at,
              ends_at: booking.ends_at,
              service_name: booking.service.name,
              business_name: booking.business.name,
              location_name: booking.location?.name,
              location_address: address
                ? [address.line1, address.city, address.region].filter(Boolean).join(", ")
                : null,
            })}
          >
            <CalendarPlus size={15} /> Add to calendar
          </Button>
          {directions && (
            <a href={directions} target="_blank" rel="noreferrer">
              <Button variant="ghost">
                <Navigation size={15} /> Get directions
              </Button>
            </a>
          )}
        </div>
      </Card>

      {canCancel && (
        <>
          <Card>
            <h3 style={{ marginTop: 0 }}>Move this booking</h3>
            <p className="muted text-sm" style={{ marginTop: 0 }}>
              Choose a new date and time. You'll verify your email there.
            </p>
            <Link to={`/book/${businessSlug}/reschedule/${reference}`}>
              <Button>Reschedule</Button>
            </Link>
          </Card>

          <Card>
            <h3 style={{ marginTop: 0 }}>Cancel this booking</h3>
            <p className="muted text-sm" style={{ marginTop: 0 }}>
              Enter the email you used to book to confirm.
            </p>
            {cancelError && <Alert variant="error">{cancelError}</Alert>}
            <form onSubmit={handleCancel} className="stack">
              <Input label="Email" type="email" value={cancelEmail}
                     onChange={(e) => setCancelEmail(e.target.value)} required />
              <Button variant="danger" type="submit" disabled={cancelling}>
                {cancelling ? "CancellingÃ¢â‚¬Â¦" : "Cancel booking"}
              </Button>
            </form>
          </Card>
        </>
      )}

      {booking.status === "completed" && (
        <Card>
          <h3 style={{ marginTop: 0 }}>Thanks for your visit</h3>
          <p className="muted text-sm" style={{ marginTop: 0 }}>
            Book again with {booking.business.name} Ã¢â‚¬â€ same service, new time.
          </p>
          <Link to={`/book/${businessSlug}`}>
            <Button variant="primary">
              <CalendarPlus size={15} /> Book again
            </Button>
          </Link>
        </Card>
      )}

      <div>
        <Link to={`/book/${businessSlug}`}>
          <Button variant="ghost">Ã¢â€ Â Back to {booking.business.name}</Button>
        </Link>
      </div>
    </div>
  );
}