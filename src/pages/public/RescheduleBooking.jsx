import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import BackButton from "../../components/common/BackButton";
import {
  getBookingByReference,
  getAvailability,
} from "../../services/publicBooking";
import { rescheduleByReference } from "../../services/customer";
import { formatInTz, todayInTz, addDays } from "../../utils/datetime";

export default function RescheduleBooking() {
  const { businessSlug, reference } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let mounted = true;
    getBookingByReference(businessSlug, reference)
      .then((b) => {
        if (!mounted) return;
        if (!b) { setError("Booking not found."); return; }
        setBooking(b);
        setDate(todayInTz(b.business.timezone));
      })
      .catch((e) => { if (mounted) setError(e.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [businessSlug, reference]);

  // Load slots once the customer is verified
  useEffect(() => {
    if (!verified || !booking || !date) return;
    let mounted = true;
    setLoadingSlots(true); setSlotError(""); setSlot("");
    getAvailability({
      slug: businessSlug,
      serviceId: booking.service.id,
      date,
      staffId: booking.staff?.id || null,
      locationId: booking.location?.id || null,
    })
      .then((s) => { if (mounted) setSlots(s); })
      .catch((e) => { if (mounted) { setSlotError(e.message); setSlots([]); } })
      .finally(() => { if (mounted) setLoadingSlots(false); });
    return () => { mounted = false; };
  }, [verified, booking, date, businessSlug]);

  function handleVerify(e) {
    e.preventDefault();
    setVerifyError("");
    const masked = booking?.customer?.email_masked || "";
    // Simple client-side pre-check; the server enforces the real check.
    if (!email.includes("@")) { setVerifyError("Enter the email used to book."); return; }
    setVerified(true);
  }

  async function handleReschedule() {
    setSubmitError("");
    if (!slot) return;
    setSubmitting(true);
    try {
      await rescheduleByReference({
        slug: businessSlug,
        reference,
        email,
        newStartsAt: slot,
        newStaffId: booking.staff?.id || null,
        newLocationId: booking.location?.id || null,
      });
      navigate(`/book/${businessSlug}/confirmation/${reference}`);
    } catch (err) {
      setSubmitError(err.message || "Could not reschedule.");
      // refresh slots
      getAvailability({
        slug: businessSlug, serviceId: booking.service.id, date,
        staffId: booking.staff?.id || null, locationId: booking.location?.id || null,
      }).then(setSlots).catch(() => {});
      setSlot("");
    } finally { setSubmitting(false); }
  }

  if (loading) return <Card><p className="muted">Loadingâ€¦</p></Card>;
  if (error) return <Alert variant="error">{error}</Alert>;
  if (!booking) return <Alert variant="error">Booking not found.</Alert>;

  const dates = booking.business.timezone
    ? Array.from({ length: 14 }, (_, i) => addDays(todayInTz(booking.business.timezone), i))
    : [];

  return (
    <div className="stack">
      <Card>
        <Link to={`/book/${businessSlug}/confirmation/${reference}`} className="muted" style={{ fontSize: 13 }}>
          â† Back to booking
        </Link>
        <h1 style={{ marginBottom: 4, marginTop: 6 }}>Reschedule</h1>
        <p className="muted">
          Current: {formatInTz(booking.starts_at, booking.business.timezone,
            "EEEE, MMM d 'at' h:mm a")}
        </p>
      </Card>

      {!verified ? (
        <Card>
          <h3>Verify your email</h3>
          <p className="muted" style={{ fontSize: 13 }}>
            Enter the email you used when booking.
          </p>
          {verifyError && <Alert variant="error">{verifyError}</Alert>}
          <form onSubmit={handleVerify} className="stack">
            <Input label="Email" type="email" value={email}
                   onChange={(e) => setEmail(e.target.value)} required />
            <Button variant="primary" type="submit">Continue</Button>
          </form>
        </Card>
      ) : (
        <>
          <Card>
            <h3>Choose a new date</h3>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
              {dates.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDate(d)}
                  className="btn"
                  style={{
                    minWidth: 76, flexDirection: "column", padding: "8px 10px",
                    background: d === date ? "var(--color-primary)" : undefined,
                    color: d === date ? "#fff" : undefined,
                    borderColor: d === date ? "var(--color-primary)" : undefined,
                  }}
                >
                  <span style={{ fontSize: 11, opacity: 0.8 }}>
                    {new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h3>Available times</h3>
            {slotError && <Alert variant="error">{slotError}</Alert>}
            {loadingSlots ? <p className="muted">Loadingâ€¦</p>
             : slots.length === 0 ? <p className="muted">No slots on this date.</p>
             : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {slots.map((s) => {
                  const isSelected = slot === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      className="btn"
                      onClick={() => setSlot(s)}
                      style={{
                        background: isSelected ? "var(--color-primary)" : undefined,
                        color: isSelected ? "#fff" : undefined,
                        borderColor: isSelected ? "var(--color-primary)" : undefined,
                      }}
                    >
                      {formatInTz(s, booking.business.timezone, "h:mm a")}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {slot && (
            <Card>
              {submitError && <Alert variant="error">{submitError}</Alert>}
              <div className="muted" style={{ marginBottom: 10 }}>
                New time:{" "}
                <strong>{formatInTz(slot, booking.business.timezone,
                  "EEEE, MMM d 'at' h:mm a")}</strong>
              </div>
              <Button variant="primary" onClick={handleReschedule} disabled={submitting}>
                {submitting ? "Reschedulingâ€¦" : "Confirm reschedule"}
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  );
}