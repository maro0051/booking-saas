import { useEffect, useState } from "react";
import { Check, ArrowUpRight, Sparkles, RefreshCw } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";
import { useBusinessContext } from "../../hooks/useBusinessContext";
import { billingSummary, switchPlan } from "../../services/billing";
import { listPublicPlans, subscribeToPlans } from "../../services/plans";
import { formatMoney } from "../../utils/format";
import { useI18n } from "../../i18n/I18nContext";

function Usage({ label, current, max, unlimitedLabel }) {
  const unlimited = !max || max <= 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((current / max) * 100));
  const over = !unlimited && current >= max;
  const warning = !unlimited && current >= max * 0.8 && !over;

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 6 }}>
        <span className="muted text-sm">{label}</span>
        <span style={{ fontWeight: 600, fontSize: 13 }}>
          {current}
          {!unlimited && ` / ${max}`}
          {unlimited && ` - ${unlimitedLabel}`}
        </span>
      </div>
      <div style={{
        height: 6, background: "var(--bg-sunken)", borderRadius: 999, overflow: "hidden",
      }}>
        <div style={{
          width: `${unlimited ? 0 : pct}%`, height: "100%",
          background: over ? "var(--danger-600)" : warning ? "var(--warning-600)" : "var(--accent)",
          transition: "width 240ms cubic-bezier(.2,.7,.3,1)",
        }} />
      </div>
    </div>
  );
}

