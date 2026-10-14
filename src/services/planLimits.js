import { supabase } from "../lib/supabaseClient";

/**
 * Returns the current plan + usage + can_add booleans.
 * Shape mirrors the business_plan_limits RPC.
 */
export async function getPlanLimits(businessId) {
  const { data, error } = await supabase.rpc("business_plan_limits", {
    p_business_id: businessId,
  });
  if (error) throw error;
  return data;
}

/**
 * Extracts a friendly error message from a Postgres error, mapping the plan
 * limit violation (errcode 23514) to a user-friendly string.
 */
export function friendlyLimitError(err, t) {
  if (!err) return "";
  const code = err.code || "";
  const msg = err.message || "";
  if (code === "23514" || /plan limit/i.test(msg)) {
    return t
      ? t("limits.upgradePrompt")
      : "You've reached your plan limit. Upgrade to add more.";
  }
  return msg;
}