import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import { useBusinessContext } from "../../hooks/useBusinessContext";
import { serviceSchema } from "../../schemas/service";
import {
  listServices,
  createService,
  updateService,
  deleteService,
} from "../../services/services";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import PlanLimitBanner from "../../components/business/PlanLimitBanner";
import { friendlyLimitError } from "../../services/planLimits";
import { formatMoney, formatMinutes } from "../../utils/format";
import { useI18n } from "../../i18n/I18nContext";

const EMPTY = {
  name: "",
  description: "",
  duration_minutes: 30,
  buffer_before_minutes: 0,
  buffer_after_minutes: 0,
  price_cents: 0,
  deposit_cents: 0,
  online_booking_enabled: true,
  is_active: true,
};

export default function BusinessServices() {
  const business = useBusinessContext();
  const { limits, refresh: refreshLimits } = usePlanLimits(business.id);
  const { t } = useI18n();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const rows = await listServices(business.id);
      setServices(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error("[Services] load failed:", e);
      setError(e.message || "Could not load services.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line
  }, [business.id]);

  function openNew() {
    setEditing("new");
    setForm(EMPTY);
    setFormError("");
  }

  function openEdit(s) {
    setEditing(s);
    setForm({
      name: s.name || "",
      description: s.description || "",
      duration_minutes: s.duration_minutes ?? 30,
      buffer_before_minutes: s.buffer_before_minutes ?? 0,
      buffer_after_minutes: s.buffer_after_minutes ?? 0,
      price_cents: s.price_cents ?? 0,
      deposit_cents: s.deposit_cents ?? 0,
      online_booking_enabled: s.online_booking_enabled !== false,
      is_active: s.is_active !== false,
    });
    setFormError("");
  }

  function close() {
    setEditing(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (
      editing &&
      editing !== "new" &&
      editing.is_active === false &&
      limits?.can_add?.services === false
    ) {
      setFormError(t("limits.lockedEdit"));
      return;
    }
    const parsed = serviceSchema.safeParse(form);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || "Invalid form");
      return;
    }
    setSaving(true);
    try {
      if (editing === "new") await createService(business.id, parsed.data);
      else await updateService(editing.id, parsed.data);
      close();
      await refresh();
      await refreshLimits();
    } catch (err) {
      console.error("[Services] save failed:", err);
      setFormError(friendlyLimitError(err));
    }
    setSaving(false);
  }

  async function handleDelete(s) {
    if (!confirm(`Delete "${s.name}"?`)) return;
    try {
      await deleteService(s.id);
      await refresh();
      await refreshLimits();
    } catch (e) {
      alert(e.message);
    }
  }

  const servicesFull = limits?.can_add?.services === false;

  return (
    <div>
      <PlanLimitBanner limits={limits} resource="services" />

      <div className="row-between" style={{ marginBottom: 16 }}>
        <div>
          <h1>{t("services.title")}</h1>
          <p className="muted">{t("services.sub")}</p>
        </div>
        <Button
          variant="primary"
          onClick={openNew}
          disabled={servicesFull}
          title={servicesFull ? t("limits.planLimitReached") : undefined}
        >
          <Plus size={16} /> {t("services.new")}
        </Button>
      </div>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Alert variant="error">
            <strong>{error}</strong>
            <div style={{ marginTop: 8 }}>
              <Button size="sm" onClick={refresh}>{t("common.retry")}</Button>
            </div>
          </Alert>
        </div>
      )}

      {loading ? (
        <Card><p className="muted">{t("common.loading")}</p></Card>
      ) : services.length === 0 && !error ? (
        <Card>
          <p className="muted">{t("services.noServices")}</p>
          <Button variant="primary" onClick={openNew} disabled={servicesFull}>
            {t("services.createFirst")}
          </Button>
        </Card>
      ) : services.length === 0 && error ? null : (
        <Card>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("services.name")}</th>
                  <th>{t("services.duration")}</th>
                  <th>{t("services.price")}</th>
                  <th>{t("services.online")}</th>
                  <th>{t("services.status")}</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => {
                  const locked = !s.is_active && servicesFull;
                  return (
                    <tr key={s.id}>
                      <td data-label={t("services.name")}>
                        <div style={{ fontWeight: 500 }}>{s.name}</div>
                        {s.description && (
                          <div className="muted" style={{ fontSize: 12 }}>
                            {s.description}
                          </div>
                        )}
                      </td>
                      <td data-label={t("services.duration")}>
                        {formatMinutes(s.duration_minutes)}
                      </td>
                      <td data-label={t("services.price")}>
                        {formatMoney(s.price_cents, s.currency || business.currency)}
                      </td>
                      <td data-label={t("services.online")}>
                        {s.online_booking_enabled ? t("common.yes") : t("common.no")}
                      </td>
                      <td data-label={t("services.status")}>
                        {s.is_active ? (
                          <span className="badge badge-success">{t("services.active")}</span>
                        ) : (
                          <span className="badge badge-warning">{t("services.inactive")}</span>
                        )}
                        {locked && (
                          <span
                            className="badge"
                            style={{
                              marginLeft: 6,
                              background: "rgba(245,158,11,.14)",
                              color: "#92400e",
                              border: "1px solid rgba(245,158,11,.3)",
                            }}
                          >
                            {t("services.locked")}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn btn-ghost"
                          onClick={() => { if (!locked) openEdit(s); }}
                          disabled={locked}
                          title={locked ? t("limits.lockedEdit") : t("common.edit")}
                          style={locked ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn btn-ghost"
                          onClick={() => handleDelete(s)}
                          title={t("common.delete")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editing && (
        <div className="modal-backdrop" onClick={close}>
          <div
            className="modal-panel"
            style={{ maxWidth: 560 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card>
              <h2>{editing === "new" ? t("services.newTitle") : t("services.editTitle")}</h2>
              {formError && <Alert variant="error">{formError}</Alert>}

              <form onSubmit={handleSubmit} className="stack">
                <Input
                  label={t("services.name")}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
                <div className="field">
                  <label>{t("services.description")}</label>
                  <textarea
                    className="textarea"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <div className="row" style={{ gap: 12 }}>
                  <Input
                    label={t("services.durationMin")}
                    type="number"
                    min={5}
                    value={form.duration_minutes}
                    onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                  />
                  <Input
                    label={t("services.bufferBefore")}
                    type="number"
                    min={0}
                    value={form.buffer_before_minutes}
                    onChange={(e) => setForm((f) => ({ ...f, buffer_before_minutes: e.target.value }))}
                  />
                  <Input
                    label={t("services.bufferAfter")}
                    type="number"
                    min={0}
                    value={form.buffer_after_minutes}
                    onChange={(e) => setForm((f) => ({ ...f, buffer_after_minutes: e.target.value }))}
                  />
                </div>

                <div className="row" style={{ gap: 12 }}>
                  <Input
                    label={t("services.priceCents")}
                    type="number"
                    min={0}
                    value={form.price_cents}
                    onChange={(e) => setForm((f) => ({ ...f, price_cents: e.target.value }))}
                  />
                  <Input
                    label={t("services.depositCents")}
                    type="number"
                    min={0}
                    value={form.deposit_cents}
                    onChange={(e) => setForm((f) => ({ ...f, deposit_cents: e.target.value }))}
                  />
                </div>

                <label className="row" style={{ gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={form.online_booking_enabled}
                    onChange={(e) => setForm((f) => ({ ...f, online_booking_enabled: e.target.checked }))}
                  />
                  {t("services.onlineBooking")}
                </label>

                <label className="row" style={{ gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    disabled={!form.is_active && servicesFull}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  />
                  {t("services.active")}
                  {!form.is_active && servicesFull && (
                    <span className="muted text-xs" style={{ marginLeft: 4 }}>
                      - {t("limits.upgradeCta")}
                    </span>
                  )}
                </label>

                <div className="row-between">
                  <Button variant="ghost" onClick={close} disabled={saving}>
                    {t("common.cancel")}
                  </Button>
                  <Button variant="primary" type="submit" disabled={saving}>
                    {saving ? t("common.saving") : t("common.save")}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}