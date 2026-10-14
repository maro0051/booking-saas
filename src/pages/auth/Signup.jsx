import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import Card from "../../components/ui/Card";
import { useI18n } from "../../i18n/I18nContext";

export default function Signup() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t } = useI18n();

  useEffect(() => {
    const plan = params.get("plan");
    if (plan) sessionStorage.setItem("signup_plan", plan);
  }, [params]);

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
    setLoading(false);
    if (err) { setError(err.message); return; }
    navigate("/onboarding/business", { replace: true });
  }

  return (
    <div className="container" style={{ maxWidth: 420, paddingTop: 40 }}>
      <Card>
        <h1>{t("auth.businessAccount")}</h1>
        <p className="muted">{t("auth.businessAccountSub")}</p>
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
          {t("auth.alreadyHave")} <Link to="/login">{t("auth.signIn")}</Link>
        </p>
      </Card>
    </div>
  );
}