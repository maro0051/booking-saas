import MarketingHeader from "../../components/marketing/MarketingHeader";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import PricingSection from "../../components/marketing/PricingSection";
import { useI18n } from "../../i18n/I18nContext";

export default function Pricing() {
  const { t, locale } = useI18n();

  const FAQ = locale === "fr" ? [
    { q: "Puis-je changer de forfait plus tard ?", a: "Oui. Ameliorez ou retrogradez a tout moment depuis votre tableau de bord." },
    { q: "Facturez-vous par reservation ?", a: "Non. Vous payez un tarif mensuel fixe." },
    { q: "Que se passe-t-il si je depasse mes limites ?", a: "Nous vous prevenons et suspendons les nouvelles reservations jusqu'a la mise a niveau. Rien n'est supprime." },
    { q: "Puis-je annuler a tout moment ?", a: "Oui. Annulation en un clic. Vos donnees sont conservees 30 jours." },
  ] : [
    { q: "Can I change plans later?", a: "Yes. Upgrade or downgrade anytime from your business dashboard." },
    { q: "Do you charge per booking?", a: "No. You pay a flat monthly fee based on your plan." },
    { q: "What happens if I go over my plan limits?", a: "We'll notify you and pause new bookings until you upgrade. Nothing is deleted." },
    { q: "Can I cancel anytime?", a: "Yes. Cancel in one click. Your data stays for 30 days." },
  ];

  return (
    <div>
      <MarketingHeader />
      <PricingSection />

      <section style={{ maxWidth: 820, margin: "0 auto", padding: "24px 24px 48px" }}>
        <h2 style={{ fontSize: 26, marginBottom: 16 }}>
          {locale === "fr" ? "Questions frequentes" : "Frequently asked"}
        </h2>
        <div className="stack" style={{ gap: 14 }}>
          {FAQ.map((item) => (
            <details key={item.q} className="card" style={{ padding: 18, cursor: "pointer" }}>
              <summary style={{ fontWeight: 600, fontSize: 15, cursor: "pointer", outline: "none" }}>
                {item.q}
              </summary>
              <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}