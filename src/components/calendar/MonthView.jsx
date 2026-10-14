import { addDaysTo } from "../../utils/calendar";
import { formatInTz } from "../../utils/datetime";
import { useI18n } from "../../i18n/I18nContext";

export default function MonthView({ monthStart, appointments, timezone, onSelect }) {
  const { locale } = useI18n();
  const DAY_LABELS = [
    "common.daysMon", "common.daysTue", "common.daysWed",
    "common.daysThu", "common.daysFri", "common.daysSat", "common.daysSun"
  ].map((k) => {
    // Fallback to short English names if key missing
    const map = {
      "common.daysMon": { en: "Mon", fr: "Lun" },
      "common.daysTue": { en: "Tue", fr: "Mar" },
      "common.daysWed": { en: "Wed", fr: "Mer" },
      "common.daysThu": { en: "Thu", fr: "Jeu" },
      "common.daysFri": { en: "Fri", fr: "Ven" },
      "common.daysSat": { en: "Sat", fr: "Sam" },
      "common.daysSun": { en: "Sun", fr: "Dim" },
    };
    return locale === "fr" ? map[k].fr : map[k].en;
  });
  const start = new Date(monthStart);
  const dow = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dow);

  const cells = Array.from({ length: 42 }, (_, i) => addDaysTo(start, i));
  const month = monthStart.getMonth();

  function apptsFor(day) {
    const dayStart = new Date(day); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    return appointments
      .filter((a) => {
        const s = new Date(a.starts_at);
        return s >= dayStart && s < dayEnd;
      })
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-xs muted" style={{
            padding: 8, textAlign: "center", borderLeft: "1px solid var(--border)",
            letterSpacing: .5, textTransform: "uppercase",
          }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: "repeat(6, 1fr)" }}>
        {cells.map((d, i) => {
          const isOtherMonth = d.getMonth() !== month;
          const isToday = d.toDateString() === new Date().toDateString();
          const list = apptsFor(d);
          return (
            <div
              key={d.toISOString()}
              style={{
                minHeight: 110, padding: 6,
                borderLeft: i % 7 === 0 ? "none" : "1px solid var(--border)",
                borderTop: i < 7 ? "none" : "1px solid var(--border)",
                background: isOtherMonth ? "var(--bg-sunken)" : "transparent",
                opacity: isOtherMonth ? 0.6 : 1,
              }}
            >
              <div className="row-between" style={{ marginBottom: 4 }}>
                <span className="text-xs" style={{
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? "var(--accent)" : "var(--fg-muted)",
                }}>
                  {d.getUTCDate()}
                </span>
                {list.length > 3 && (
                  <span className="text-xs muted">+{list.length - 3}</span>
                )}
              </div>
              <div className="stack" style={{ gap: 2 }}>
                {list.slice(0, 3).map((a) => {
                  const color = a.staff_color || "var(--accent)";
                  return (
                    <button
                      key={a.id}
                      onClick={() => onSelect(a)}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "2px 6px", fontSize: 11,
                        background: "var(--bg-elev)",
                        border: "1px solid var(--border)",
                        borderLeft: `3px solid ${color}`,
                        borderRadius: 4, cursor: "pointer",
                        whiteSpace: "nowrap", overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {formatInTz(a.starts_at, timezone, "h:mm a")} {a.service_name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}