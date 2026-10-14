import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { UserPlus, LogIn, ArrowRight, CheckCircle2 } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import StaffAvatar from "../../components/public/StaffAvatar";
import BackButton from "../../components/common/BackButton";
import { supabase } from "../../lib/supabaseClient";
import {
  getPublicBusiness,
  createPublicBooking,
} from "../../services/publicBooking";
import { formatInTz } from "../../utils/datetime";
import { formatMoney, formatMinutes } from "../../utils/format";

export default function GetStarted() {
  const { businessSlug, serviceId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const slotIso = params.get("slot") || "";
  const staffId = params.get("staff") || "";
  const locationId = params.get("location") || "";

  const [business, setBusiness] = useState(null);
  const [service, setService] = useState(null);
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Inline auth state
  const [mode, setMode] = useState("choice"); // "choice" | "signin" | "signup" | "guest"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getPublicBusiness(businessSlug),
      supabase.auth.getUser(),
    ])
      .then(([b, { data }]) => {
        if (!mounted) return;
        setBusiness(b);
        const sv = b?.services?.find((x) => x.id === serviceId);
        setService(sv || null);
        const st = b?.staff?.find((x) => x.id === staffId);
        setStaff(st || null);
        setUser(data?.user || null);
      })
      .catch((e) => { if (mounted) setError(e.message); })
      .finally(() => {
        if (mounted) { setLoading(false); setAuthLoading(false); }
      });
    return () => { mounted = false; };
  }, [businessSlug, serviceId, staffId]);

  // If already signed in, skip the auth choice Ã¢â‚¬â€ go straight to confirm.
  useEffect(() => {
    if (!loading && user) setMode("choice"); // keep as "choice" so we show details form
  }, [loading, user]);

  async function signIn(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (err) { setFormError(err.message); return; }
    const { data } = await supabase.auth.getUser();
    setUser(data?.user || null);
    setMode("confirm");
  }

  async function signUp(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    const { error: err } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    });
    setSubmitting(false);
    if (err) { setFormError(err.message); return; }
    const { data } = await supabase.auth.getUser();
    setUser(data?.user || null);
    setMode("confirm");
  }

  async function bookAsGuest(e) {
    e.preventDefault();
    await confirmBooking();
  }

  async function confirmBooking(e) {
    if (e) e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      const finalName = fullName || u?.user_metadata?.full_name || "";
      const finalEmail = email || u?.email || "";

      const result = await createPublicBooking({
        slug: businessSlug,
        serviceId: service.id,
        startsAt: slotIso,
        fullName: finalName,
        email: finalEmail,
        phone: phone || null,
        staffId: staffId || null,
        locationId: locationId || null,
        notes: notes || null,
      });
      navigate(`/book/${businessSlug}/confirmation/${result.reference}`, {
        replace: true,
      });
    } catch (err) {
      setFormError(err.message || "Could not complete the booking.");
      setSubmitting(false);
    }
  }

  if (loading || authLoading) {
    return <Card><p className="muted">LoadingÃ¢â‚¬Â¦</p></Card>;
  }
  if (error) return <Alert variant="error">{error}</Alert>;
  if (!business || !service || !slotIso) {
    return (
      <Card>
        <h2>Missing details</h2>
        <p className="muted">
          Pick a service and a time before continuing.
        </p>
        <Link to={`/book/${businessSlug}`}>
          <Button variant="primary">Back to {business?.name || "business"}</Button>
        </Link>
      </Card>
    );
  }

  const accountRequired = business.require_account_to_book;
  const summaryRow = (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row-between">
        <span className="muted text-sm">Service</span>
        <span style={{ fontWeight: 500 }}>{service.name}</span>
      </div>
      <div className="row-between">
        <span className="muted text-sm">When</span>
        <span style={{ fontWeight: 500 }}>
          {formatInTz(slotIso, business.timezone, "EEE, MMM d 'at' h:mm a")}
        </span>
      </div>
      <div className="row-between">
        <span className="muted text-sm">Professional</span>
        {staff ? (
          <span className="row" style={{ gap: 8 }}>
            <StaffAvatar
              name={staff.display_name}
              color={staff.color}
              imageUrl={staff.photo_url}
              size={26}
            />
            <span style={{ fontWeight: 500 }}>{staff.display_name}</span>
          </span>
        ) : (
          <span className="row" style={{ gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 999,
              background: "var(--bg-sunken)",
              border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--fg-muted)", fontSize: 13, fontWeight: 600,
            }}>?</div>
            <span className="muted">No preference</span>
          </span>
        )}
      </div>
      <div className="row-between">
        <span className="muted text-sm">Duration</span>
        <span>{formatMinutes(service.duration_minutes)}</span>
      </div>
      <div className="row-between">
        <span className="muted text-sm">Price</span>
        <span>{formatMoney(service.price_cents, service.currency || business.currency)}</span>
      </div>
    </div>
  );

  return (
    <div className="stack" style={{ gap: 20, maxWidth: 640, margin: "0 auto" }}>
      <div>
        <Link
          to={`/book/${businessSlug}/service/${service.id}`}
          className="muted text-sm"
        >
          Ã¢â€ Â Change time or professional
        </Link>
      </div>

      <Card>
        <p className="muted text-xs" style={{ margin: 0 }}>{business.name}</p>
        <h1 style={{ margin: "4px 0 12px" }}>Confirm your booking</h1>
        {summaryRow}
      </Card>

      {formError && <Alert variant="error">{formError}</Alert>}

      {/* --- Get started --- */}
      {!user && mode === "choice" && (
        <Card>
          <div className="row" style={{ gap: 8, marginBottom: 6 }}>
            <CheckCircle2 size={16} style={{ color: "var(--accent)" }} />
            <span className="text-xs" style={{
              letterSpacing: 1.5, fontWeight: 600, color: "var(--accent)",
              textTransform: "uppercase",
            }}>
              Get started
            </span>
          </div>
          <h2 style={{ marginTop: 0, marginBottom: 4 }}>
            Almost there Ã¢â‚¬â€ how would you like to continue?
          </h2>
          <p className="muted text-sm" style={{ marginTop: 0 }}>
            {accountRequired
              ? `${business.name} requires an account to book. It takes under a minute.`
              : "Create an account to manage your bookings, or continue as a guest."}
          </p>

          <div className="stack" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => setMode("signup")}
              style={{ justifyContent: "flex-start" }}
            >
              <UserPlus size={16} /> Create an account
            </button>
            <button
              type="button"
              className="btn btn-lg"
              onClick={() => setMode("signin")}
              style={{ justifyContent: "flex-start" }}
            >
              <LogIn size={16} /> I already have an account
            </button>

            {!accountRequired && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setMode("guest")}
                style={{ justifyContent: "flex-start" }}
              >
                Continue as guest <ArrowRight size={14} />
              </button>
            )}
          </div>
        </Card>
      )}

      {!user && mode === "signin" && (
        <Card>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Sign in</h2>
            <button className="btn btn-ghost" onClick={() => setMode("choice")}>
              Back
            </button>
          </div>
          <form onSubmit={signIn} className="stack">
            <Input label="Email" type="email" value={email}
                   onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <Input label="Password" type="password" value={password}
                   onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? "Signing inÃ¢â‚¬Â¦" : "Sign in & confirm"}
            </Button>
          </form>
        </Card>
      )}

      {!user && mode === "signup" && (
        <Card>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Create an account</h2>
            <button className="btn btn-ghost" onClick={() => setMode("choice")}>
              Back
            </button>
          </div>
          <form onSubmit={signUp} className="stack">
            <Input label="Full name" value={fullName}
                   onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
            <Input label="Email" type="email" value={email}
                   onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <Input label="Password" type="password" minLength={8} value={password}
                   onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? "CreatingÃ¢â‚¬Â¦" : "Create account & confirm"}
            </Button>
          </form>
        </Card>
      )}

      {/* --- Confirm (signed-in or guest) --- */}
      {(user || mode === "guest") && (
        <Card>
          <h2 style={{ marginTop: 0 }}>Your details</h2>
          <form onSubmit={confirmBooking} className="stack">
            {user ? (
              <>
                <p className="muted text-sm" style={{ margin: 0 }}>
                  Booking as <strong>{user.email}</strong>. We'll send
                  confirmation here.
                </p>
                <Input label="Phone (optional)" value={phone}
                       onChange={(e) => setPhone(e.target.value)} />
              </>
            ) : (
              <>
                <Input label="Full name" value={fullName}
                       onChange={(e) => setFullName(e.target.value)} required />
                <Input label="Email" type="email" value={email}
                       onChange={(e) => setEmail(e.target.value)} required />
                <Input label="Phone (optional)" value={phone}
                       onChange={(e) => setPhone(e.target.value)} />
              </>
            )}
            <div className="field">
              <label>Notes (optional)</label>
              <textarea className="textarea" rows={2} value={notes}
                        onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? "BookingÃ¢â‚¬Â¦" : "Confirm booking"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}