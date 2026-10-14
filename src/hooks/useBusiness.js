import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./useAuth";

/**
 * Resolves the current business for the signed-in user.
 * If the user belongs to multiple businesses, uses the first one;
 * Phase 6+ will add a business switcher.
 */
export function useBusiness() {
  const { user, loading: authLoading } = useAuth();
  const [business, setBusiness] = useState(null);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!user) { setBusiness(null); setMembership(null); setLoading(false); return; }
    setLoading(true);
    setError(null);

    const { data, error: mErr } = await supabase
      .from("business_members")
      .select("id, role, status, business_id, businesses(id, slug, name, status, timezone, currency, locale, onboarding_completed)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (mErr) { setError(mErr.message); setBusiness(null); setMembership(null); }
    else if (data) { setBusiness(data.businesses); setMembership(data); }
    else { setBusiness(null); setMembership(null); }

    setLoading(false);
  }, [user]);

  useEffect(() => { if (!authLoading) refresh(); }, [authLoading, refresh]);

  const isOwner = membership?.role === "owner";

  return { business, membership, isOwner, loading, error, refresh };
}