import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import Button from "../ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { useI18n } from "../../i18n/I18nContext";
import {
  SESSION_TIMEOUTS,
  WARNING_WINDOW_SECONDS,
  ACTIVITY_KEY,
  LOGOUT_KEY,
  BROADCAST_CHANNEL,
} from "../../lib/session";

/**
 * SessionTimer — signs the user out after a period of inactivity.
 *
 * kind: "business" | "staff" | "admin"
 *
 * Cross-tab behavior: uses localStorage + BroadcastChannel so activity
 * in any tab keeps every other tab alive, and a sign-out in one tab
 * signs out the rest.
 */
export default function SessionTimer({ kind = "business" }) {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const timeoutSeconds = SESSION_TIMEOUTS[kind] ?? SESSION_TIMEOUTS.business;

  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(timeoutSeconds);

  const channelRef = useRef(null);
  const lastWriteRef = useRef(0);

  const loginPath =
    kind === "admin" ? "/admin/login"
    : kind === "staff" ? "/staff/login"
    : "/login";

  // Read the shared "last activity" timestamp, or initialize it.
  const readActivity = useCallback(() => {
    try {
      const raw = localStorage.getItem(ACTIVITY_KEY);
      const v = raw ? Number(raw) : 0;
      return Number.isFinite(v) && v > 0 ? v : Date.now();
    } catch {
      return Date.now();
    }
  }, []);

  const writeActivity = useCallback((force = false) => {
    const now = Date.now();
    // Throttle writes to once per 5 seconds unless forced.
    if (!force && now - lastWriteRef.current < 5000) return;
    lastWriteRef.current = now;
    try { localStorage.setItem(ACTIVITY_KEY, String(now)); } catch {}
    channelRef.current?.postMessage({ type: "activity", at: now });
  }, []);

  const performSignOut = useCallback(async (reason) => {
    try { localStorage.setItem(LOGOUT_KEY, String(Date.now())); } catch {}
    channelRef.current?.postMessage({ type: "logout", reason });
    await signOut();
    setShowWarning(false);
    navigate(loginPath, { replace: true, state: { signedOut: reason || "inactivity" } });
  }, [signOut, navigate, loginPath]);

  // Set up broadcast channel for cross-tab coordination.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(BROADCAST_CHANNEL);
    channelRef.current = ch;

    function onMessage(e) {
      const msg = e?.data;
      if (!msg) return;
      if (msg.type === "activity" && typeof msg.at === "number") {
        // Another tab is alive; refresh our local view.
        lastWriteRef.current = msg.at;
      }
      if (msg.type === "logout") {
        // Another tab signed out; do the same without notifying others again.
        setShowWarning(false);
        signOut().then(() => navigate(loginPath, { replace: true }));
      }
    }

    ch.addEventListener("message", onMessage);
    return () => {
      ch.removeEventListener("message", onMessage);
      ch.close();
      channelRef.current = null;
    };
  }, [signOut, navigate, loginPath]);

  // Attach activity listeners.
  useEffect(() => {
    if (!user) return;
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const onAny = () => writeActivity(false);
    for (const ev of events) window.addEventListener(ev, onAny, { passive: true });
    return () => {
      for (const ev of events) window.removeEventListener(ev, onAny);
    };
  }, [user, writeActivity]);

  // Initialize activity on mount and on sign-in.
  useEffect(() => {
    if (user) writeActivity(true);
  }, [user, writeActivity]);

  // Tick loop: compute secondsLeft and toggle warning.
  useEffect(() => {
    if (!user) { setShowWarning(false); return; }

    let cancelled = false;

    function tick() {
      if (cancelled) return;
      const last = readActivity();
      const elapsed = (Date.now() - last) / 1000;
      const left = Math.max(0, timeoutSeconds - elapsed);

      setSecondsLeft(left);
      setShowWarning(left <= WARNING_WINDOW_SECONDS && left > 0);

      if (left <= 0) {
        performSignOut("inactivity");
        return;
      }
    }

    tick();
    const interval = setInterval(tick, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, timeoutSeconds, readActivity, performSignOut]);

  if (!user || !showWarning) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel" style={{ maxWidth: 420 }}>
        <div className="card">
          <div className="row" style={{ gap: 10, marginBottom: 12 }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: "var(--warning-bg, #fef3c7)",
                color: "#92400e",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <LogOut size={18} />
            </div>
            <h2 style={{ margin: 0 }}>{t("security.sessionTitle")}</h2>
          </div>

          <p className="muted" style={{ marginTop: 0 }}>
            {t("security.sessionBody", { seconds: Math.max(0, Math.ceil(secondsLeft)) })}
          </p>

          <div className="row-between" style={{ marginTop: 8 }}>
            <span className="muted text-sm">
              {Math.max(0, Math.ceil(secondsLeft))}s
            </span>
            <div className="row" style={{ gap: 8 }}>
              <Button variant="ghost" onClick={() => performSignOut("manual")}>
                {t("common.signOut")}
              </Button>
              <Button
                variant="primary"
                onClick={() => { writeActivity(true); setShowWarning(false); }}
              >
                {t("security.staySignedIn")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}