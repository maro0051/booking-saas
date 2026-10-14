import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Returns the list of businesses the current user belongs to.
 */
export function useBusinessMembership(userId) {
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) { setMemberships([]); setLoading(false); return; }
    let mounted = true;
    setLoading(true);
    supabase
      .from("business_members")
      .select("id, business_id, role, status, businesses(id, slug, name, status)")
      .eq("user_id", userId)
      .eq("status", "active")
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) setError(error.message);
        else setMemberships(data || []);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [userId]);

  return { memberships, loading, error };
}
