import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import Card from "../../components/ui/Card";
import { useI18n } from "../../i18n/I18nContext";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const audience = params.get("audience") || "business";

  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data?.session) setReady(true);
      else setInvalid(true);
    };
    const timer = setTimeout(check, 400);
    return () => { mounted = false; clearTimeout(timer); };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(t("auth.passwordMin"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.passwordsDontMatch"));
      return;
    }

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setDone(true);
  }

  const loginPath = audience === "customer" ? "/customer/login" : "/login";

  return (
    <div className="container" style={{ maxWidth: 420, paddingTop: 40 }}>
      <Card>
        <h1>{t("auth.setNewPassword")}</h1>

        {invalid && (
          <>
            <Alert variant="error">{t("auth.invalidResetLink")}</Alert>
            <p style={{ marginTop: 12 }}>
              <Link
                to={
                  audience === "customer"
                    ? "/customer/forgot-password"
                    : "/forgot-password"
                }
              >
                {t("auth.requestNewLink")}
              </Link>
            </p>
          </>
        )}

        {!invalid && !done && !ready && (
          <p className="muted">{t("auth.verifyLink")}</p>
        )}

        {ready && !done && (
          <>
            {error && <Alert variant="error">{error}</Alert>}
            <form onSubmit={handleSubmit} className="stack">
              <Input
                label={t("auth.newPassword")}
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <Input
                label={t("auth.confirmNewPassword")}
                type="password"
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? t("auth.updating") : t("auth.updatePassword")}
              </Button>
            </form>
          </>
        )}

        {done && (
          <>
            <Alert variant="success">{t("auth.passwordUpdated")}</Alert>
            <div style={{ marginTop: 12 }}>
              <Button
                variant="primary"
                onClick={() => navigate(loginPath, { replace: true })}
              >
                {t("auth.goToSignIn")}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}