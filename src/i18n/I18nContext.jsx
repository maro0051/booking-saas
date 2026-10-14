import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabaseClient";
import { STRINGS, pickString } from "./strings";

const KEY = "booking-saas-locale";

const I18nContext = createContext(null);

/** English is the default; only a prior explicit choice overrides it. */
function detectLocale() {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "en" || stored === "fr") return stored;
  } catch {}
  return "en";
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => detectLocale());
  const [ready, setReady] = useState(false);

  // Persist to localStorage + document lang
  useEffect(() => {
    try { localStorage.setItem(KEY, locale); } catch {}
    document.documentElement.setAttribute("lang", locale);
  }, [locale]);

  // Sync from profile on sign-in (only if the user hasn't picked locally).
  useEffect(() => {
    let mounted = true;

    async function adoptProfileLocale(user) {
      if (!user) { setReady(true); return; }
      // If the user has an explicit local choice, keep it — otherwise adopt
      // the profile's locale.
      let stored = null;
      try { stored = localStorage.getItem(KEY); } catch {}
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("preferred_locale")
          .eq("id", user.id)
          .maybeSingle();
        if (!mounted) return;
        if (error) { setReady(true); return; }
        if (!stored && data?.preferred_locale) {
          setLocaleState(data.preferred_locale === "fr" ? "fr" : "en");
        }
      } catch { /* ignore */ }
      if (mounted) setReady(true);
    }

    supabase.auth.getSession().then(({ data }) => {
      adoptProfileLocale(data?.session?.user || null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      adoptProfileLocale(session?.user || null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const setLocale = useCallback(async (next) => {
    const value = next === "fr" ? "fr" : "en";
    setLocaleState(value);

    // Best-effort: mirror to profile if signed in.
    try {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;
      if (user) {
        await supabase.rpc("set_my_locale", { p_locale: value });
      }
    } catch { /* ignore */ }
  }, []);

  const t = useCallback(
    (key, vars) => {
      const dict = STRINGS[locale] || STRINGS.en;
      let s = pickString(dict, key);
      if (s === null) s = pickString(STRINGS.en, key);
      if (s === null) return key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return s;
    },
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, ready, available: ["en", "fr"] }),
    [locale, setLocale, t, ready]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}