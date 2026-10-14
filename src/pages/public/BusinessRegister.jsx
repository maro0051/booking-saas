import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import BackButton from "../../components/common/BackButton";
import { supabase } from "../../lib/supabaseClient";
import { getPublicBusiness } from "../../services/publicBooking";
import { registerCustomerForBusiness } from "../../services/publicCustomer";
import { getMyRoles } from "../../services/roles";

export default function BusinessRegister() {
  const { businessSlug } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [fullName, setFullName] = useState("");
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
      await registerCustomerForBusiness({ email, password, fullName });

      let roles = null;
      try { roles = await getMyRoles(); } catch {}
      if (roles?.is_business_member || roles?.is_admin) {
        await supabase.auth.signOut();
        setError(
          "This email belongs to a business or administrator account. " +
          "Please use the business or admin portal."
        );
        setLoading(false);
        return;
      }

      navigate(`/book/${businessSlug}`, { replace: true });
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
        <h1>Create an account</h1>
        <p className="muted">
          You'll be able to book appointments, reschedule, and cancel anytime.
        </p>
        {error && <Alert variant="error">{error}</Alert>}
        <form onSubmit={handleSubmit} className="stack">
          <Input label="Full name" value={fullName}
                 onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
          <Input label="Email" type="email" value={email}
                 onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <Input label="Password" type="password" minLength={8} value={password}
                 onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? "Creatingâ€¦" : "Create account"}
          </Button>
        </form>
        <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
          Already have an account?{" "}
          <Link to={`/book/${businessSlug}/login`}>Sign in</Link>
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          <Link to={`/book/${businessSlug}`}>â† Back to {business?.name || "booking"}</Link>
        </p>
      </Card>
    </div>
  );
}