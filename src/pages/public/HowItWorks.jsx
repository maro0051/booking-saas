import { Link } from "react-router-dom";
import {
  UserPlus, MailCheck, Building2, Sparkles, Share2, CalendarCheck,
  LogIn, ShieldCheck, CheckCircle2,
} from "lucide-react";
import MarketingHeader from "../../components/marketing/MarketingHeader";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import { useI18n } from "../../i18n/I18nContext";

export default function HowItWorks() {
  const { t, locale } = useI18n();

  const signupSteps = locale === "fr" ? [
    { icon: UserPlus, title: "1. Creez votre compte", body: "Cliquez sur Commencer, entrez votre nom, courriel et mot de passe." },
    { icon: MailCheck, title: "2. Verifiez votre courriel", body: "Si la confirmation est activee, cliquez sur le lien que nous vous envoyons." },
    { icon: Building2, title: "3. Configurez votre entreprise", body: "Nom, URL de reservation, heures d'ouverture." },
    { icon: Sparkles, title: "4. Ajoutez services et personnel", body: "Creez vos services, ajoutez votre equipe, televersez des photos." },
    { icon: Share2, title: "5. Partagez votre lien", body: "Copiez votre lien unique et partagez-le partout." },
    { icon: CalendarCheck, title: "6. Gerez vos reservations", body: "Tout apparait instantanement dans votre tableau de bord." },
  ] : [
    { icon: UserPlus, title: "1. Create your account", body: "Click Get started, enter your name, email, and a password." },
    { icon: MailCheck, title: "2. Verify your email", body: "If email confirmation is on, click the link we send." },
    { icon: Building2, title: "3. Set up your business", body: "Business name, booking URL slug, and opening hours." },
    { icon: Sparkles, title: "4. Add services and staff", body: "Create your services, add team members, upload photos." },
    { icon: Share2, title: "5. Share your booking link", body: "Copy your unique link and share it anywhere." },
    { icon: CalendarCheck, title: "6. Manage your bookings", body: "Every booking appears instantly in your dashboard." },
  ];

  const loginSteps = locale === "fr" ? [
    { icon: LogIn, title: "Allez a la connexion", body: "Visitez /login ou cliquez sur Connexion en haut a droite." },
    { icon: ShieldCheck, title: "Entrez vos identifiants", body: "Utilisez le courriel et le mot de passe de votre inscription." },
    { icon: CheckCircle2, title: "Vous etes connecte", body: "Vous arrivez sur votre tableau de bord. Mot de passe oublie ? Cliquez sur le lien." },
  ] : [
    { icon: LogIn, title: "Go to the sign-in page", body: "Visit /login (or click Sign in on the top right)." },
    { icon: ShieldCheck, title: "Enter your credentials", body: "Use the email and password you registered with." },
    { icon: CheckCircle2, title: "You're in", body: "You land on your dashboard. Forgot your password? Click the link." },
  ];

  return (
    <div>
      <MarketingHeader />

      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "56px 24px 32px" }}>
        <div className="badge" style={{ marginBottom: 14 }}>
          {locale === "fr" ? "Guide entreprise" : "Business guide"}
        </div>
        <h1 style={{ fontSize: "clamp(30px, 4vw, 44px)", letterSpacing: -0.03, maxWidth: 760 }}>
          {locale === "fr"
            ? "Comment s'inscrire, se connecter et commencer a prendre des reservations"
            : "How to sign up, log in, and start taking bookings"}
        </h1>
        <p className="muted" style={{ fontSize: 17, maxWidth: 640, marginTop: 8 }}>
          {locale === "fr"
            ? "Tout ce qu'il faut pour mettre votre entreprise en ligne en moins de 10 minutes."
            : "Everything you need to get your business online in under 10 minutes."}
        </p>
      </section>

      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "24px" }}>
        <h2 style={{ fontSize: 26, marginBottom: 6 }}>
          {locale === "fr" ? "Inscription" : "Signing up"}
        </h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: 20 }}>
          {locale === "fr"
            ? "Suivez ces six etapes. Vous pouvez sauvegarder et revenir plus tard."
            : "Follow these six steps. You can save and come back at any point."}
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}>
          {signupSteps.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card card-interactive">
              <div style={{
                width: 40, height: 40, borderRadius: 11,
                background: "var(--accent-soft)", color: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 12,
              }}>
                <Icon size={20} />
              </div>
              <h3 style={{ marginBottom: 6, fontSize: 15 }}>{title}</h3>
              <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{body}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24 }}>
          <Link to="/signup">
            <button className="btn btn-primary btn-lg">
              {locale === "fr" ? "Creer votre compte entreprise" : "Create your business account"}
            </button>
          </Link>
        </div>
      </section>

      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 24px" }}>
        <h2 style={{ fontSize: 26, marginBottom: 6 }}>
          {locale === "fr" ? "Connexion" : "Logging in"}
        </h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: 20 }}>
          {locale === "fr" ? "De retour ? Voici comment revenir." : "Returning? Here's how to get back in."}
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}>
          {loginSteps.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card">
              <div style={{
                width: 40, height: 40, borderRadius: 11,
                background: "var(--accent-soft)", color: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 12,
              }}>
                <Icon size={20} />
              </div>
              <h3 style={{ marginBottom: 6, fontSize: 15 }}>{title}</h3>
              <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{body}</p>
            </div>
          ))}
        </div>

        <div className="row" style={{ gap: 10, marginTop: 22, flexWrap: "wrap" }}>
          <Link to="/login">
            <button className="btn btn-primary">{t("auth.signIn")}</button>
          </Link>
          <Link to="/forgot-password">
            <button className="btn">{t("auth.forgotPassword")}</button>
          </Link>
        </div>
      </section>

      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px" }}>
        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 22, marginTop: 0 }}>
            {locale === "fr" ? "Vous preferez une video ?" : "Prefer video?"}
          </h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {locale === "fr"
              ? "Regardez une visite guidee de deux minutes."
              : "Watch a two-minute tour of the whole setup."}
          </p>
          <div style={{
            marginTop: 14, aspectRatio: "16 / 9",
            background: "var(--bg-sunken)", borderRadius: 12,
            border: "1px dashed var(--border-strong)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--fg-muted)", fontSize: 14,
          }}>
            {locale === "fr" ? "Video a venir" : "Video coming soon"}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}