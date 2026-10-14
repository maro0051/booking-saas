import { supabase } from "../lib/supabaseClient";

export async function listClosures(businessId) {
  const { data, error } = await supabase
    .from("business_closures")
    .select("*")
    .eq("business_id", businessId)
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createClosure(businessId, { starts_at, ends_at, reason }) {
  const { data, error } = await supabase
    .from("business_closures")
    .insert({ business_id: businessId, starts_at, ends_at, reason: reason || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteClosure(id) {
  const { error } = await supabase.from("business_closures").delete().eq("id", id);
  if (error) throw error;
}