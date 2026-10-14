import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import Card from "../../components/ui/Card";
import { useI18n } from "../../i18n/I18nContext";

export default function ForgotPassword({ audience = "business" }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const loginPath = audience === "customer" ? "/customer/login" : "/login";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const redirectTo = `${window.location.origin}/reset-password?audience=${audience}`;
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSent(true);
  }

  return (
    <div className="container" style={{ maxWidth: 420, paddingTop: 40 }}>
      <Card>
        <h1>{t("auth.forgotPasswordTitle")}</h1>
        <p className="muted">{t("auth.forgotPasswordSub")}</p>

        {error && <Alert variant="error">{error}</Alert>}

        {sent ? (
          <>
            <Alert variant="success">{t("auth.resetSent")}</Alert>
            <p className="muted text-sm" style={{ marginTop: 12 }}>
              {t("auth.resetSentHelp")}{" "}
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: 0, textDecoration: "underline", color: "var(--accent)" }}
                onClick={() => setSent(false)}
              >
                {t("auth.tryAnotherEmail")}
              </button>
              .
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="stack">
            <Input
              label={t("auth.email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? t("auth.sending") : t("auth.sendResetLink")}
            </Button>
          </form>
        )}

        <p className="muted" style={{ marginTop: 16, fontSize: 13 }}>
          <Link to={loginPath}>← {t("auth.backToSignIn")}</Link>
        </p>
      </Card>
    </div>
  );
}