export default function BusinessBilling() {
  const business = useBusinessContext();
  const { t } = useI18n();
  const [summary, setSummary] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  async function refresh({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const [s, p] = await Promise.all([
        billingSummary(business.id),
        listPublicPlans(),
      ]);
      setSummary(s);
      setPlans(Array.isArray(p) ? p : []);
      setLastSync(new Date());
      setError("");
    } catch (e) { setError(e.message); }
    finally { if (!silent) setLoading(false); }
  }

  useEffect(() => {
    refresh();
    const unsub = subscribeToPlans(() => refresh({ silent: true }));
    const interval = setInterval(() => refresh({ silent: true }), 15_000);
    const onFocus = () => refresh({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => {
      unsub();
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line
  }, [business.id]);

  async function choosePlan(plan) {
    const confirmed = confirm(
      plan.price_cents > 0
        ? `Switch to ${plan.name} (${formatMoney(plan.price_cents, plan.currency)}/${plan.interval})?`
        : `Switch to the ${plan.name} plan?`
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      const result = await switchPlan(business.id, plan.id);
      await refresh();
      const disabled = result?.disabled_count || 0;
      if (disabled > 0) {
        const items = disabled === 1 ? t("billing.itemSingular") : t("billing.itemPlural");
        setMessage(
          t("billing.switchedWithDisabled", {
            plan: plan.name,
            count: disabled,
            items,
          })
        );
      } else {
        setMessage(t("billing.switchedTo", { plan: plan.name }));
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (loading && !summary) {
    return <Card><p className="muted">{t("common.loading")}</p></Card>;
  }

  const current = summary?.plan;
  const usage = summary?.usage || {};
  const gridKey = JSON.stringify(plans.map((p) => ({ id: p.id, n: p.name, pr: p.price_cents, f: p.features })));

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ margin: 0 }}>{t("billing.title")}</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>{t("billing.sub")}</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => refresh()}>
            <RefreshCw size={13} /> {t("billing.refresh")}
          </button>
          {lastSync && (
            <span className="muted text-xs">
              {t("billing.sync")} {lastSync.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {message && (
        <div style={{ marginBottom: 16 }}>
          <Alert variant="info">{message}</Alert>
        </div>
      )}

      <div className="grid-2-responsive" style={{ marginBottom: 24 }}>
        <Card>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div>
              <div className="text-xs muted">{t("billing.currentPlan")}</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>
                {current?.name || "Free"}
              </div>
            </div>
            <Sparkles size={22} style={{ color: "var(--accent)" }} />
          </div>

          <div style={{ fontSize: 15, marginBottom: 12 }}>
            {current && current.price_cents > 0
              ? `${formatMoney(current.price_cents, current.currency)} / ${current.interval}`
              : t("billing.freeForever")}
          </div>

          {current?.features?.trial_days > 0 && (
            <div className="badge badge-success" style={{ marginBottom: 14 }}>
              {t("billing.trial", { n: current.features.trial_days })}
            </div>
          )}

          <div className="stack" style={{ gap: 14 }}>
            <Usage label={t("billing.staffLimit")} current={usage.staff || 0}
                   max={current?.max_staff} unlimitedLabel={t("billing.unlimited")} />
            <Usage label={t("billing.servicesLimit")} current={usage.services || 0}
                   max={current?.max_services} unlimitedLabel={t("billing.unlimited")} />
            <Usage label={t("billing.locationsLimit")} current={usage.locations || 0}
                   max={current?.max_locations} unlimitedLabel={t("billing.unlimited")} />
            <Usage label={t("billing.apptLimit")} current={usage.appointments_this_month || 0}
                   max={current?.max_appointments_per_month} unlimitedLabel={t("billing.unlimited")} />
          </div>
        </Card>

        <Card>
          <h3 style={{ marginTop: 0 }}>{t("billing.atLimit")}</h3>
          <p className="muted text-sm">{t("billing.atLimitBody")}</p>
          <ul className="muted text-sm" style={{ paddingLeft: 18, lineHeight: 1.7 }}>
            <li>{t("billing.atLimitBullet1")}</li>
            <li>{t("billing.atLimitBullet2")}</li>
            <li>{t("billing.atLimitBullet3")}</li>
          </ul>
        </Card>
      </div>

      <h2 style={{ marginTop: 8 }}>{t("billing.availablePlans")}</h2>
      <div
        key={gridKey}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {plans.map((p) => {
          const isCurrent = current?.id === p.id;
          const isUpgrade = !isCurrent && current && p.price_cents >= current.price_cents;
          const bullets = Array.isArray(p.features?.bullets) ? p.features.bullets : [];
          const trial = Number(p.features?.trial_days) || 0;

          return (
            <Card
              key={p.id}
              style={{
                display: "flex", flexDirection: "column",
                borderColor: isCurrent ? "var(--accent)" : "var(--border)",
                boxShadow: isCurrent ? "0 12px 32px rgba(22,163,74,.14)" : "var(--shadow-sm)",
              }}
            >
              <div className="row-between" style={{ marginBottom: 6 }}>
                <h3 style={{ margin: 0 }}>{p.name}</h3>
                {isCurrent && <span className="badge badge-success">{t("billing.current")}</span>}
              </div>

              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 26, fontWeight: 700 }}>
                  {p.price_cents === 0 ? "Free" : formatMoney(p.price_cents, p.currency)}
                </span>
                {p.price_cents > 0 && (
                  <span className="muted" style={{ fontSize: 13 }}>
                    {" / "}{p.interval}
                  </span>
                )}
              </div>

              {trial > 0 && (
                <div className="badge" style={{
                  alignSelf: "flex-start", marginBottom: 12,
                  background: "var(--accent-soft)", color: "var(--accent-soft-fg)",
                }}>
                  {t("billing.trial", { n: trial })}
                </div>
              )}

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px 0", flex: 1 }}>
                {bullets.map((b, idx) => (
                  <li key={`${b}-${idx}`} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                    <Check size={15} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 3 }} />
                    <span style={{ fontSize: 13.5 }}>{b}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={isUpgrade ? "primary" : ""}
                disabled={isCurrent || busy}
                onClick={() => choosePlan(p)}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {isCurrent
                  ? t("billing.currentPlanBtn")
                  : isUpgrade
                    ? <><ArrowUpRight size={15} /> {t("billing.upgrade")}</>
                    : t("billing.downgrade")}
              </Button>
            </Card>
          );
        })}
      </div>

      <h2 style={{ marginTop: 32 }}>{t("billing.billingHistory")}</h2>
      <Card>
        <p className="muted text-sm" style={{ margin: 0 }}>
          {t("billing.noInvoices")}
        </p>
      </Card>
    </div>
  );
}