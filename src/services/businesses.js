import { supabase } from "../lib/supabaseClient";

export async function checkSlugAvailable(slug) {
  const { data, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return !data;
}

/**
 * Creates a business + owner membership atomically via a security-definer
 * RPC. The RPC performs its own validation and writes an audit log entry.
 */
export async function createBusinessWithOwner({ payload }) {
  const { data, error } = await supabase.rpc("create_business_with_owner", {
    p_slug: payload.slug,
    p_name: payload.name,
    p_description: payload.description || null,
    p_contact_email: payload.contact_email || null,
    p_contact_phone: payload.contact_phone || null,
    p_timezone: payload.timezone,
    p_currency: payload.currency,
    p_locale: payload.locale,
  });
  if (error) throw error;
  return data;
}

export async function getBusinessById(businessId) {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateBusiness(businessId, patch) {
  const { data, error } = await supabase
    .from("businesses")
    .update(patch)
    .eq("id", businessId)
    .select()
    .single();
  if (error) throw error;
  return data;
}