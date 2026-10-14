import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, RefreshCw } from "lucide-react";
import { listPublicPlans, subscribeToPlans } from "../../services/plans";
import { formatMoney } from "../../utils/format";
import { useI18n } from "../../i18n/I18nContext";

function limitLabel(v) {
  if (v === null || v === undefined) return null;
  if (v === 0) return "∞";
  return String(v);
}

export default function PricingSection({ compact = false }) {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load({ silent = false } = {}) {
    if (!silent) setRefreshing(true);
    try {
      const p = await listPublicPlans();
      setPlans(Array.isArray(p) ? p : []);
      setLastSync(new Date());
      setError("");
    } catch (e) {
      if (!silent) setError(e.message);
    } finally {
      setLoading(false);
      if (!silent) setRefreshing(false);
    }
  }

  useEffect(() => {
    load({ silent: true });
    const unsub = subscribeToPlans(() => load({ silent: true }));
    const interval = setInterval(() => load({ silent: true }), 15_000);
    const onFocus = () => load({ silent: true });
    window.addEventListener("focus", onFocus);
    const onVis = () => { if (document.visibilityState === "visible") onFocus(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      unsub();
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line
  }, []);

  const gridKey = JSON.stringify(
    plans.map((p) => ({
      id: p.id, name: p.name, price: p.price_cents, iv: p.interval,
      ms: p.max_staff, msv: p.max_services, ml: p.max_locations,
      ma: p.max_appointments_per_month, f: p.features,
    }))
  );

  function planLimits(p) {
    const lines = [];
    if (p.max_staff != null) lines.push(`${limitLabel(p.max_staff)} ${t("billing.staffLimit").toLowerCase()}`);
    if (p.max_services != null) lines.push(`${limitLabel(p.max_services)} ${t("billing.servicesLimit").toLowerCase()}`);
    if (p.max_locations != null) lines.push(`${limitLabel(p.max_locations)} ${t("billing.locationsLimit").toLowerCase()}`);
    if (p.max_appointments_per_month != null) {
      lines.push(`${limitLabel(p.max_appointments_per_month)} ${t("billing.apptLimit").toLowerCase()}`);
    }
    return lines;
  }

  return (
    <section id="pricing" style={{
      maxWidth: 1120, margin: "0 auto",
      padding: compact ? "40px 24px" : "64px 24px",
    }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h2 style={{ fontSize: 34, margin: 0, letterSpacing: -0.03 }}>
          {t("billing.availablePlans")}
        </h2>
        <p className="muted" style={{ marginTop: 8, fontSize: 16 }}>
          {t("billing.sub")}
        </p>
      </div>

      {error && (
        <div className="alert alert-error" style={{ maxWidth: 480, margin: "0 auto 20px" }}>
          {error}
        </div>
      )}

      {loading && plans.length === 0 ? (
        <p className="muted" style={{ textAlign: "center" }}>{t("common.loading")}</p>
      ) : plans.length === 0 ? (
        <p className="muted" style={{ textAlign: "center" }}>{t("admin.noPlanBreakdown")}</p>
      ) : (
        <div key={gridKey}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20, alignItems: "stretch",
          }}>
            {plans.map((p, i) => {
              const featured = i === Math.min(1, plans.length - 1);
              const bullets = Array.isArray(p.features?.bullets) ? p.features.bullets : [];
              const highlight = p.features?.highlight || "PLAN";
              const isPaid = p.price_cents > 0;
              const trialDays = Number(p.features?.trial_days) || 0;
              const limits = planLimits(p);
              const cta = isPaid
                ? trialDays > 0
                  ? `${t("auth.signUp")} - ${trialDays} ${locale === "fr" ? "jours gratuits" : "day trial"}`
                  : t("billing.upgrade")
                : t("auth.signUp");

              return (
                <div key={p.id} className="card" style={{
                  padding: 26, position: "relative",
                  display: "flex", flexDirection: "column",
                  borderColor: featured ? "var(--accent)" : "var(--border)",
                  boxShadow: featured ? "0 18px 40px rgba(22,163,74,.15)" : "var(--shadow-sm)",
                  transform: featured ? "translateY(-4px)" : "none",
                  transition: "transform 200ms cubic-bezier(.2,.7,.3,1), box-shadow 200ms",
                }}>
                  {featured && (
                    <div className="badge badge-success" style={{ position: "absolute", top: 14, right: 14 }}>
                      {locale === "fr" ? "Populaire" : "Most popular"}
                    </div>
                  )}

                  <div className="text-xs" style={{ color: "var(--accent)", fontWeight: 700, letterSpacing: 1.4 }}>
                    {String(highlight).toUpperCase()}
                  </div>
                  <h3 style={{ marginTop: 6, marginBottom: 4, fontSize: 22 }}>{p.name}</h3>

                  <div style={{ margin: "12px 0 6px" }}>
                    <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: -0.03 }}>
                      {p.price_cents === 0 ? (locale === "fr" ? "Gratuit" : "Free")
                        : formatMoney(p.price_cents, p.currency)}
                    </span>
                    {p.price_cents > 0 && (
                      <span className="muted" style={{ fontSize: 14 }}> / {p.interval}</span>
                    )}
                  </div>

                  {trialDays > 0 && (
                    <div className="badge" style={{
                      alignSelf: "flex-start", marginBottom: 14,
                      background: "var(--accent-soft)", color: "var(--accent-soft-fg)",
                    }}>
                      {t("billing.trial", { n: trialDays })}
                    </div>
                  )}

                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0", flex: 1 }}>
                    {bullets.map((b, idx) => (
                      <li key={`b-${idx}`} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                        <Check size={16} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 3 }} />
                        <span style={{ fontSize: 14 }}>{b}</span>
                      </li>
                    ))}
                    {limits.map((l, idx) => (
                      <li key={`l-${idx}`} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                        <Check size={16} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 3 }} />
                        <span style={{ fontSize: 14 }}>{l}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`btn ${featured ? "btn-primary" : ""} btn-lg`}
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => navigate(`/signup?plan=${encodeURIComponent(p.code)}`)}
                  >
                    {cta}
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{
            display: "flex", justifyContent: "center",
            alignItems: "center", gap: 12, marginTop: 16,
          }}>
            <button className="btn btn-ghost btn-sm" onClick={() => load()} disabled={refreshing}>
              <RefreshCw size={13} className={refreshing ? "spin" : undefined} />
              {refreshing ? t("common.loading") : t("billing.refresh")}
            </button>
            {lastSync && (
              <span className="muted text-xs">
                {t("billing.sync")} {lastSync.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}