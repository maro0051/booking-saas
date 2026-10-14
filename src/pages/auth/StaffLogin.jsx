import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import Card from "../../components/ui/Card";
import { useI18n } from "../../i18n/I18nContext";

export default function StaffLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

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
    setError("");
    setInfo("");
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

    // Verify the signed-in user is actually a staff member.
    const { data: staffRow, error: staffErr } = await supabase.rpc("my_staff_row");
    if (staffErr) {
      await supabase.auth.signOut();
      setError(t("auth.notStaffHere"));
      setLoading(false);
      return;
    }
    const row = Array.isArray(staffRow) ? staffRow[0] : staffRow;
    if (!row) {
      await supabase.auth.signOut();
      setError(t("auth.notStaffHere"));
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate("/staff", { replace: true });
  }

  return (
    <div className="container" style={{ maxWidth: 420, paddingTop: 40 }}>
      <Card>
        <div style={{ marginBottom: 20 }}>
          <div className="text-xs" style={{
            letterSpacing: 2, fontWeight: 600,
            color: "var(--accent)",
          }}>
            {t("staff.portalName")}
          </div>
          <h1 style={{ margin: "6px 0 0" }}>{t("auth.staffSignIn")}</h1>
          <p className="muted" style={{ margin: "6px 0 0", fontSize: 13 }}>
            {t("auth.staffSignInSub")}
          </p>
        </div>

        {info && <Alert variant="warning">{info}</Alert>}
        {error && <Alert variant="error">{error}</Alert>}

        <form onSubmit={handleSubmit} className="stack">
          <Input
            label={t("auth.email")}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            label={t("auth.password")}
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <p style={{ textAlign: "right", marginTop: -6, marginBottom: 8 }}>
            <Link to="/forgot-password" className="muted text-xs">
              {t("auth.forgotPassword")}
            </Link>
          </p>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? t("auth.signingIn") : t("auth.signIn")}
          </Button>
        </form>

        <p className="muted" style={{ marginTop: 16, fontSize: 12 }}>
          {t("auth.businessOwnerQuestion")}{" "}
          <Link to="/login">{t("auth.businessSignIn")}</Link>
          {" · "}
          {t("auth.customerQuestion")}{" "}
          <Link to="/customer/login">{t("auth.customerSignIn")}</Link>
        </p>
      </Card>
    </div>
  );
}