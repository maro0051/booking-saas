import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import BackButton from "../../components/common/BackButton";
import { supabase } from "../../lib/supabaseClient";
import { getPublicBusiness, hasCustomerBookedAt } from "../../services/publicBooking";
import { signInCustomerForBusiness } from "../../services/publicCustomer";
import { getMyRoles } from "../../services/roles";

export default function BusinessLogin() {
  const { businessSlug } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    getPublicBusiness(businessSlug).then((b) => mounted && setBusiness(b));
    return () => { mounted = false; };
  }, [businessSlug]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInCustomerForBusiness(email, password);

      // Reject business owners and admins from this customer portal.
      let roles = null;
      try { roles = await getMyRoles(); } catch {}
      if (roles?.is_business_member || roles?.is_admin) {
        await supabase.auth.signOut();
        setError(
          roles?.is_admin
            ? "Administrator accounts cannot sign in as a customer. Use the admin portal."
            : "Business accounts cannot sign in as a customer. Use the business portal."
        );
        setLoading(false);
        return;
      }

      // Decide where to send them.
      let dest = `/book/${businessSlug}`;
      if (business?.id) {
        const alreadyBooked = await hasCustomerBookedAt(business.id);
        if (alreadyBooked || business.require_account_to_book) {
          dest = `/book/${businessSlug}/account`;
        }
      }
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <Card>
        <p className="muted text-xs" style={{ marginBottom: 4 }}>
          {business?.name || "Business"}
        </p>
        <h1>Sign in</h1>
        <p className="muted">Access your bookings with this business.</p>
        {error && <Alert variant="error">{error}</Alert>}
        <form onSubmit={handleSubmit} className="stack">
          <Input label="Email" type="email" value={email}
                 onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <Input label="Password" type="password" value={password}
                 onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? "Signing inÃ¢â‚¬Â¦" : "Sign in"}
          </Button>
        </form>
        <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
          New here?{" "}
          <Link to={`/book/${businessSlug}/register`}>Create an account</Link>
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          <Link to={`/book/${businessSlug}`}>Ã¢â€ Â Back to {business?.name || "booking"}</Link>
        </p>
      </Card>
    </div>
  );
}