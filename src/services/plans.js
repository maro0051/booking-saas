import { supabase } from "../lib/supabaseClient";

/** Admin-side: read full plan rows (only works if super admin). */
export async function listActivePlans() {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("price_cents", { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * Public: read active plans directly from the table. RLS allows anon read
 * of is_active = true rows. Every call is a fresh row read.
 */
export async function listPublicPlans() {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id, code, name, interval, price_cents, currency, features")
    .eq("is_active", true)
    .order("price_cents", { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * Subscribe to changes on subscription_plans. Each caller gets its own
 * unique channel so multiple mounts don't clash.
 */
export function subscribeToPlans(onChange) {
  const topic = `public-plans-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const channel = supabase
    .channel(topic)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "subscription_plans" },
      () => { try { onChange(); } catch {} }
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}