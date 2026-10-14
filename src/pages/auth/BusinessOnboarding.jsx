import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import { useAuth } from "../../hooks/useAuth";
import { useBusiness } from "../../hooks/useBusiness";
import { slugify, isReservedSlug } from "../../utils/slugify";
import { businessBasicsSchema } from "../../schemas/business";
import { defaultWeek } from "../../services/businessHours";
import {
  checkSlugAvailable,
  createBusinessWithOwner,
} from "../../services/businesses";
import { replaceBusinessHours } from "../../services/businessHours";
import { supabase } from "../../lib/supabaseClient";

const STEPS = ["Business info", "Opening hours", "Done"];

export default function BusinessOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { business, loading: bizLoading, refresh } = useBusiness();

  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [basics, setBasics] = useState({
    name: "",
    slug: "",
    description: "",
    contact_email: "",
    contact_phone: "",
    timezone: "America/Toronto",
    currency: "CAD",
    locale: "en",
  });
  const [slugTaken, setSlugTaken] = useState(false);
  const [hours, setHours] = useState(defaultWeek());

  // If the user already has a business, don't let them re-onboard.
  useEffect(() => {
    if (!bizLoading && business) {
      navigate("/dashboard", { replace: true });
    }
  }, [bizLoading, business, navigate]);

  // Auto-suggest slug from name until the user edits it.
  const [slugTouched, setSlugTouched] = useState(false);
  function handleNameChange(e) {
    const name = e.target.value;
    setBasics((b) => ({ ...b, name, slug: slugTouched ? b.slug : slugify(name) }));
  }

  async function validateStep1() {
    setError("");
    const parsed = businessBasicsSchema.safeParse(basics);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please review the form");
      return false;
    }
    if (isReservedSlug(basics.slug)) {
      setError("That slug is reserved. Please pick another.");
      return false;
    }
    const available = await checkSlugAvailable(basics.slug);
    setSlugTaken(!available);
    if (!available) {
      setError("That booking URL is already taken. Try another slug.");
      return false;
    }
    return true;
  }

  async function handleNext() {
    if (step === 0) {
      if (await validateStep1()) setStep(1);
    } else if (step === 1) {
      await handleCreate();
    }
  }

  async function handleCreate() {
    setSaving(true);
    setError("");
    try {
      const created = await createBusinessWithOwner({ payload: basics });
      await replaceBusinessHours(
        created.id,
        hours.filter((h) => h.is_open)
      );
      await refresh();
      setStep(2);
    } catch (e) {
      setError(e.message || "Failed to create business");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 680, paddingTop: 40 }}>
      <Card>
        <h1>Set up your business</h1>

        <div className="row" style={{ marginBottom: 20, gap: 8 }}>
          {STEPS.map((label, i) => (
            <div key={label} className="row" style={{ gap: 6 }}>
              <span
                className="badge"
                style={{
                  background: i <= step ? "var(--color-primary)" : "#e5e7eb",
                  color: i <= step ? "#fff" : "#111827",
                  width: 24, height: 24, justifyContent: "center",
                }}
              >
                {i < step ? <Check size={12} /> : i + 1}
              </span>
              <span className="muted" style={{ fontSize: 13 }}>{label}</span>
              {i < STEPS.length - 1 && <span style={{ width: 20 }} />}
            </div>
          ))}
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {step === 0 && (
          <div className="stack">
            <Input label="Business name" value={basics.name}
                   onChange={handleNameChange} required />
            <Input
              label="Public booking URL slug"
              value={basics.slug}
              onChange={(e) => { setSlugTouched(true); setBasics((b) => ({ ...b, slug: slugify(e.target.value) })); }}
              required
            />
            <p className="muted" style={{ fontSize: 13, marginTop: -6 }}>
              Your page will be at <code>/book/{basics.slug || "your-slug"}</code>
              {slugTaken && <span style={{ color: "var(--color-danger)" }}> â€” taken</span>}
            </p>
            <Input label="Description (optional)" value={basics.description}
                   onChange={(e) => setBasics((b) => ({ ...b, description: e.target.value }))} />
            <Input label="Contact email (optional)" type="email" value={basics.contact_email}
                   onChange={(e) => setBasics((b) => ({ ...b, contact_email: e.target.value }))} />
            <Input label="Contact phone (optional)" value={basics.contact_phone}
                   onChange={(e) => setBasics((b) => ({ ...b, contact_phone: e.target.value }))} />
            <div className="row" style={{ gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="muted" style={{ fontSize: 13 }}>Timezone</label>
                <select
                  className="select"
                  value={basics.timezone}
                  onChange={(e) => setBasics((b) => ({ ...b, timezone: e.target.value }))}
                >
                  {[
                    "America/Toronto", "America/Vancouver", "America/Edmonton",
                    "America/Winnipeg", "America/Halifax", "America/New_York",
                    "America/Los_Angeles", "Europe/London", "Europe/Paris",
                  ].map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div style={{ width: 120 }}>
                <label className="muted" style={{ fontSize: 13 }}>Currency</label>
                <select
                  className="select"
                  value={basics.currency}
                  onChange={(e) => setBasics((b) => ({ ...b, currency: e.target.value }))}
                >
                  {["CAD", "USD", "EUR", "GBP"].map((c) =>
                    <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="stack">
            <p className="muted">Set your default weekly opening hours. You can add per-location and per-staff hours later.</p>
            {hours.map((h) => (
              <div key={h.weekday} className="row" style={{ gap: 10 }}>
                <label style={{ width: 110, display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={h.is_open}
                    onChange={(e) =>
                      setHours((arr) => arr.map((x) =>
                        x.weekday === h.weekday ? { ...x, is_open: e.target.checked } : x
                      ))
                    }
                  />
                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][h.weekday]}
                </label>
                <input
                  type="time"
                  className="input"
                  style={{ width: 120 }}
                  value={h.open_time}
                  disabled={!h.is_open}
                  onChange={(e) =>
                    setHours((arr) => arr.map((x) =>
                      x.weekday === h.weekday ? { ...x, open_time: e.target.value } : x
                    ))
                  }
                />
                <span className="muted">to</span>
                <input
                  type="time"
                  className="input"
                  style={{ width: 120 }}
                  value={h.close_time}
                  disabled={!h.is_open}
                  onChange={(e) =>
                    setHours((arr) => arr.map((x) =>
                      x.weekday === h.weekday ? { ...x, close_time: e.target.value } : x
                    ))
                  }
                />
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="stack">
            <Alert variant="success">Your business is ready.</Alert>
            <p>You can now add services, staff, and locations, then share your public booking link.</p>
            <Button variant="primary" onClick={() => navigate("/dashboard", { replace: true })}>
              Go to dashboard
            </Button>
          </div>
        )}

        {step < 2 && (
          <div className="row-between" style={{ marginTop: 20 }}>
            <Button
              variant="ghost"
              disabled={step === 0 || saving}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Back
            </Button>
            <Button variant="primary" onClick={handleNext} disabled={saving}>
              {saving ? "Savingâ€¦" : step === 1 ? "Create business" : "Next"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}