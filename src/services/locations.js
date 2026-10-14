import { supabase } from "../lib/supabaseClient";

export async function listLocations(businessId) {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createLocation(businessId, payload) {
  const { name, phone, is_active, ...rest } = payload;
  const address = {
    line1: rest.address_line1 || null,
    line2: rest.address_line2 || null,
    city: rest.city || null,
    region: rest.region || null,
    postal_code: rest.postal_code || null,
    country: rest.country || null,
  };
  const { data, error } = await supabase
    .from("locations")
    .insert({ business_id: businessId, name, phone: phone || null, address, is_active })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLocation(locationId, payload) {
  const { name, phone, is_active, ...rest } = payload;
  const address = {
    line1: rest.address_line1 || null,
    line2: rest.address_line2 || null,
    city: rest.city || null,
    region: rest.region || null,
    postal_code: rest.postal_code || null,
    country: rest.country || null,
  };
  const { data, error } = await supabase
    .from("locations")
    .update({ name, phone: phone || null, address, is_active })
    .eq("id", locationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLocation(locationId) {
  const { error } = await supabase.from("locations").delete().eq("id", locationId);
  if (error) throw error;
}