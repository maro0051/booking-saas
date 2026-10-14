import { MapPin, Mail, Phone } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

export default function BusinessHero({ business }) {
  const { t } = useI18n();

  return (
    <div className="card card-accent" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: 24 }}>
        <div className="row" style={{ gap: 16, alignItems: "flex-start" }}>
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.name} style={{
              width: 64, height: 64, borderRadius: 12,
              objectFit: "cover", border: "1px solid var(--border)",
            }} />
          ) : (
            <div style={{
              width: 64, height: 64, borderRadius: 12,
              background: "var(--bg-sunken)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, fontWeight: 700, color: "var(--fg-muted)",
            }}>
              {business.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ marginBottom: 4 }}>{business.name}</h1>
            {business.description && (
              <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>{business.description}</p>
            )}
            <div className="row" style={{ gap: 16, marginTop: 10, flexWrap: "wrap" }}>
              {business.contact_email && (
                <span className="row text-sm muted" style={{ gap: 6 }}>
                  <Mail size={14} /> {business.contact_email}
                </span>
              )}
              {business.contact_phone && (
                <span className="row text-sm muted" style={{ gap: 6 }}>
                  <Phone size={14} /> {business.contact_phone}
                </span>
              )}
              {business.locations?.length > 0 && business.locations[0]?.address && (
                <span className="row text-sm muted" style={{ gap: 6 }}>
                  <MapPin size={14} />
                  {[business.locations[0].address.line1, business.locations[0].address.city]
                    .filter(Boolean).join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}