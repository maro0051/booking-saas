import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import { useBusinessContext } from "../../hooks/useBusinessContext";
import { defaultWeek, listBusinessHours, replaceBusinessHours } from "../../services/businessHours";
import { listClosures, createClosure, deleteClosure } from "../../services/closures";
import { useI18n } from "../../i18n/I18nContext";

const DAY_KEYS = ["availability.days.sun", "availability.days.mon", "availability.days.tue",
                  "availability.days.wed", "availability.days.thu", "availability.days.fri",
                  "availability.days.sat"];

export default function BusinessAvailability() {
  const business = useBusinessContext();
  const { t } = useI18n();
  const [hours, setHours] = useState(defaultWeek());
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  const [closureForm, setClosureForm] = useState({ starts_at: "", ends_at: "", reason: "" });

  async function refresh() {
    setLoading(true);
    try {
      const [h, c] = await Promise.all([
        listBusinessHours(business.id),
        listClosures(business.id),
      ]);
      const week = defaultWeek();
      for (const row of h) {
        const idx = week.findIndex((w) => w.weekday === row.weekday);
        if (idx >= 0) {
          week[idx] = {
            weekday: row.weekday,
            is_open: true,
            open_time: row.open_time.slice(0, 5),
            close_time: row.close_time.slice(0, 5),
          };
        }
      }
      setHours(week);
      setClosures(c);
      setError("");
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line
  }, [business.id]);

  async function handleSaveHours() {
    setSaving(true); setError("");
    try {
      await replaceBusinessHours(business.id, hours);
      setSavedAt(new Date());
    } catch (e) { setError(e.message); }
    setSaving(false);
  }

  async function handleAddClosure(e) {
    e.preventDefault();
    if (!closureForm.starts_at || !closureForm.ends_at) return;
    try {
      await createClosure(business.id, {
        starts_at: new Date(closureForm.starts_at).toISOString(),
        ends_at: new Date(closureForm.ends_at).toISOString(),
        reason: closureForm.reason,
      });
      setClosureForm({ starts_at: "", ends_at: "", reason: "" });
      setClosures(await listClosures(business.id));
    } catch (e) { alert(e.message); }
  }

  async function handleDeleteClosure(id) {
    try {
      await deleteClosure(id);
      setClosures(await listClosures(business.id));
    } catch (e) { alert(e.message); }
  }

  return (
    <div>
      <h1>{t("availability.title")}</h1>
      <p className="muted">{t("availability.sub")}</p>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? <Card><p className="muted">{t("common.loading")}</p></Card> : (
        <>
          <Card style={{ marginBottom: 20 }}>
            <h3>{t("availability.weeklyHours")}</h3>
            <div className="stack">
              {hours.map((h) => (
                <div key={h.weekday} className="row" style={{ gap: 10 }}>
                  <label style={{ width: 130, display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={h.is_open}
                      onChange={(e) =>
                        setHours((arr) =>
                          arr.map((x) =>
                            x.weekday === h.weekday ? { ...x, is_open: e.target.checked } : x
                          )
                        )
                      }
                    />
                    {t(DAY_KEYS[h.weekday])}
                  </label>
                  <input
                    type="time" className="input" style={{ width: 120 }}
                    value={h.open_time} disabled={!h.is_open}
                    onChange={(e) =>
                      setHours((arr) =>
                        arr.map((x) =>
                          x.weekday === h.weekday ? { ...x, open_time: e.target.value } : x
                        )
                      )
                    }
                  />
                  <span className="muted">-</span>
                  <input
                    type="time" className="input" style={{ width: 120 }}
                    value={h.close_time} disabled={!h.is_open}
                    onChange={(e) =>
                      setHours((arr) =>
                        arr.map((x) =>
                          x.weekday === h.weekday ? { ...x, close_time: e.target.value } : x
                        )
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <div className="row-between" style={{ marginTop: 12 }}>
              <span className="muted" style={{ fontSize: 12 }}>
                {savedAt ? `${t("common.saved")} ${savedAt.toLocaleTimeString()}` : ""}
              </span>
              <Button variant="primary" onClick={handleSaveHours} disabled={saving}>
                {saving ? t("common.saving") : t("availability.saveHours")}
              </Button>
            </div>
          </Card>

          <Card>
            <h3>{t("availability.closures")}</h3>
            <p className="muted">{t("availability.closuresSub")}</p>
            <form onSubmit={handleAddClosure} className="stack" style={{ marginBottom: 12 }}>
              <div className="row" style={{ gap: 12 }}>
                <Input
                  label={t("availability.starts")}
                  type="datetime-local"
                  value={closureForm.starts_at}
                  onChange={(e) => setClosureForm((f) => ({ ...f, starts_at: e.target.value }))}
                  required
                />
                <Input
                  label={t("availability.ends")}
                  type="datetime-local"
                  value={closureForm.ends_at}
                  onChange={(e) => setClosureForm((f) => ({ ...f, ends_at: e.target.value }))}
                  required
                />
              </div>
              <Input
                label={t("availability.reason")}
                value={closureForm.reason}
                onChange={(e) => setClosureForm((f) => ({ ...f, reason: e.target.value }))}
              />
              <Button variant="primary" type="submit">
                <Plus size={16} /> {t("availability.addClosure")}
              </Button>
            </form>

            {closures.length === 0 ? (
              <p className="muted">{t("availability.noClosures")}</p>
            ) : (
              <ul style={{ paddingLeft: 16 }}>
                {closures.map((c) => (
                  <li key={c.id} style={{ marginBottom: 6 }}>
                    {new Date(c.starts_at).toLocaleString()} -{" "}
                    {new Date(c.ends_at).toLocaleString()}
                    {c.reason ? ` (${c.reason})` : ""}
                    <button
                      className="btn btn-ghost"
                      onClick={() => handleDeleteClosure(c.id)}
                      style={{ marginLeft: 8 }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}