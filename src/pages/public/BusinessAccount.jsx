import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus, CalendarPlus, RotateCcw } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";
import BackButton from "../../components/common/BackButton";
import { supabase } from "../../lib/supabaseClient";
import { getPublicBusiness } from "../../services/publicBooking";
import { getMyBookingsForBusiness } from "../../services/publicCustomer";
import { formatInTz } from "../../utils/datetime";
import { formatMoney } from "../../utils/format";

const STATUS_BADGE = {
  pending: "badge-warning",
  confirmed: "badge-success",
  cancelled: "badge-danger",
  completed: "badge",
  no_show: "badge-danger",
  declined: "badge-danger",
};

export default function BusinessAccount() {
  const { businessSlug } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  async function refresh() {
    setLoading(true);
    try {
      const b = await getPublicBusiness(businessSlug);
      setBusiness(b);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) { setBookings([]); return; }
      if (b) setBookings(await getMyBookingsForBusiness(b.id));
    } catch (e) { setError(e.message); }
    setLoading(false);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [businessSlug]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate(`/book/${businessSlug}`, { replace: true });
  }

  if (loading) return <Card><p className="muted">Loadingâ€¦</p></Card>;
  if (!business) return <Alert variant="error">Business not found.</Alert>;

  if (!user) {
    return (
      <Card>
        <h1>Your account</h1>
        <p className="muted">Sign in to view and manage your bookings.</p>
        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          <Link to={`/book/${businessSlug}/login`}>
            <Button variant="primary">Sign in</Button>
          </Link>
          <Link to={`/book/${businessSlug}/register`}>
            <Button variant="ghost">Create account</Button>
          </Link>
        </div>
      </Card>
    );
  }

  const upcoming = bookings.filter(
    (b) => b.status === "pending" || b.status === "confirmed"
  );
  const past = bookings.filter(
    (b) => b.status === "cancelled" || b.status === "completed" ||
           b.status === "no_show" || b.status === "declined"
  );

  return (
    <div className="stack">
      <Card>
        <div style={{ marginBottom: 12 }}>
          <BackButton to={`/book/${businessSlug}`} label={business.name} />
        </div>
        <div className="row-between">
          <div>
            <h1 style={{ margin: "4px 0 0" }}>My bookings</h1>
            <p className="muted text-sm" style={{ margin: "4px 0 0" }}>
              {user.email}
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Link to={`/book/${businessSlug}`}>
              <Button variant="primary">
                <Plus size={15} /> Book appointment
              </Button>
            </Link>
            <Button variant="ghost" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </Card>

      {error && <Alert variant="error">{error}</Alert>}

      {bookings.length === 0 && (
        <Card>
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: "var(--brand-50)", margin: "0 auto 14px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <CalendarPlus size={26} style={{ color: "var(--brand-600)" }} />
            </div>
            <h2 style={{ marginBottom: 6 }}>You don't have any bookings yet</h2>
            <p className="muted" style={{ marginBottom: 16 }}>
              Book your first appointment with {business.name}.
            </p>
            <Link to={`/book/${businessSlug}`}>
              <Button variant="primary">
                <Plus size={15} /> Book now
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {upcoming.length > 0 && (
        <Card>
          <h2 style={{ marginTop: 0 }}>Upcoming</h2>
          <div className="stack">
            {upcoming.map((b) => (
              <div key={b.id} className="row-between" style={{ gap: 12 }}>
                <div>
                  <span className={`badge ${STATUS_BADGE[b.status] || "badge"}`}>{b.status}</span>
                  <div style={{ fontWeight: 600, marginTop: 6 }}>{b.service_name}</div>
                  <div className="muted text-sm">
                    {formatInTz(b.starts_at, b.business_timezone, "EEEE, MMM d, yyyy 'at' h:mm a")}
                  </div>
                  {b.staff_name && (
                    <div className="muted text-xs">with {b.staff_name}</div>
                  )}
                  <div className="muted text-xs" style={{ marginTop: 4 }}>
                    <code>{b.reference}</code>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ marginBottom: 6 }}>{formatMoney(b.price_cents, b.currency)}</div>
                  <Link to={`/book/${businessSlug}/confirmation/${b.reference}`}>
                    <Button variant="ghost">View</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {past.length > 0 && (
        <Card>
          <h2 style={{ marginTop: 0 }}>Past</h2>
          <div className="stack">
            {past.map((b) => (
              <div key={b.id} className="row-between" style={{ gap: 12 }}>
                <div>
                  <span className={`badge ${STATUS_BADGE[b.status] || "badge"}`}>{b.status}</span>
                  <div style={{ fontWeight: 600, marginTop: 6 }}>{b.service_name}</div>
                  <div className="muted text-sm">
                    {formatInTz(b.starts_at, b.business_timezone, "MMM d, yyyy")}
                  </div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {b.status === "completed" && (
                    <Link to={`/book/${businessSlug}`}>
                      <Button variant="primary" size="sm">
                        <RotateCcw size={13} /> Book again
                      </Button>
                    </Link>
                  )}
                  <Link to={`/book/${businessSlug}/confirmation/${b.reference}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}