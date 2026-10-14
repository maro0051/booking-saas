import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import { useBusinessContext } from "../../hooks/useBusinessContext";
import { locationSchema } from "../../schemas/location";
import {
  listLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from "../../services/locations";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import PlanLimitBanner from "../../components/business/PlanLimitBanner";
import { friendlyLimitError } from "../../services/planLimits";
import { useI18n } from "../../i18n/I18nContext";

const EMPTY = {
  name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  region: "",
  postal_code: "",
  country: "",
  is_active: true,
};

function toForm(loc) {
  const a = loc.address || {};
  return {
    name: loc.name || "",
    phone: loc.phone || "",
    address_line1: a.line1 || "",
    address_line2: a.line2 || "",
    city: a.city || "",
    region: a.region || "",
    postal_code: a.postal_code || "",
    country: a.country || "",
    is_active: loc.is_active !== false,
  };
}

export default function BusinessLocations() {
  const business = useBusinessContext();
  const { limits, refresh: refreshLimits } = usePlanLimits(business.id);
  const { t } = useI18n();

  const [items, setItems] = useState([]);
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
      const rows = await listLocations(business.id);
      setItems(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error("[Locations] load failed:", e);
      setError(e.message || "Could not load locations.");
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

  function openEdit(loc) {
    setEditing(loc);
    setForm(toForm(loc));
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
      limits?.can_add?.locations === false
    ) {
      setFormError(t("limits.lockedLocation"));
      return;
    }
    const parsed = locationSchema.safeParse(form);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message);
      return;
    }
    setSaving(true);
    try {
      if (editing === "new") await createLocation(business.id, parsed.data);
      else await updateLocation(editing.id, parsed.data);
      close();
      await refresh();
      await refreshLimits();
    } catch (err) {
      console.error("[Locations] save failed:", err);
      setFormError(friendlyLimitError(err));
    }
    setSaving(false);
  }

  async function handleDelete(loc) {
    if (!confirm(`Delete "${loc.name}"?`)) return;
    try {
      await deleteLocation(loc.id);
      await refresh();
      await refreshLimits();
    } catch (e) { alert(e.message); }
  }

  const locationsFull = limits?.can_add?.locations === false;

  return (
    <div>
      <PlanLimitBanner limits={limits} resource="locations" />

      <div className="row-between" style={{ marginBottom: 16 }}>
        <div>
          <h1>{t("locations.title")}</h1>
          <p className="muted">{t("locations.sub")}</p>
        </div>
        <Button
          variant="primary"
          onClick={openNew}
          disabled={locationsFull}
          title={locationsFull ? t("limits.planLimitReached") : undefined}
        >
          <Plus size={16} /> {t("locations.new")}
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
      ) : items.length === 0 && !error ? (
        <Card>
          <p className="muted">{t("locations.noLocations")}</p>
          <Button variant="primary" onClick={openNew} disabled={locationsFull}>
            {t("locations.createFirst")}
          </Button>
        </Card>
      ) : items.length === 0 && error ? null : (
        <Card>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("locations.name")}</th>
                  <th>{t("locations.address")}</th>
                  <th>{t("locations.phone")}</th>
                  <th>{t("locations.status")}</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((l) => {
                  const a = l.address || {};
                  const address = [a.line1, a.city, a.region, a.postal_code]
                    .filter(Boolean)
                    .join(", ");
                  const locked = !l.is_active && locationsFull;
                  return (
                    <tr key={l.id}>
                      <td data-label={t("locations.name")}>
                        <span style={{ fontWeight: 500 }}>{l.name}</span>
                      </td>
                      <td data-label={t("locations.address")} className="muted">
                        {address || "-"}
                      </td>
                      <td data-label={t("locations.phone")}>{l.phone || "-"}</td>
                      <td data-label={t("locations.status")}>
                        {l.is_active ? (
                          <span className="badge badge-success">{t("locations.active")}</span>
                        ) : (
                          <span className="badge badge-warning">{t("locations.inactive")}</span>
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
                            {t("locations.locked")}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn btn-ghost"
                          onClick={() => { if (!locked) openEdit(l); }}
                          disabled={locked}
                          title={locked ? t("limits.lockedLocation") : t("common.edit")}
                          style={locked ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn btn-ghost"
                          onClick={() => handleDelete(l)}
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
              <h2>{editing === "new" ? t("locations.newTitle") : t("locations.editTitle")}</h2>
              {formError && <Alert variant="error">{formError}</Alert>}

              <form onSubmit={handleSubmit} className="stack">
                <Input
                  label={t("locations.name")}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
                <Input
                  label={t("locations.phone")}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
                <Input
                  label={t("locations.addressLine1")}
                  value={form.address_line1}
                  onChange={(e) => setForm((f) => ({ ...f, address_line1: e.target.value }))}
                />
                <Input
                  label={t("locations.addressLine2")}
                  value={form.address_line2}
                  onChange={(e) => setForm((f) => ({ ...f, address_line2: e.target.value }))}
                />
                <div className="row" style={{ gap: 12 }}>
                  <Input
                    label={t("locations.city")}
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  />
                  <Input
                    label={t("locations.region")}
                    value={form.region}
                    onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                  />
                </div>
                <div className="row" style={{ gap: 12 }}>
                  <Input
                    label={t("locations.postalCode")}
                    value={form.postal_code}
                    onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))}
                  />
                  <Input
                    label={t("locations.country")}
                    value={form.country}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  />
                </div>

                <label className="row" style={{ gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    disabled={!form.is_active && locationsFull}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  />
                  {t("locations.active")}
                  {!form.is_active && locationsFull && (
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