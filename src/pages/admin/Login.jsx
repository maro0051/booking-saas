import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import { getMyRoles } from "../../services/roles";
import { useI18n } from "../../i18n/I18nContext";
import FloatingLanguageSwitcher from "../../components/common/FloatingLanguageSwitcher";

export default function AdminLogin() {
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

    const { data: isAdmin } = await supabase.rpc("is_super_admin");
    if (!isAdmin) {
      let roles = null;
      try { roles = await getMyRoles(); } catch { /* non-fatal */ }
      await supabase.auth.signOut();
      setError(
        roles?.is_business_member
          ? t("auth.notBusinessHere")
          : roles?.is_customer
            ? t("auth.notCustomerAccount")
            : t("auth.noAdminAccess")
      );
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate("/admin", { replace: true });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-sunken)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <FloatingLanguageSwitcher />

      <div className="card" style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ marginBottom: 20 }}>
          <div
            className="text-xs"
            style={{ letterSpacing: 2, color: "var(--brand-500)", fontWeight: 600 }}
          >
            {t("admin.platformAdmin")}
          </div>
          <h1 style={{ margin: "6px 0 0" }}>{t("auth.adminSignIn")}</h1>
          <p className="muted" style={{ margin: "6px 0 0", fontSize: 13 }}>
            {t("auth.adminSignInSub")}
          </p>
        </div>

        {info && <Alert variant="warning">{info}</Alert>}
        {error && <Alert variant="error">{error}</Alert>}

        <form onSubmit={handleSubmit} className="stack">
          <Input
            label={t("common.email")}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
          <Input
            label={t("common.password")}
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
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
          >
            {loading ? t("auth.signingIn") : t("auth.signIn")}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 16, fontSize: 12 }}>
          {t("auth.businessOwnerQuestion")}{" "}
          <Link to="/login">{t("auth.businessSignIn")}</Link>
          {" Â· "}
          {t("auth.customerQuestion")}{" "}
          <Link to="/customer/login">{t("auth.customerSignIn")}</Link>
        </p>
      </div>
    </div>
  );
}