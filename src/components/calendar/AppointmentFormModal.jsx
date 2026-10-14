import { useEffect, useMemo, useState } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Alert from "../ui/Alert";
import { createBusinessAppointment } from "../../services/calendar";
import { formatInTz } from "../../utils/datetime";
import { useI18n } from "../../i18n/I18nContext";

export default function AppointmentFormModal({
  business, services, staff, locations,
  onClose, onCreated, defaults,
}) {
  const tz = business.timezone;
  const { t } = useI18n();

  const [serviceId, setServiceId] = useState(defaults?.serviceId || services[0]?.id || "");
  const [staffId, setStaffId] = useState(defaults?.staffId || "");
  const [locationId, setLocationId] = useState(defaults?.locationId || "");
  const [date, setDate] = useState(defaults?.date || "");
  const [time, setTime] = useState(defaults?.time || "");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const service = services.find((s) => s.id === serviceId);
  const eligibleStaff = useMemo(
    () => staff.filter((s) => s.service_ids?.includes(serviceId)),
    [staff, serviceId]
  );

  useEffect(() => {
    if (!date) setDate(formatInTz(new Date(), tz, "yyyy-MM-dd"));
  }, [tz, date]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!serviceId || !date || !time) {
      setError(t("common.required"));
      return;
    }
    const startsAtIso = new Date(`${date}T${time}`).toISOString();
    setSaving(true);
    try {
      await createBusinessAppointment({
        businessId: business.id,
        serviceId,
        startsAt: startsAtIso,
        customerName,
        customerEmail,
        customerPhone,
        staffId: staffId || null,
        locationId: locationId || null,
        notes,
        internalNotes,
      });
      onCreated?.();
    } catch (err) {
      setError(err.message || "Could not create appointment.");
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel modal-panel-lg" onClick={(e) => e.stopPropagation()}>
        <div className="card">
          <h2>{t("calendar.newAppointment")}</h2>
          <p className="muted text-sm">Create an appointment on behalf of a customer.</p>

          {error && <Alert variant="error">{error}</Alert>}

          <form onSubmit={handleSubmit} className="stack">
            <div className="row" style={{ gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="muted text-xs">{t("appointments.service")}</label>
                <select className="select" value={serviceId}
                        onChange={(e) => setServiceId(e.target.value)} required>
                  <option value="">{t("appointments.service")}</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="muted text-xs">{t("appointments.staffLabel")}</label>
                <select className="select" value={staffId}
                        onChange={(e) => setStaffId(e.target.value)}>
                  <option value="">{t("booking.noPreference")}</option>
                  {eligibleStaff.map((s) => (
                    <option key={s.id} value={s.id}>{s.display_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="row" style={{ gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="muted text-xs">{t("booking.location")}</label>
                <select className="select" value={locationId}
                        onChange={(e) => setLocationId(e.target.value)}>
                  <option value="">-</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <Input label={t("calendar.chooseDate")} type="date" value={date}
                     onChange={(e) => setDate(e.target.value)} required />
              <Input label={t("calendar.chooseTime")} type="time" value={time}
                     onChange={(e) => setTime(e.target.value)} required />
            </div>

            <div className="row" style={{ gap: 12 }}>
              <Input label={t("appointments.customer")} value={customerName}
                     onChange={(e) => setCustomerName(e.target.value)} required />
              <Input label={t("common.email")} type="email" value={customerEmail}
                     onChange={(e) => setCustomerEmail(e.target.value)} required />
            </div>
            <Input label={`${t("common.phone")} (${t("common.optional")})`} value={customerPhone}
                   onChange={(e) => setCustomerPhone(e.target.value)} />

            <div className="field">
              <label>{t("booking.notes")}</label>
              <textarea className="textarea" rows={2} value={notes}
                        onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="field">
              <label>Internal notes</label>
              <textarea className="textarea" rows={2} value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)} />
            </div>

            {service && (
              <p className="muted text-sm">
                {t("services.duration")} {service.duration_minutes} {t("business.min")}
                {staffId && ` - ${eligibleStaff.find((s) => s.id === staffId)?.display_name}`}
              </p>
            )}

            <div className="row-between">
              <Button variant="ghost" onClick={onClose} disabled={saving}>
                {t("common.cancel")}
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? t("common.saving") : t("calendar.createFirst")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}