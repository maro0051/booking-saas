import { useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Alert from "../ui/Alert";
import { inviteStaff } from "../../services/staffInvite";
import { useI18n } from "../../i18n/I18nContext";

export default function InviteStaffModal({ business, staff, onClose }) {
  const { t } = useI18n();
  const [email, setEmail] = useState(staff.email || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email || !email.includes("@")) {
      setError(t("staffPortal.invalidEmail"));
      return;
    }
    setBusy(true);
    try {
      const res = await inviteStaff({
        businessId: business.id,
        staffId: staff.id,
        email,
        fullName: staff.display_name,
      });
      setResult(res);
    } catch (err) {
      setError(err.message || t("staffAdmin.inviteError"));
    } finally {
      setBusy(false);
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(result.temp_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <Card>
          {!result ? (
            <>
              <h2>{t("staffAdmin.inviteModalTitle")}</h2>
              <p className="muted">
                {t("staffAdmin.inviteModalSub", { name: staff.display_name })}
              </p>

              {error && <Alert variant="error">{error}</Alert>}

              <form onSubmit={handleSubmit} className="stack">
                <Input
                  label={t("staffAdmin.inviteEmailLabel")}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                <div className="row-between">
                  <Button variant="ghost" type="button" onClick={onClose} disabled={busy}>
                    {t("common.cancel")}
                  </Button>
                  <Button variant="primary" type="submit" disabled={busy}>
                    {busy ? t("staffAdmin.inviteCreating") : t("staffAdmin.inviteCreate")}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="row" style={{ gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "var(--success-bg, #d1fae5)",
                  color: "var(--success-fg, #065f46)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Check size={18} />
                </div>
                <h2 style={{ margin: 0 }}>{t("staffAdmin.inviteSuccessTitle")}</h2>
              </div>

              <p className="muted">{t("staffAdmin.inviteSuccessSub")}</p>

              <div style={{
                padding: 14,
                background: "var(--bg-sunken)",
                borderRadius: 12,
                border: "1px solid var(--border)",
                marginBottom: 14,
              }}>
                <div className="text-xs muted" style={{ marginBottom: 4 }}>
                  {t("staffAdmin.emailLabel")}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, marginBottom: 12 }}>
                  {result.email}
                </div>

                <div className="text-xs muted" style={{ marginBottom: 4 }}>
                  {t("staffPortal.newPassword")}
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <div style={{
                    flex: 1,
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    background: "var(--bg-elev)",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    letterSpacing: showPassword ? "normal" : "2px",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                  }}>
                    {showPassword ? result.temp_password : "••••••••••••••"}
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide" : "Show"}
                    title={showPassword ? "Hide" : "Show"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-icon"
                    onClick={copyPassword}
                    aria-label={t("staffAdmin.inviteCopyPassword")}
                    title={t("staffAdmin.inviteCopyPassword")}
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                </div>
                {copied && (
                  <div className="muted text-xs" style={{ marginTop: 6 }}>
                    {t("common.copied")}
                  </div>
                )}
              </div>

              <div className="row-between">
                <span className="muted text-xs">
                  {t("staffAdmin.inviteSuccessSub").length > 60
                    ? ""
                    : ""}
                </span>
                <Button variant="primary" onClick={onClose}>
                  {t("staffAdmin.inviteDone")}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}