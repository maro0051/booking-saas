import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import Card from "../../components/ui/Card";
import { linkCustomerByEmail } from "../../services/customer";
import { getMyRoles } from "../../services/roles";
import { useI18n } from "../../i18n/I18nContext";

export default function CustomerLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  useEffect(() => {
    if (location.state?.signedOut) {
      setInfo(t("security.signedOut"));
      navigate(".", { replace: true, state: {} });
    }
    // eslint-disable-next-line
  }, [location.state, t, navigate]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) {
      setError(signInErr.message);
      setLoading(false);
      return;
    }

    try { await linkCustomerByEmail(); } catch { /* non-fatal */ }

    let roles;
    try { roles = await getMyRoles(); }
    catch { roles = null; }

    if (roles?.is_admin || roles?.is_business_member) {
      await supabase.auth.signOut();
      setError(
        roles?.is_admin
          ? t("auth.notAdminHere")
          : t("auth.notBusinessHere")
      );
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate("/customer/dashboard", { replace: true });
  }

  return (
    <div className="container" style={{ maxWidth: 420, paddingTop: 40 }}>
      <Card>
        <h1>{t("auth.customerSignIn")}</h1>
        <p className="muted">{t("auth.customerSignInSub")}</p>
        {info && <Alert variant="warning">{info}</Alert>}
        {error && <Alert variant="error">{error}</Alert>}
        <form onSubmit={handleSubmit} className="stack">
          <Input
            label={t("auth.email")}
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label={t("auth.password")}
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p style={{ textAlign: "right", marginTop: -6, marginBottom: 8 }}>
            <Link to="/customer/forgot-password" className="muted text-xs">
              {t("auth.forgotPassword")}
            </Link>
          </p>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? t("auth.signingIn") : t("auth.signIn")}
          </Button>
        </form>
        <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
          {t("auth.noAccount")}{" "}
          <Link to="/customer/register">{t("auth.createOne")}</Link>
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          {t("auth.businessOwnerQuestion")} <Link to="/login">{t("auth.businessSignIn")}</Link>{" "}
          Â· {t("auth.adminQuestion")}{" "}
          <Link to="/admin/login">{t("auth.adminSignIn")}</Link>
        </p>
      </Card>
    </div>
  );
}