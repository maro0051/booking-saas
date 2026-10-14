import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import Card from "../../components/ui/Card";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import {
  myStaffRow, myHours, businessHours, replaceMyHours,
} from "../../services/staffPortal";
import { useI18n } from "../../i18n/I18nContext";

const DAY_KEYS = [
  "availability.days.sun", "availability.days.mon", "availability.days.tue",
  "availability.days.wed", "availability.days.thu", "availability.days.fri",
  "availability.days.sat",
];

const DEFAULT_START = "09:00";
const DEFAULT_END = "17:00";

export default function StaffHours() {
  const { t } = useI18n();
  const [staff, setStaff] = useState(null);
  const [hours, setHours] = useState([]);
  const [bizHours, setBizHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [row, h, bh] = await Promise.all([
        myStaffRow(),
        myHours(),
        businessHours(),
      ]);
      setStaff(row);
      setBizHours(bh);

      // Build 7-day array: each day either has a row (open) or is empty.
      const week = Array.from({ length: 7 }, (_, i) => {
        const match = h.find((x) => x.weekday === i);
        const biz = bh.find((b) => b.weekday === i);
        return {
          weekday: i,
          is_open: !!match,
          start_time: match ? String(match.start_time).slice(0, 5) : (biz ? String(biz.open_time).slice(0, 5) : DEFAULT_START),
          end_time: match ? String(match.end_time).slice(0, 5) : (biz ? String(biz.close_time).slice(0, 5) : DEFAULT_END),
          business_open: !!biz,
          business_start: biz ? String(biz.open_time).slice(0, 5) : null,
          business_end: biz ? String(biz.close_time).slice(0, 5) : null,
        };
      });
      setHours(week);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function handleSave() {
    setError("");
    setSaved(false);

    // Validate against business hours.
    for (const row of hours) {
      if (!row.is_open) continue;
      if (!row.business_open) {
        setError(t("staffPortal.businessHours"));
        return;
      }
      if (row.start_time < row.business_start || row.end_time > row.business_end) {
        setError(t("staffPortal.hoursSub"));
        return;
      }
      if (row.start_time >= row.end_time) {
        setError(t("staffPortal.hoursError"));
        return;
      }
    }

    const payload = hours
      .filter((r) => r.is_open)
      .map((r) => ({
        weekday: r.weekday,
        start_time: r.start_time,
        end_time: r.end_time,
      }));

    setSaving(true);
    try {
      await replaceMyHours(payload);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Card><p className="muted">{t("common.loading")}</p></Card>;
  if (!staff) return <Alert variant="error">{t("auth.notStaffHere")}</Alert>;

  return (
    <div>
      <h1>{t("staffPortal.hours")}</h1>
      <p className="muted">{t("staffPortal.hoursSub")}</p>

      {error && <Alert variant="error">{error}</Alert>}
      {saved && <Alert variant="success">{t("staffPortal.hoursSaved")}</Alert>}

      <Card style={{ marginTop: 12 }}>
        <div className="stack">
          {hours.map((row) => (
            <div key={row.weekday} className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <label style={{ width: 130, display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={row.is_open}
                  disabled={!row.business_open}
                  onChange={(e) => setHours((arr) => arr.map((x) =>
                    x.weekday === row.weekday ? { ...x, is_open: e.target.checked } : x
                  ))}
                />
                {t(DAY_KEYS[row.weekday])}
              </label>

              {!row.business_open ? (
                <span className="muted text-sm">{t("staffPortal.businessHours")}</span>
              ) : (
                <>
                  <input
                    type="time"
                    className="input"
                    style={{ width: 120 }}
                    value={row.start_time}
                    min={row.business_start}
                    max={row.business_end}
                    disabled={!row.is_open}
                    onChange={(e) => setHours((arr) => arr.map((x) =>
                      x.weekday === row.weekday ? { ...x, start_time: e.target.value } : x
                    ))}
                  />
                  <span className="muted">-</span>
                  <input
                    type="time"
                    className="input"
                    style={{ width: 120 }}
                    value={row.end_time}
                    min={row.business_start}
                    max={row.business_end}
                    disabled={!row.is_open}
                    onChange={(e) => setHours((arr) => arr.map((x) =>
                      x.weekday === row.weekday ? { ...x, end_time: e.target.value } : x
                    ))}
                  />
                  <span className="muted text-xs">
                    ({t("staff.businessHours")}: {row.business_start} - {row.business_end})
                  </span>
                </>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saving ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </Card>
    </div>
  );
}