import { Link } from "react-router-dom";
import { Calendar, Users, BarChart3, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import MarketingHeader from "../../components/marketing/MarketingHeader";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import PricingSection from "../../components/marketing/PricingSection";
import { useI18n } from "../../i18n/I18nContext";

export default function Landing() {
  const { t, locale } = useI18n();

  const features = [
    {
      icon: Calendar,
      title: locale === "fr" ? "Reservation en ligne" : "Online booking that just works",
      body: locale === "fr"
        ? "Partagez un lien. Les clients choisissent un service, une heure et reservent en quelques secondes."
        : "Share one link. Customers pick a service, choose a time, and book in seconds.",
    },
    {
      icon: Users,
      title: locale === "fr" ? "Gerez votre equipe" : "Manage your team",
      body: locale === "fr"
        ? "Ajoutez du personnel, assignez des services, definissez des horaires et laissez les clients choisir."
        : "Add staff, assign services, set individual schedules, and let customers choose who they want.",
    },
    {
      icon: BarChart3,
      title: locale === "fr" ? "Connaissez vos chiffres" : "Know your numbers",
      body: locale === "fr"
        ? "Consultez vos revenus, reservations et annulations en un coup d'oeil."
        : "See revenue, bookings, and cancellations at a glance.",
    },
    {
      icon: Sparkles,
      title: locale === "fr" ? "Ayez l'air professionnel" : "Look professional",
      body: locale === "fr"
        ? "Une page de reservation brandee avec votre logo, vos services et vos photos."
        : "A branded booking page with your logo, staff photos, and services.",
    },
  ];

  return (
    <div>
      <MarketingHeader />

      <section style={{ position: "relative", overflow: "hidden" }}>
        <div style={{
          maxWidth: 1120, margin: "0 auto", padding: "88px 24px 72px",
          textAlign: "center",
        }}>
          <div className="badge" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 12px", marginBottom: 20,
            background: "var(--accent-soft)", color: "var(--accent-soft-fg)",
            fontSize: 12, fontWeight: 600,
          }}>
            <CheckCircle2 size={14} />
            {locale === "fr" ? "Pour salons, cliniques et studios" : "Built for salons, clinics, and studios"}
          </div>

          <h1 style={{
            fontSize: "clamp(36px, 5.4vw, 60px)",
            lineHeight: 1.06, letterSpacing: -0.03,
            maxWidth: 820, margin: "0 auto 20px",
          }}>
            {locale === "fr"
              ? "La facon la plus simple pour vos clients de reserver."
              : "The easiest way for your customers to book with you."}
          </h1>

          <p className="muted" style={{
            maxWidth: 640, margin: "0 auto 32px", fontSize: 18, lineHeight: 1.55,
          }}>
            {locale === "fr"
              ? "Une plateforme moderne de reservation pour les petites entreprises. Partagez votre lien, recevez des reservations 24/7."
              : "A modern appointment booking platform for small businesses. Share your link, take bookings 24/7, and manage everything from one dashboard."}
          </p>

          <div className="row" style={{ gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/signup">
              <button className="btn btn-primary btn-lg">
                {locale === "fr" ? "Commencer gratuitement" : "Start free"} <ArrowRight size={16} />
              </button>
            </Link>
            <a href="#pricing">
              <button className="btn btn-lg">
                {locale === "fr" ? "Voir les forfaits" : "See pricing"}
              </button>
            </a>
          </div>

          <p className="muted text-xs" style={{ marginTop: 14 }}>
            {locale === "fr" ? "Sans carte de credit - Annulez en tout temps" : "No credit card required - Cancel anytime"}
          </p>
        </div>
      </section>

      <section id="features" style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: 34, margin: 0, letterSpacing: -0.03 }}>
            {locale === "fr" ? "Tout ce dont vous avez besoin." : "Everything you need. Nothing you don't."}
          </h2>
          <p className="muted" style={{ marginTop: 8, fontSize: 16 }}>
            {locale === "fr"
              ? "Concu pour de vraies entreprises."
              : "Built for real businesses that don't want to fight software."}
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 18,
        }}>
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card card-interactive">
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "var(--accent-soft)", color: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 14,
              }}>
                <Icon size={22} />
              </div>
              <h3 style={{ marginBottom: 6, fontSize: 16 }}>{title}</h3>
              <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <PricingSection />

      <MarketingFooter />
    </div>
  );
}