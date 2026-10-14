import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import Card from "../../components/ui/Card";
import { getMyRoles } from "../../services/roles";
import { useI18n } from "../../i18n/I18nContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const from = location.state?.from?.pathname || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.state?.signedOut) {
      setInfo(t("security.signedOut"));
      navigate(".", { replace: true, state: {} });
    }
    // eslint-disable-next-line
  }, [location.state, t, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setInfo(""); setLoading(true);

    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) { setError(signInErr.message); setLoading(false); return; }

    let roles;
    try { roles = await getMyRoles(); } catch { roles = null; }

    if (roles?.is_admin) {
      await supabase.auth.signOut();
      setError(t("auth.notBusinessAccount", { portal: t("auth.adminQuestion") }));
      setLoading(false); return;
    }
    if (!roles?.is_business_member) {
      await supabase.auth.signOut();
      if (roles?.is_customer) {
        setError(t("auth.notBusinessAccount", { portal: t("auth.customerQuestion") }));
      } else {
        setError(t("auth.notBusinessAccount", { portal: t("auth.businessOwnerQuestion") }));
      }
      setLoading(false); return;
    }

    setLoading(false);
    navigate(from, { replace: true });
  }

  return (
    <div className="container" style={{ maxWidth: 420, paddingTop: 40 }}>
      <Card>
        <h1>{t("auth.businessSignIn")}</h1>
        <p className="muted">{t("auth.businessSignInSub")}</p>

        {info && <Alert variant="warning">{info}</Alert>}
        {error && <Alert variant="error">{error}</Alert>}

        <form onSubmit={handleSubmit} className="stack">
          <Input label={t("auth.email")} name="email" type="email" required
                 value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label={t("auth.password")} name="password" type="password" required
                 value={password} onChange={(e) => setPassword(e.target.value)} />
          <p style={{ textAlign: "right", marginTop: -6, marginBottom: 8 }}>
            <Link to="/forgot-password" className="muted text-xs">{t("auth.forgotPassword")}</Link>
          </p>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? t("auth.signingIn") : t("auth.signIn")}
          </Button>
        </form>

        <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
          {t("auth.noAccount")} <Link to="/signup">{t("auth.createOne")}</Link>
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          {t("auth.customerQuestion")}{" "}
          <Link to="/customer/login">{t("auth.customerSignIn")}</Link>{" "}
          · {t("auth.staffQuestion")}{" "}
          <Link to="/staff/login">{t("auth.staffSignIn")}</Link>{" "}
          · {t("auth.adminQuestion")}{" "}
          <Link to="/admin/login">{t("auth.adminSignIn")}</Link>
        </p>
      </Card>
    </div>
  );
}