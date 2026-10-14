import { supabase } from "../lib/supabaseClient";

/**
 * Calls the admin-create-staff-user Edge Function.
 * Requires the caller to be a business owner.
 * Returns { user_id, email, temp_password }.
 */
export async function inviteStaff({ businessId, staffId, email, fullName }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-staff-user`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      business_id: businessId,
      staff_id: staffId,
      email,
      full_name: fullName,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Invite failed (${res.status})`);
  }
  return res.json();
}

export async function listTimeOffRequests(businessId, status = null) {
  const { data, error } = await supabase.rpc("business_list_time_off_requests", {
    p_business_id: businessId,
    p_status: status,
  });
  if (error) throw error;
  return data || [];
}

export async function reviewTimeOff(requestId, decision, notes = null) {
  const { data, error } = await supabase.rpc("business_review_time_off", {
    p_request_id: requestId,
    p_decision: decision,
    p_notes: notes,
  });
  if (error) throw error;
  return data;
}