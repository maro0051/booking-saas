import { formatInTz } from "../../utils/datetime";

const HOUR_HEIGHT = 56;

function yFor(date, dayStart) {
  const minutes = (new Date(date) - dayStart) / 60000;
  return (minutes / 60) * HOUR_HEIGHT;
}
function heightFor(start, end) {
  const minutes = (new Date(end) - new Date(start)) / 60000;
  return Math.max(24, (minutes / 60) * HOUR_HEIGHT);
}

export default function DayView({ date, appointments, timezone, onSelect }) {
  const dayStart = new Date(date); dayStart.setHours(0,0,0,0);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="cal-scroll">
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", position: "relative", maxHeight: 640, overflowY: "auto" }}>
        <div>
          {hours.map((h) => (
            <div key={h} style={{
              height: HOUR_HEIGHT, padding: "4px 8px", textAlign: "right",
              fontSize: 11, color: "var(--fg-subtle)",
              borderTop: "1px solid var(--border)",
            }}>
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        <div style={{ position: "relative", borderLeft: "1px solid var(--border)" }}>
          {hours.map((h) => (
            <div key={h} style={{ height: HOUR_HEIGHT, borderTop: "1px solid var(--border)" }} />
          ))}

          {appointments.map((a) => {
            const top = yFor(a.starts_at, dayStart);
            const height = heightFor(a.starts_at, a.ends_at);
            const color = a.staff_color || "var(--accent)";
            return (
              <button
                key={a.id}
                onClick={() => onSelect(a)}
                style={{
                  position: "absolute", left: 6, right: 6,
                  top, height,
                  padding: "6px 10px",
                  background: "var(--bg-elev)",
                  border: `1px solid ${color}`,
                  borderLeft: `4px solid ${color}`,
                  borderRadius: 8,
                  textAlign: "left",
                  cursor: "pointer",
                  overflow: "hidden",
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  {formatInTz(a.starts_at, timezone, "h:mm a")} Â· {a.service_name}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {a.customer_name}
                  {a.staff_name ? ` Â· ${a.staff_name}` : ""}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
    </div>
  );
}