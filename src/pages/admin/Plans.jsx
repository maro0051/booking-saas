import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import { listPlans, upsertPlan } from "../../services/admin";
import { formatMoney } from "../../utils/format";
import { useI18n } from "../../i18n/I18nContext";

const EMPTY = {
  code: "",
  name: "",
  interval: "month",
  price_cents: 0,
  currency: "CAD",
  max_staff: 1,
  max_services: 5,
  max_locations: 1,
  max_appointments_per_month: 100,
  is_active: true,
  highlight: "",
  bullets: [],
  trial_days: 0,
};

function featuresToForm(features) {
  return {
    highlight: features?.highlight || "",
    bullets: Array.isArray(features?.bullets) ? features.bullets : [],
    trial_days: Number(features?.trial_days) || 0,
  };
}

export default function AdminPlans() {
  const { t } = useI18n();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try { setPlans(await listPlans()); setError(""); }
    catch (e) { setError(e.message); }
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  function openNew() {
    setEditing("new");
    setForm({ ...EMPTY });
    setFormError("");
  }

  function openEdit(p) {
    setEditing(p);
    setForm({
      code: p.code,
      name: p.name,
      interval: p.interval,
      price_cents: p.price_cents,
      currency: p.currency,
      max_staff: p.max_staff ?? "",
      max_services: p.max_services ?? "",
      max_locations: p.max_locations ?? "",
      max_appointments_per_month: p.max_appointments_per_month ?? "",
      is_active: p.is_active,
      ...featuresToForm(p.features),
    });
    setFormError("");
  }

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function addBullet() { setForm((f) => ({ ...f, bullets: [...f.bullets, ""] })); }
  function updateBullet(i, v) {
    setForm((f) => ({ ...f, bullets: f.bullets.map((b, idx) => (idx === i ? v : b)) }));
  }
  function removeBullet(i) {
    setForm((f) => ({ ...f, bullets: f.bullets.filter((_, idx) => idx !== i) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const features = {
        highlight: form.highlight || null,
        bullets: form.bullets.filter((b) => b && b.trim().length > 0),
        trial_days: Number(form.trial_days) || 0,
      };
      const payload = {
        code: form.code,
        name: form.name,
        interval: form.interval,
        price_cents: Number(form.price_cents) || 0,
        currency: form.currency,
        max_staff: form.max_staff === "" ? null : Number(form.max_staff),
        max_services: form.max_services === "" ? null : Number(form.max_services),
        max_locations: form.max_locations === "" ? null : Number(form.max_locations),
        max_appointments_per_month:
          form.max_appointments_per_month === "" ? null : Number(form.max_appointments_per_month),
        is_active: form.is_active,
        features,
      };
      if (editing !== "new") payload.id = editing.id;
      await upsertPlan(payload);
      setEditing(null);
      await refresh();
    } catch (err) {
      setFormError(err.message);
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 16 }}>
        <div>
          <h1>{t("admin.plans")}</h1>
          <p className="muted">{t("admin.plansSub")}</p>
        </div>
        <Button variant="primary" onClick={openNew}>{t("admin.newPlan")}</Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        {loading ? <p className="muted">{t("common.loading")}</p>
         : plans.length === 0 ? <p className="muted">{t("common.noData")}</p>
         : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("admin.code")}</th>
                  <th>{t("admin.planName")}</th>
                  <th>{t("admin.interval")}</th>
                  <th>{t("admin.planPrice")}</th>
                  <th>{t("admin.limits")}</th>
                  <th>{t("admin.active")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td data-label={t("admin.code")}><code>{p.code}</code></td>
                    <td data-label={t("admin.planName")}>{p.name}</td>
                    <td data-label={t("admin.interval")}>{p.interval}</td>
                    <td data-label={t("admin.planPrice")}>{formatMoney(p.price_cents, p.currency)}</td>
                    <td data-label={t("admin.limits")} className="muted text-xs">
                      {p.max_staff ?? "-"} / {p.max_services ?? "-"} / {p.max_locations ?? "-"} / {p.max_appointments_per_month ?? "-"}
                    </td>
                    <td data-label={t("admin.active")}>{p.is_active ? t("common.yes") : t("common.no")}</td>
                    <td style={{ textAlign: "right" }}>
                      <Button variant="ghost" onClick={() => openEdit(p)}>{t("common.edit")}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal-panel modal-panel-lg" onClick={(e) => e.stopPropagation()}>
            <Card>
              <h2>{editing === "new" ? t("admin.newPlanTitle") : t("admin.editPlan")}</h2>
              {formError && <Alert variant="error">{formError}</Alert>}

              <form onSubmit={handleSubmit} className="stack">
                <div className="row" style={{ gap: 12 }}>
                  <Input label={t("admin.code")} value={form.code}
                         onChange={(e) => set("code", e.target.value)} required />
                  <Input label={t("admin.planName")} value={form.name}
                         onChange={(e) => set("name", e.target.value)} required />
                </div>

                <div className="row" style={{ gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="muted text-xs">{t("admin.interval")}</label>
                    <select className="select" value={form.interval}
                            onChange={(e) => set("interval", e.target.value)}>
                      <option value="month">month</option>
                      <option value="year">year</option>
                      <option value="none">none</option>
                    </select>
                  </div>
                  <Input label={t("admin.planPrice") + " (cents)"} type="number" min={0} value={form.price_cents}
                         onChange={(e) => set("price_cents", e.target.value)} />
                  <div style={{ width: 100 }}>
                    <label className="muted text-xs">{t("settings.currency")}</label>
                    <select className="select" value={form.currency}
                            onChange={(e) => set("currency", e.target.value)}>
                      {["CAD","USD","EUR","GBP"].map((c) =>
                        <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <h4 style={{ marginTop: 8, marginBottom: 0 }}>{t("admin.limitsHeading")}</h4>
                <div className="row" style={{ gap: 12 }}>
                  <Input label={t("admin.maxStaff")} type="number" min={0} value={form.max_staff}
                         onChange={(e) => set("max_staff", e.target.value)} />
                  <Input label={t("admin.maxServices")} type="number" min={0} value={form.max_services}
                         onChange={(e) => set("max_services", e.target.value)} />
                </div>
                <div className="row" style={{ gap: 12 }}>
                  <Input label={t("admin.maxLocations")} type="number" min={0} value={form.max_locations}
                         onChange={(e) => set("max_locations", e.target.value)} />
                  <Input label={t("admin.maxApptsPerMonth")} type="number" min={0}
                         value={form.max_appointments_per_month}
                         onChange={(e) => set("max_appointments_per_month", e.target.value)} />
                </div>

                <h4 style={{ marginTop: 8, marginBottom: 0 }}>{t("admin.displayHeading")}</h4>
                <Input label={t("admin.highlight")} value={form.highlight}
                       onChange={(e) => set("highlight", e.target.value)} />

                <Input label={t("admin.trialDays")} type="number" min={0} value={form.trial_days}
                       onChange={(e) => set("trial_days", e.target.value)} />

                <div className="field">
                  <label>{t("admin.bullets")}</label>
                  <div className="stack" style={{ gap: 6 }}>
                    {form.bullets.map((b, i) => (
                      <div key={i} className="row" style={{ gap: 6 }}>
                        <input className="input" value={b}
                               onChange={(e) => updateBullet(i, e.target.value)}
                               placeholder={t("admin.bulletPlaceholder", { n: i + 1 })} />
                        <button type="button" className="btn btn-ghost btn-icon"
                                onClick={() => removeBullet(i)} aria-label={t("common.remove")}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <Button type="button" variant="ghost" size="sm" onClick={addBullet}>
                      <Plus size={13} /> {t("admin.addBullet")}
                    </Button>
                  </div>
                </div>

                <label className="row" style={{ gap: 8 }}>
                  <input type="checkbox" checked={form.is_active}
                         onChange={(e) => set("is_active", e.target.checked)} />
                  {t("admin.activeLabel")}
                </label>

                <div className="row-between">
                  <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
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