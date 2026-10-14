import StaffAvatar from "./StaffAvatar";
import { useI18n } from "../../i18n/I18nContext";

export default function StaffStrip({ staff }) {
  const { t } = useI18n();
  if (!staff || staff.length === 0) return null;

  return (
    <div>
      <h3 style={{ marginBottom: 4 }}>{t("booking.ourTeam")}</h3>
      <p className="muted text-sm" style={{ marginTop: 0, marginBottom: 14 }}>
        {t("booking.ourTeamSub")}
      </p>
      <div className="row" style={{ gap: 12, overflowX: "auto", paddingBottom: 6 }}>
        {staff.map((s) => (
          <div key={s.id} className="card" style={{
            minWidth: 180, padding: 14,
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 10, textAlign: "center",
          }}>
            <StaffAvatar name={s.display_name} color={s.color} imageUrl={s.photo_url} size={64} />
            <div>
              <div style={{ fontWeight: 600 }}>{s.display_name}</div>
              {s.title && <div className="muted text-xs">{s.title}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}