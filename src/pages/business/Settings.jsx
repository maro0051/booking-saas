import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import ImagePicker from "../../components/common/ImagePicker";
import { uploadBusinessLogo } from "../../services/uploads";
import { useBusinessContext } from "../../hooks/useBusinessContext";
import { useBusiness } from "../../hooks/useBusiness";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import { supabase } from "../../lib/supabaseClient";
import { useI18n } from "../../i18n/I18nContext";

export default function BusinessSettings() {
  const business = useBusinessContext();
  const { isOwner, refresh } = useBusiness();
  const { limits } = usePlanLimits(business.id);
  const { t } = useI18n();

  const [form, setForm] = useState({
    name: business.name || "",
    description: business.description || "",
    logo_url: business.logo_url || "",
    contact_email: business.contact_email || "",
    contact_phone: business.contact_phone || "",
    timezone: business.timezone || "America/Toronto",
    currency: business.currency || "CAD",
    locale: business.locale || "en",
    guest_booking_enabled: business.guest_booking_enabled ?? true,
    auto_confirm_bookings: business.auto_confirm_bookings ?? true,
    require_account_to_book: business.require_account_to_book ?? false,
    min_notice_minutes: business.min_notice_minutes ?? 60,
    max_advance_days: business.max_advance_days ?? 90,
    reschedule_cutoff_hours: business.reschedule_cutoff_hours ?? 24,
    cancel_cutoff_hours: business.cancel_cutoff_hours ?? 24,
    notify_new_booking: business.notify_new_booking ?? true,
    notify_booking_cancelled: business.notify_booking_cancelled ?? true,
    notify_time_off_request: business.notify_time_off_request ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      name: business.name || "",
      description: business.description || "",
      logo_url: business.logo_url || "",
      contact_email: business.contact_email || "",
      contact_phone: business.contact_phone || "",
      timezone: business.timezone || "America/Toronto",
      currency: business.currency || "CAD",
      locale: business.locale || "en",
      guest_booking_enabled: business.guest_booking_enabled ?? true,
      auto_confirm_bookings: business.auto_confirm_bookings ?? true,
      require_account_to_book: business.require_account_to_book ?? false,
      min_notice_minutes: business.min_notice_minutes ?? 60,
      max_advance_days: business.max_advance_days ?? 90,
      reschedule_cutoff_hours: business.reschedule_cutoff_hours ?? 24,
      cancel_cutoff_hours: business.cancel_cutoff_hours ?? 24,
      notify_new_booking: business.notify_new_booking ?? true,
      notify_booking_cancelled: business.notify_booking_cancelled ?? true,
      notify_time_off_request: business.notify_time_off_request ?? true,
    }));
  }, [business.id]); // eslint-disable-line

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSaved(false); setSaving(true);
    try {
      const { error: err } = await supabase.rpc("update_business_settings", {
        p_business_id: business.id,
        p_patch: {
          name: form.name,
          description: form.description,
          logo_url: form.logo_url,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          timezone: form.timezone,
          currency: form.currency,
          locale: form.locale,
          guest_booking_enabled: form.guest_booking_enabled,
          auto_confirm_bookings: form.auto_confirm_bookings,
          require_account_to_book: form.require_account_to_book,
          min_notice_minutes: Number(form.min_notice_minutes),
          max_advance_days: Number(form.max_advance_days),
          reschedule_cutoff_hours: Number(form.reschedule_cutoff_hours),
          cancel_cutoff_hours: Number(form.cancel_cutoff_hours),
          notify_new_booking: form.notify_new_booking,
          notify_booking_cancelled: form.notify_booking_cancelled,
          notify_time_off_request: form.notify_time_off_request,
        },
      });
      if (err) throw err;
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(err.message || "Could not save settings.");
    } finally { setSaving(false); }
  }

  if (!isOwner) {
    return (
      <div>
        <h1>{t("settings.title")}</h1>
        <Card><p className="muted">{t("settings.onlyOwner")}</p></Card>
      </div>
    );
  }

  return (
    <div>
      <h1>{t("settings.title")}</h1>
      <p className="muted">{t("settings.sub")}</p>

      {error && <Alert variant="error">{error}</Alert>}
      {saved && <Alert variant="success">{t("settings.saved")}</Alert>}

      <form onSubmit={handleSubmit} className="stack">
        <Card>
          <h3>{t("settings.profile")}</h3>
          <Input label={t("settings.businessName")} value={form.name}
                 onChange={(e) => set("name", e.target.value)} required />
          <div className="field">
            <label>{t("settings.description")}</label>
            <textarea className="textarea" rows={3} value={form.description}
                      onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="field">
            <label>{t("settings.logo")}</label>
            <ImagePicker
              value={form.logo_url}
              onChange={(url) => set("logo_url", url)}
              upload={(file) => uploadBusinessLogo(business.id, file)}
              shape="square"
              size={88}
              initialsFallback={form.name?.[0]?.toUpperCase() || "?"}
              hint={t("settings.logoHint")}
            />
          </div>
          <div className="row" style={{ gap: 12 }}>
            <Input label={t("settings.contactEmail")} type="email" value={form.contact_email}
                   onChange={(e) => set("contact_email", e.target.value)} />
            <Input label={t("settings.contactPhone")} value={form.contact_phone}
                   onChange={(e) => set("contact_phone", e.target.value)} />
          </div>
          <p className="muted text-sm">
            {t("settings.publicLinkLabel")}{" "}
            <code>{window.location.origin}/book/{business.slug}</code>
          </p>
        </Card>

        <Card>
          <h3>{t("settings.region")}</h3>
          <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label className="muted text-sm">{t("settings.timezone")}</label>
              <select className="select" value={form.timezone}
                      onChange={(e) => set("timezone", e.target.value)}>
                {["America/Toronto","America/Vancouver","America/Edmonton","America/Winnipeg",
                  "America/Halifax","America/New_York","America/Los_Angeles",
                  "Europe/London","Europe/Paris"].map((tz) =>
                  <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <div style={{ width: 120 }}>
              <label className="muted text-sm">{t("settings.currency")}</label>
              <select className="select" value={form.currency}
                      onChange={(e) => set("currency", e.target.value)}>
                {["CAD","USD","EUR","GBP"].map((c) =>
                  <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ width: 100 }}>
              <label className="muted text-sm">{t("settings.locale")}</label>
              <select className="select" value={form.locale}
                      onChange={(e) => set("locale", e.target.value)}>
                {["en","fr"].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <h3>{t("settings.bookingRules")}</h3>

          <label className="row" style={{ gap: 8 }}>
            <input type="checkbox" checked={form.guest_booking_enabled}
                   onChange={(e) => set("guest_booking_enabled", e.target.checked)} />
            {t("settings.guestBooking")}
          </label>

          <label className="row" style={{ gap: 8, marginTop: 6 }}>
            <input type="checkbox" checked={form.auto_confirm_bookings}
                   onChange={(e) => set("auto_confirm_bookings", e.target.checked)} />
            {t("settings.autoConfirm")}
          </label>

          {limits && limits.emails_enabled === false && (
            <div className="alert alert-warning" style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {t("settings.emailsLocked")}
              </div>
              <div className="text-sm" style={{ marginBottom: 8 }}>
                {t("settings.emailsLockedHint")}
              </div>
              <Link to="/dashboard/billing">
                <button className="btn btn-primary btn-sm">
                  {t("settings.upgradePlan")}
                </button>
              </Link>
            </div>
          )}

          <label className="row" style={{ gap: 8, marginTop: 12 }}>
            <input type="checkbox" checked={form.require_account_to_book}
                   onChange={(e) => set("require_account_to_book", e.target.checked)} />
            {t("settings.requireAccount")}
          </label>
          <p className="muted text-xs" style={{ marginTop: 4, marginLeft: 24 }}>
            {t("settings.requireAccountHint")}
          </p>

          <div className="row" style={{ gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            <Input label={t("settings.minNotice")} type="number" min={0}
                   value={form.min_notice_minutes}
                   onChange={(e) => set("min_notice_minutes", e.target.value)} />
            <Input label={t("settings.maxAdvance")} type="number" min={1}
                   value={form.max_advance_days}
                   onChange={(e) => set("max_advance_days", e.target.value)} />
          </div>
          <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
            <Input label={t("settings.rescheduleCutoff")} type="number" min={0}
                   value={form.reschedule_cutoff_hours}
                   onChange={(e) => set("reschedule_cutoff_hours", e.target.value)} />
            <Input label={t("settings.cancelCutoff")} type="number" min={0}
                   value={form.cancel_cutoff_hours}
                   onChange={(e) => set("cancel_cutoff_hours", e.target.value)} />
          </div>
        </Card>

        <Card>
          <h3>{t("settings.notifications")}</h3>
          <p className="muted text-sm">{t("settings.notificationsSub")}</p>

          <label className="row" style={{ gap: 8, marginTop: 6 }}>
            <input type="checkbox" checked={form.notify_new_booking}
                   onChange={(e) => set("notify_new_booking", e.target.checked)} />
            {t("settings.notifyNewBooking")}
          </label>

          <label className="row" style={{ gap: 8, marginTop: 6 }}>
            <input type="checkbox" checked={form.notify_booking_cancelled}
                   onChange={(e) => set("notify_booking_cancelled", e.target.checked)} />
            {t("settings.notifyCancelled")}
          </label>

          <label className="row" style={{ gap: 8, marginTop: 6 }}>
            <input type="checkbox" checked={form.notify_time_off_request}
                   onChange={(e) => set("notify_time_off_request", e.target.checked)} />
            {t("settings.notifyTimeOff")}
          </label>
        </Card>

        <div>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? t("settings.saving") : t("settings.save")}
          </Button>
        </div>
      </form>
    </div>
  );
}