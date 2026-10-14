import { addDaysTo } from "../../utils/calendar";
import { formatInTz } from "../../utils/datetime";
import { useI18n } from "../../i18n/I18nContext";

const HOUR_HEIGHT = 48;

function yFor(date, dayStart) {
  const minutes = (new Date(date) - dayStart) / 60000;
  return (minutes / 60) * HOUR_HEIGHT;
}
function heightFor(start, end) {
  const minutes = (new Date(end) - new Date(start)) / 60000;
  return Math.max(22, (minutes / 60) * HOUR_HEIGHT);
}

export default function WeekView({ weekStart, appointments, timezone, onSelect }) {
  const { locale } = useI18n();
  const days = Array.from({ length: 7 }, (_, i) => addDaysTo(weekStart, i));
  const hours = Array.from({ length: 24 }, (_, i) => i);

  function apptsFor(day) {
    const start = new Date(day); start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return appointments.filter((a) => {
      const s = new Date(a.starts_at);
      return s >= start && s < end;
    });
  }

  return (
    <div className="cal-scroll">
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
        <div />
        {days.map((d) => (
          <div key={d.toISOString()} style={{ padding: 8, textAlign: "center", borderLeft: "1px solid var(--border)" }}>
            <div className="text-xs muted">
              {d.toLocaleDateString(locale === "fr" ? "fr-CA" : "en-US", { weekday: "short", timeZone: "UTC" })}
            </div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{d.getUTCDate()}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", maxHeight: 620, overflowY: "auto" }}>
        <div>
          {hours.map((h) => (
            <div key={h} style={{
              height: HOUR_HEIGHT, padding: "4px 8px", textAlign: "right",
              fontSize: 11, color: "var(--fg-subtle)", borderTop: "1px solid var(--border)",
            }}>{String(h).padStart(2, "0")}:00</div>
          ))}
        </div>

        {days.map((d) => {
          const dayStart = new Date(d); dayStart.setHours(0,0,0,0);
          const list = apptsFor(d);
          return (
            <div key={d.toISOString()} style={{ position: "relative", borderLeft: "1px solid var(--border)" }}>
              {hours.map((h) => (
                <div key={h} style={{ height: HOUR_HEIGHT, borderTop: "1px solid var(--border)" }} />
              ))}
              {list.map((a) => {
                const top = yFor(a.starts_at, dayStart);
                const height = heightFor(a.starts_at, a.ends_at);
                const color = a.staff_color || "var(--accent)";
                return (
                  <button
                    key={a.id}
                    onClick={() => onSelect(a)}
                    style={{
                      position: "absolute", left: 4, right: 4,
                      top, height,
                      padding: "4px 6px",
                      background: "var(--bg-elev)",
                      border: `1px solid ${color}`,
                      borderLeft: `3px solid ${color}`,
                      borderRadius: 6,
                      textAlign: "left",
                      cursor: "pointer",
                      overflow: "hidden",
                      fontSize: 11,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {formatInTz(a.starts_at, timezone, "h:mm a")}
                    </div>
                    <div className="truncate">{a.service_name}</div>
                    <div className="muted truncate">{a.customer_name}</div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
}