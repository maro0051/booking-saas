import { useEffect, useState } from "react";
import { Save, Mail, ShieldCheck } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Alert from "../ui/Alert";
import { useAuth } from "../../hooks/useAuth";
import { useI18n } from "../../i18n/I18nContext";
import {
  getMyProfile, updateMyProfile, requestEmailChange, updateMyPassword,
} from "../../services/profile";

export default function ProfilePage({ variant = "business" }) {
  const { user } = useAuth();
  const { t, locale, setLocale } = useI18n();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredLocale, setPreferredLocale] = useState(locale);

  // Save state
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);

  // Email change
  const [email, setEmail] = useState(user?.email || "");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // Password
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  // ----- Load profile -----
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const p = await getMyProfile();
        if (!mounted) return;
        setFullName(p?.full_name || "");
        setPhone(p?.phone || "");
        setPreferredLocale(p?.preferred_locale || locale);
      } catch (e) {
        if (mounted) setLoadError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [locale]);

  // ----- Save profile -----
  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileError("");
    setProfileSaved(false);
    setSavingProfile(true);
    try {
      await updateMyProfile({
        fullName,
        phone,
        locale: preferredLocale,
      });
      if (preferredLocale !== locale) setLocale(preferredLocale);
      setProfileSaved(true);
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  // ----- Change email -----
  async function handleChangeEmail(e) {
    e.preventDefault();
    setEmailError("");
    setEmailSent(false);
    const cleaned = email.trim().toLowerCase();
    if (!cleaned || !cleaned.includes("@")) {
      setEmailError(t("staffPortal.invalidEmail"));
      return;
    }
    if (cleaned === (user?.email || "").toLowerCase()) {
      setEmailError(t("profile.emailUnchanged"));
      return;
    }
    setSavingEmail(true);
    try {
      await requestEmailChange(cleaned);
      setEmailSent(true);
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setSavingEmail(false);
    }
  }

  // ----- Change password -----
  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSaved(false);
    if (password.length < 8) {
      setPasswordError(t("staffPortal.invalidPassword"));
      return;
    }
    if (password !== confirm) {
      setPasswordError(t("staffPortal.passwordMismatch"));
      return;
    }
    setSavingPassword(true);
    try {
      await updateMyPassword(password);
      setPassword("");
      setConfirm("");
      setPasswordSaved(true);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) return <Card><p className="muted">{t("common.loading")}</p></Card>;
  if (loadError) return <Alert variant="error">{loadError}</Alert>;

  const title =
    variant === "admin" ? t("profile.adminTitle")
    : variant === "staff" ? t("profile.staffTitle")
    : variant === "customer" ? t("profile.customerTitle")
    : t("profile.businessTitle");

  const subtitle =
    variant === "admin" ? t("profile.adminSub")
    : variant === "staff" ? t("profile.staffSub")
    : variant === "customer" ? t("profile.customerSub")
    : t("profile.businessSub");

  return (
    <div>
      <h1>{title}</h1>
      <p className="muted">{subtitle}</p>

      {/* ---------------- Profile ---------------- */}
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>{t("profile.personalInfo")}</h3>
        {profileError && <Alert variant="error">{profileError}</Alert>}
        {profileSaved && <Alert variant="success">{t("profile.saved")}</Alert>}

        <form onSubmit={handleSaveProfile} className="stack" style={{ maxWidth: 520 }}>
          <Input
            label={t("profile.fullName")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
          />
          <Input
            label={t("profile.phone")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
          <div className="field">
            <label>{t("profile.locale")}</label>
            <select
              className="select"
              value={preferredLocale}
              onChange={(e) => setPreferredLocale(e.target.value)}
            >
              <option value="en">English</option>
              <option value="fr">Francais</option>
            </select>
            <p className="muted text-xs" style={{ marginTop: 4 }}>
              {t("profile.localeHint")}
            </p>
          </div>

          <div>
            <Button variant="primary" type="submit" disabled={savingProfile}>
              <Save size={14} /> {savingProfile ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      </Card>

      {/* ---------------- Email ---------------- */}
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>{t("profile.email")}</h3>
        <p className="muted text-sm">{t("profile.emailHint")}</p>
        {emailError && <Alert variant="error">{emailError}</Alert>}
        {emailSent && <Alert variant="success">{t("profile.emailChangeSent")}</Alert>}

        <form onSubmit={handleChangeEmail} className="stack" style={{ maxWidth: 520 }}>
          <Input
            label={t("profile.email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <div>
            <Button type="submit" disabled={savingEmail}>
              <Mail size={14} /> {savingEmail ? t("common.saving") : t("profile.changeEmail")}
            </Button>
          </div>
        </form>
      </Card>

      {/* ---------------- Password ---------------- */}
      <Card>
        <h3 style={{ marginTop: 0 }}>{t("profile.password")}</h3>
        <p className="muted text-sm">{t("profile.passwordHint")}</p>
        {passwordError && <Alert variant="error">{passwordError}</Alert>}
        {passwordSaved && <Alert variant="success">{t("profile.passwordChanged")}</Alert>}

        <form onSubmit={handleChangePassword} className="stack" style={{ maxWidth: 520 }}>
          <Input
            label={t("profile.newPassword")}
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <Input
            label={t("profile.confirmPassword")}
            type="password"
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
          <div>
            <Button variant="primary" type="submit" disabled={savingPassword}>
              <ShieldCheck size={14} /> {savingPassword ? t("common.saving") : t("profile.changePassword")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}