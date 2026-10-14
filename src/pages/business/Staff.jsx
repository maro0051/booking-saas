import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, CalendarOff, KeyRound, CheckCircle2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import { useBusinessContext } from "../../hooks/useBusinessContext";
import { staffSchema } from "../../schemas/staff";
import {
  listStaff, createStaff, updateStaff, deleteStaff,
  listStaffTimeOff, createStaffTimeOff, deleteStaffTimeOff,
} from "../../services/staff";
import ImagePicker from "../../components/common/ImagePicker";
import { uploadStaffPhoto } from "../../services/uploads";
import { listServices } from "../../services/services";
import { listLocations } from "../../services/locations";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import PlanLimitBanner from "../../components/business/PlanLimitBanner";
import InviteStaffModal from "../../components/business/InviteStaffModal";
import TimeOffRequests from "../../components/business/TimeOffRequests";
import { friendlyLimitError } from "../../services/planLimits";
import { useI18n } from "../../i18n/I18nContext";

const EMPTY = {
  display_name: "",
  title: "",
  email: "",
  phone: "",
  color: "#2563eb",
  photo_url: "",
  is_active: true,
  service_ids: [],
  location_ids: [],
};

export default function BusinessStaff() {
  const business = useBusinessContext();
  const { limits, refresh: refreshLimits } = usePlanLimits(business.id);
  const { t } = useI18n();

  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [timeOffFor, setTimeOffFor] = useState(null);
  const [timeOff, setTimeOff] = useState([]);
  const [timeOffForm, setTimeOffForm] = useState({
    starts_at: "",
    ends_at: "",
    reason: "",
  });

  const [inviteFor, setInviteFor] = useState(null);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [s, sv, lc] = await Promise.all([
        listStaff(business.id),
        listServices(business.id),
        listLocations(business.id),
      ]);
      const normalized = (s || []).map((row) => ({
        ...row,
        service_ids: Array.isArray(row.service_ids) ? row.service_ids : [],
        location_ids: Array.isArray(row.location_ids) ? row.location_ids : [],
        photo_url: row.photo_url || "",
        title: row.title || "",
        email: row.email || "",
        phone: row.phone || "",
        color: row.color || "#2563eb",
        is_active: row.is_active !== false,
        has_login: !!row.user_id,
      }));
      setStaff(normalized);
      setServices(Array.isArray(sv) ? sv : []);
      setLocations(Array.isArray(lc) ? lc : []);
    } catch (e) {
      console.error("[Staff] load failed:", e);
      setError(e.message || "Could not load staff.");
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
      display_name: s.display_name || "",
      title: s.title || "",
      email: s.email || "",
      phone: s.phone || "",
      color: s.color || "#2563eb",
      photo_url: s.photo_url || "",
      is_active: s.is_active !== false,
      service_ids: s.service_ids || [],
      location_ids: s.location_ids || [],
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
      limits?.can_add?.staff === false
    ) {
      setFormError(t("limits.lockedStaff"));
      return;
    }
    const parsed = staffSchema.safeParse(form);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        display_name: parsed.data.display_name,
        title: parsed.data.title || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        color: parsed.data.color || null,
        photo_url: form.photo_url || null,
        is_active: parsed.data.is_active,
        service_ids: parsed.data.service_ids,
        location_ids: parsed.data.location_ids,
      };
      if (editing === "new") await createStaff(business.id, payload);
      else await updateStaff(editing.id, payload);
      close();
      await refresh();
      await refreshLimits();
    } catch (err) {
      console.error("[Staff] save failed:", err);
      setFormError(friendlyLimitError(err));
    }
    setSaving(false);
  }

  async function handleDelete(s) {
    if (!confirm(`Delete "${s.display_name}"?`)) return;
    try {
      await deleteStaff(s.id);
      await refresh();
      await refreshLimits();
    } catch (e) {
      alert(e.message);
    }
  }

  async function openTimeOff(s) {
    setTimeOffFor(s);
    setTimeOffForm({ starts_at: "", ends_at: "", reason: "" });
    try { setTimeOff(await listStaffTimeOff(s.id)); }
    catch { setTimeOff([]); }
  }

  async function addTimeOff(e) {
    e.preventDefault();
    if (!timeOffForm.starts_at || !timeOffForm.ends_at) return;
    try {
      await createStaffTimeOff(timeOffFor.id, {
        starts_at: new Date(timeOffForm.starts_at).toISOString(),
        ends_at: new Date(timeOffForm.ends_at).toISOString(),
        reason: timeOffForm.reason,
      });
      setTimeOff(await listStaffTimeOff(timeOffFor.id));
      setTimeOffForm({ starts_at: "", ends_at: "", reason: "" });
    } catch (e) { alert(e.message); }
  }

  async function removeTimeOff(id) {
    try {
      await deleteStaffTimeOff(id);
      setTimeOff(await listStaffTimeOff(timeOffFor.id));
    } catch (e) { alert(e.message); }
  }

  const staffFull = limits?.can_add?.staff === false;

  return (
    <div>
      <PlanLimitBanner limits={limits} resource="staff" />

      <div className="row-between" style={{ marginBottom: 16 }}>
        <div>
          <h1>{t("staffAdmin.title")}</h1>
          <p className="muted">{t("staffAdmin.sub")}</p>
        </div>
        <Button
          variant="primary"
          onClick={openNew}
          disabled={staffFull}
          title={staffFull ? t("limits.planLimitReached") : undefined}
        >
          <Plus size={16} /> {t("staffAdmin.new")}
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
      ) : staff.length === 0 && !error ? (
        <Card>
          <p className="muted">{t("staffAdmin.noStaff")}</p>
          <Button variant="primary" onClick={openNew} disabled={staffFull}>
            {t("staffAdmin.addFirst")}
          </Button>
        </Card>
      ) : staff.length === 0 && error ? null : (
        <Card>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("staffAdmin.nameCol")}</th>
                  <th>{t("staffAdmin.titleCol")}</th>
                  <th>{t("staffAdmin.servicesCol")}</th>
                  <th>{t("staffAdmin.locationsCol")}</th>
                  <th>{t("staffAdmin.statusCol")}</th>
                  <th>{t("staffAdmin.hasLogin")}</th>
                  <th style={{ width: 200 }}></th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => {
                  const locked = !s.is_active && staffFull;
                  return (
                    <tr key={s.id}>
                      <td data-label={t("staffAdmin.nameCol")}>
                        <div className="row" style={{ gap: 8 }}>
                          <span style={{
                            width: 10, height: 10, borderRadius: 999,
                            background: s.color || "#94a3b8",
                          }} />
                          <span style={{ fontWeight: 500 }}>{s.display_name}</span>
                        </div>
                      </td>
                      <td data-label={t("staffAdmin.titleCol")}>{s.title || "-"}</td>
                      <td data-label={t("staffAdmin.servicesCol")}>{(s.service_ids || []).length}</td>
                      <td data-label={t("staffAdmin.locationsCol")}>{(s.location_ids || []).length}</td>
                      <td data-label={t("staffAdmin.statusCol")}>
                        {s.is_active ? (
                          <span className="badge badge-success">{t("staffAdmin.active")}</span>
                        ) : (
                          <span className="badge badge-warning">{t("staffAdmin.inactive")}</span>
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
                            {t("staffAdmin.locked")}
                          </span>
                        )}
                      </td>
                      <td data-label={t("staffAdmin.hasLogin")}>
                        {s.has_login ? (
                          <span className="badge badge-success">{t("staffAdmin.hasLogin")}</span>
                        ) : (
                          <span className="badge">{t("staffAdmin.noLogin")}</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {!s.has_login && (
                          <button
                            className="btn btn-ghost"
                            onClick={() => setInviteFor(s)}
                            title={t("staffAdmin.inviteAccount")}
                            style={{ marginRight: 4 }}
                          >
                            <KeyRound size={14} />
                          </button>
                        )}
                        <button
                          className="btn btn-ghost"
                          onClick={() => { if (!locked) openTimeOff(s); }}
                          disabled={locked}
                          title={locked ? t("staffAdmin.locked") : t("staffAdmin.timeOff")}
                          style={locked ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                        >
                          <CalendarOff size={14} />
                        </button>
                        <button
                          className="btn btn-ghost"
                          onClick={() => { if (!locked) openEdit(s); }}
                          disabled={locked}
                          title={locked ? t("limits.lockedStaff") : t("common.edit")}
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
          <div className="modal-panel" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <Card>
              <h2>{editing === "new" ? t("staffAdmin.newTitle") : t("staffAdmin.editTitle")}</h2>
              {formError && <Alert variant="error">{formError}</Alert>}

              <form onSubmit={handleSubmit} className="stack">
                <Input label={t("staffAdmin.displayName")} value={form.display_name}
                       onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} required />
                <Input label={t("staffAdmin.staffTitle")} value={form.title}
                       onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                <div className="row" style={{ gap: 12 }}>
                  <Input label={t("staffAdmin.emailLabel")} type="email" value={form.email}
                         onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  <Input label={t("staffAdmin.phoneLabel")} value={form.phone}
                         onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>

                <div className="field">
                  <label>{t("staffAdmin.photo")}</label>
                  <ImagePicker
                    value={form.photo_url}
                    onChange={(url) => setForm((f) => ({ ...f, photo_url: url }))}
                    upload={(file) => uploadStaffPhoto(
                      business.id,
                      editing !== "new" && editing?.id ? editing.id : "new",
                      file
                    )}
                    shape="circle"
                    size={96}
                    initialsFallback={(form.display_name || "?")[0].toUpperCase()}
                    hint="PNG/JPG/WEBP - max 5 MB"
                  />
                </div>

                <div className="field">
                  <label>{t("staffAdmin.color")}</label>
                  <input type="color" value={form.color}
                         onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                         style={{ width: 60, height: 32, padding: 0, border: "1px solid var(--border)", borderRadius: 6 }} />
                </div>

                <div className="field">
                  <label>{t("staffAdmin.servicesPerformed")}</label>
                  <div className="stack" style={{ gap: 4 }}>
                    {services.length === 0 && <span className="muted">{t("services.noServices")}</span>}
                    {services.map((sv) => (
                      <label key={sv.id} className="row" style={{ gap: 8 }}>
                        <input type="checkbox"
                               checked={(form.service_ids || []).includes(sv.id)}
                               onChange={(e) => setForm((f) => ({
                                 ...f,
                                 service_ids: e.target.checked
                                   ? [...(f.service_ids || []), sv.id]
                                   : (f.service_ids || []).filter((id) => id !== sv.id),
                               }))} />
                        {sv.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <label>{t("staffAdmin.locationsWorked")}</label>
                  <div className="stack" style={{ gap: 4 }}>
                    {locations.length === 0 && <span className="muted">{t("locations.noLocations")}</span>}
                    {locations.map((l) => (
                      <label key={l.id} className="row" style={{ gap: 8 }}>
                        <input type="checkbox"
                               checked={(form.location_ids || []).includes(l.id)}
                               onChange={(e) => setForm((f) => ({
                                 ...f,
                                 location_ids: e.target.checked
                                   ? [...(f.location_ids || []), l.id]
                                   : (f.location_ids || []).filter((id) => id !== l.id),
                               }))} />
                        {l.name}
                      </label>
                    ))}
                  </div>
                </div>

                <label className="row" style={{ gap: 8 }}>
                  <input type="checkbox" checked={form.is_active}
                         disabled={!form.is_active && staffFull}
                         onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
                  {t("staffAdmin.active")}
                  {!form.is_active && staffFull && (
                    <span className="muted text-xs" style={{ marginLeft: 4 }}>
                      - {t("limits.upgradeCta")}
                    </span>
                  )}
                </label>

                <div className="row-between">
                  <Button variant="ghost" onClick={close} disabled={saving}>{t("common.cancel")}</Button>
                  <Button variant="primary" type="submit" disabled={saving}>
                    {saving ? t("common.saving") : t("common.save")}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      {timeOffFor && (
        <div className="modal-backdrop" onClick={() => setTimeOffFor(null)}>
          <div className="modal-panel" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <Card>
              <h2>{t("staffAdmin.timeOffFor", { name: timeOffFor.display_name })}</h2>
              <form onSubmit={addTimeOff} className="stack" style={{ marginBottom: 12 }}>
                <div className="row" style={{ gap: 12 }}>
                  <Input label={t("staffAdmin.starts")} type="datetime-local"
                         value={timeOffForm.starts_at}
                         onChange={(e) => setTimeOffForm((f) => ({ ...f, starts_at: e.target.value }))} required />
                  <Input label={t("staffAdmin.ends")} type="datetime-local"
                         value={timeOffForm.ends_at}
                         onChange={(e) => setTimeOffForm((f) => ({ ...f, ends_at: e.target.value }))} required />
                </div>
                <Input label={t("staffAdmin.reason")} value={timeOffForm.reason}
                       onChange={(e) => setTimeOffForm((f) => ({ ...f, reason: e.target.value }))} />
                <Button variant="primary" type="submit">{t("staffAdmin.addTimeOff")}</Button>
              </form>
              {timeOff.length === 0 ? (
                <p className="muted">{t("staffAdmin.noTimeOff")}</p>
              ) : (
                <ul style={{ paddingLeft: 16 }}>
                  {timeOff.map((tt) => (
                    <li key={tt.id} style={{ marginBottom: 6 }}>
                      {new Date(tt.starts_at).toLocaleString()} -{" "}
                      {new Date(tt.ends_at).toLocaleString()}
                      {tt.reason ? ` (${tt.reason})` : ""}
                      <button className="btn btn-ghost" onClick={() => removeTimeOff(tt.id)}
                              style={{ marginLeft: 8 }}>
                        <Trash2 size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="row-between" style={{ marginTop: 12 }}>
                <Button variant="ghost" onClick={() => setTimeOffFor(null)}>{t("common.close")}</Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {inviteFor && (
        <InviteStaffModal
          business={business}
          staff={inviteFor}
          onClose={async () => {
            setInviteFor(null);
            await refresh();
          }}
        />
      )}

      <TimeOffRequests business={business} />
    </div>
  );
}