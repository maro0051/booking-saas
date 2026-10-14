import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search, AlertTriangle, Mail, Lock, Calendar, Users, CreditCard, Globe,
} from "lucide-react";
import MarketingHeader from "../../components/marketing/MarketingHeader";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import { useI18n } from "../../i18n/I18nContext";

export default function Help() {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const TOPICS = locale === "fr" ? [
    {
      id: "login", icon: Lock, title: "Connexion et compte",
      items: [
        { q: "J'ai oublie mon mot de passe.", a: "Allez a /forgot-password, entrez votre courriel et suivez le lien." },
        { q: "Je ne sais plus quel courriel j'ai utilise.", a: "Cherchez un courriel de confirmation - l'adresse y figure." },
        { q: "Le message dit que ce n'est pas un compte entreprise.", a: "Vous etes probablement connecte avec un compte client. Deconnectez-vous puis reconnectez-vous sur /login." },
      ],
    },
    {
      id: "bookings", icon: Calendar, title: "Reservations",
      items: [
        { q: "Une reservation n'apparait pas.", a: "Verifiez le tableau de bord avec la reference ou le courriel. Sinon, verifiez le lien public utilise." },
        { q: "Comment empecher les doubles reservations ?", a: "Le systeme les empeche automatiquement." },
        { q: "Puis-je exiger un compte ?", a: "Oui, dans Parametres -> Regles de reservation." },
      ],
    },
    {
      id: "staff", icon: Users, title: "Personnel et services",
      items: [
        { q: "Comment ajouter une photo ?", a: "Personnel -> Modifier -> Photo." },
        { q: "Un membre n'apparait pas.", a: "Verifiez qu'il est Actif, assigne a un service, et que le service est en ligne." },
      ],
    },
    {
      id: "payments", icon: CreditCard, title: "Paiements et facturation",
      items: [
        { q: "Comment ameliorer mon forfait ?", a: "Tableau de bord -> Facturation." },
        { q: "Ai-je besoin d'une carte ?", a: "Non. Le forfait Gratuit ne demande aucune carte." },
      ],
    },
    {
      id: "page", icon: Globe, title: "Page de reservation",
      items: [
        { q: "Quel est mon lien ?", a: "Tableau de bord -> Lien de reservation public." },
        { q: "La page dit Non disponible.", a: "Votre entreprise est peut-etre suspendue." },
      ],
    },
  ] : [
    {
      id: "login", icon: Lock, title: "Login & account issues",
      items: [
        { q: "I forgot my password.", a: "Go to /forgot-password, enter your email, and follow the link." },
        { q: "I don't remember my signup email.", a: "Check your inbox for a booking confirmation - it lists the address." },
        { q: "It says this is not a business account.", a: "You may be signed in with a customer account. Sign out and sign in at /login." },
      ],
    },
    {
      id: "bookings", icon: Calendar, title: "Bookings & appointments",
      items: [
        { q: "A booking doesn't show up.", a: "Search the dashboard by reference or email. If nothing shows, check the public link that was used." },
        { q: "How do I prevent double bookings?", a: "The system prevents them automatically." },
        { q: "Can I require an account?", a: "Yes, in Settings -> Booking rules." },
      ],
    },
    {
      id: "staff", icon: Users, title: "Staff & services",
      items: [
        { q: "How do I add a photo?", a: "Staff -> Edit -> Photo." },
        { q: "A staff member isn't showing.", a: "Check they're Active, assigned to a service, and the service is online." },
      ],
    },
    {
      id: "payments", icon: CreditCard, title: "Payments & billing",
      items: [
        { q: "How do I upgrade?", a: "Dashboard -> Billing." },
        { q: "Do I need a card to try?", a: "No. The Free plan requires no card." },
      ],
    },
    {
      id: "page", icon: Globe, title: "Public booking page",
      items: [
        { q: "What is my link?", a: "Dashboard -> Public booking link card." },
        { q: "The page says Not available.", a: "Your business may be suspended." },
      ],
    },
  ];

  const filtered = TOPICS.map((tp) => ({
    ...tp,
    items: tp.items.filter((i) =>
      !q || i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q) || tp.title.toLowerCase().includes(q)
    ),
  })).filter((tp) => tp.items.length > 0);

  return (
    <div>
      <MarketingHeader />

      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "56px 24px 24px", textAlign: "center" }}>
        <div className="badge" style={{ marginBottom: 14 }}>
          {locale === "fr" ? "Centre d'aide" : "Help center"}
        </div>
        <h1 style={{ fontSize: "clamp(30px, 4vw, 42px)", letterSpacing: -0.03 }}>
          {locale === "fr" ? "Comment pouvons-nous aider ?" : "How can we help?"}
        </h1>
        <p className="muted" style={{ fontSize: 16, maxWidth: 560, margin: "8px auto 24px" }}>
          {locale === "fr"
            ? "Recherchez un probleme ou parcourez les sections ci-dessous."
            : "Search common issues or browse the sections below."}
        </p>

        <div style={{ maxWidth: 520, margin: "0 auto", position: "relative" }}>
          <Search size={16} style={{
            position: "absolute", left: 14, top: "50%",
            transform: "translateY(-50%)", color: "var(--fg-subtle)",
          }} />
          <input
            className="input"
            placeholder={locale === "fr" ? "Rechercher dans l'aide..." : "Search help topics..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>
      </section>

      <section style={{ maxWidth: 960, margin: "0 auto", padding: "8px 24px 40px" }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <AlertTriangle size={26} style={{ color: "var(--warning-600)", marginBottom: 8 }} />
            <h3 style={{ marginBottom: 4 }}>{locale === "fr" ? "Aucun resultat" : "No results"}</h3>
            <p className="muted" style={{ marginBottom: 12 }}>{query}</p>
            <Link to="/help" onClick={() => setQuery("")}>
              <button className="btn">{locale === "fr" ? "Effacer" : "Clear search"}</button>
            </Link>
          </div>
        ) : (
          <div className="stack" style={{ gap: 24 }}>
            {filtered.map(({ id, icon: Icon, title, items }) => (
              <div key={id}>
                <div className="row" style={{ gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: "var(--accent-soft)", color: "var(--accent)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={17} />
                  </div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
                </div>
                <div className="stack" style={{ gap: 8 }}>
                  {items.map((item) => (
                    <details key={item.q} className="card" style={{ padding: 16 }}>
                      <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14.5, outline: "none" }}>
                        {item.q}
                      </summary>
                      <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>{item.a}</p>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ maxWidth: 960, margin: "0 auto", padding: "24px 24px 56px" }}>
        <div className="card" style={{
          padding: 28,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 16, flexWrap: "wrap", borderColor: "var(--accent)",
        }}>
          <div>
            <h3 style={{ margin: 0, marginBottom: 4 }}>
              {locale === "fr" ? "Toujours bloque ?" : "Still stuck?"}
            </h3>
            <p className="muted" style={{ margin: 0 }}>
              {locale === "fr"
                ? "Envoyez-nous un message, nous repondons sous 1 jour ouvre."
                : "Send us a message and we'll get back to you within 1 business day."}
            </p>
          </div>
          <a href="mailto:support@yourdomain.com" className="btn btn-primary btn-lg">
            <Mail size={16} /> {locale === "fr" ? "Contacter le soutien" : "Contact support"}
          </a>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}