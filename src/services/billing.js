import { supabase } from "../lib/supabaseClient";

export async function billingSummary(businessId) {
  const { data, error } = await supabase.rpc("business_billing_summary", {
    p_business_id: businessId,
  });
  if (error) throw error;
  return data;
}

/**
 * Switches the business to a new plan. If the new plan has lower limits,
 * the excess staff/services/locations are deactivated automatically.
 * Returns: { plan_id, plan_code, plan_name, disabled_count, disabled }.
 */
export async function switchPlan(businessId, planId) {
  const { data, error } = await supabase.rpc("switch_business_plan", {
    p_business_id: businessId,
    p_plan_id: planId,
  });
  if (error) throw error;
  return data;
}

// Kept for backwards compatibility (unused now, but no harm)
export async function setBusinessPlan(businessId, planId) {
  return switchPlan(businessId, planId);
}