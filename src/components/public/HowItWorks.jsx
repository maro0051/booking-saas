import { UserPlus, CalendarPlus, LayoutDashboard } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

export default function HowItWorks() {
  const { t } = useI18n();

  const steps = [
    { icon: UserPlus, title: t("booking.step1"), body: t("booking.step1Body"), accent: "#6366f1" },
    { icon: CalendarPlus, title: t("booking.step2"), body: t("booking.step2Body"), accent: "#10b981" },
    { icon: LayoutDashboard, title: t("booking.step3"), body: t("booking.step3Body"), accent: "#f59e0b" },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 16,
    }}>
      {steps.map(({ icon: Icon, title, body, accent }) => (
        <div key={title} className="card card-interactive">
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `color-mix(in srgb, ${accent} 15%, transparent)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 12,
          }}>
            <Icon size={22} style={{ color: accent }} />
          </div>
          <h3 style={{ marginBottom: 6, fontSize: 15 }}>{title}</h3>
          <p className="muted text-sm" style={{ margin: 0, lineHeight: 1.55 }}>{body}</p>
        </div>
      ))}
    </div>
  );
}