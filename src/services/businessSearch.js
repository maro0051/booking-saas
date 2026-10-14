import { supabase } from "../lib/supabaseClient";

/**
 * Server-side search across appointments and customers for a business.
 * Returns up to 5 of each, using trigram-ish ILIKE matching.
 */
export async function searchBusiness(businessId, query) {
  const q = (query || "").trim();
  if (!q || q.length < 2) return { appointments: [], customers: [] };
  const like = `%${q}%`;

  const [apptsRes, customersRes] = await Promise.all([
    supabase
      .from("appointments")
      .select(`
        id, reference, status, starts_at,
        customer:customers(full_name, email),
        service:services(name)
      `)
      .eq("business_id", businessId)
      .or(`reference.ilike.${like}`)
      .order("starts_at", { ascending: false })
      .limit(5),
    supabase
      .from("customers")
      .select("id, full_name, email, phone, created_at")
      .eq("business_id", businessId)
      .or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    appointments: apptsRes.data || [],
    customers: customersRes.data || [],
  };
}

/**
 * Latest queued/sent notifications for the business's appointments.
 */
export async function recentNotifications(businessId, limit = 8) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, template, status, recipient_email, appointment_id, payload, created_at, sent_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}