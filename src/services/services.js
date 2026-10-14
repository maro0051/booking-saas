import { supabase } from "../lib/supabaseClient";

export async function listServices(businessId) {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createService(businessId, payload) {
  const { data, error } = await supabase
    .from("services")
    .insert({ ...payload, business_id: businessId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateService(serviceId, patch) {
  const { data, error } = await supabase
    .from("services")
    .update(patch)
    .eq("id", serviceId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteService(serviceId) {
  const { error } = await supabase.from("services").delete().eq("id", serviceId);
  if (error) throw error;
}