import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import Card from "../../components/ui/Card";
import { linkCustomerByEmail } from "../../services/customer";
import { getMyRoles } from "../../services/roles";
import { useI18n } from "../../i18n/I18nContext";

export default function CustomerRegister() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    try { await linkCustomerByEmail(); } catch { /* non-fatal */ }

    let roles = null;
    try { roles = await getMyRoles(); } catch { /* non-fatal */ }
    if (roles?.is_business_member || roles?.is_admin) {
      await supabase.auth.signOut();
      setError(t("auth.notCustomerAccount"));
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate("/customer/dashboard", { replace: true });
  }

  return (
    <div className="container" style={{ maxWidth: 420, paddingTop: 40 }}>
      <Card>
        <h1>{t("auth.customerAccount")}</h1>
        <p className="muted">{t("auth.customerAccountSub")}</p>
        {error && <Alert variant="error">{error}</Alert>}
        <form onSubmit={handleSubmit} className="stack">
          <Input
            label={t("auth.fullName")}
            name="fullName"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? t("auth.signingUp") : t("auth.signUp")}
          </Button>
        </form>
        <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
          {t("auth.alreadyHave")}{" "}
          <Link to="/customer/login">{t("auth.signIn")}</Link>
        </p>
      </Card>
    </div>
  );
}