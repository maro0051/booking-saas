import { supabase } from "../lib/supabaseClient";

/** Signed-in staff member's own row (id, business_id, business_name, timezone). */
export async function myStaffRow() {
  const { data, error } = await supabase.rpc("my_staff_row");
  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : data;
}

/** Bookings assigned to the signed-in staff member in a date range. */
export async function myBookings(fromIso, toIso) {
  const { data, error } = await supabase.rpc("staff_my_bookings", {
    p_from: fromIso,
    p_to: toIso,
  });
  if (error) throw error;
  return data || [];
}

/** My working hours. */
export async function myHours() {
  const { data, error } = await supabase.rpc("staff_my_hours");
  if (error) throw error;
  return data || [];
}

/** Business opening hours (used for validation). */
export async function businessHours() {
  const { data, error } = await supabase.rpc("staff_business_hours");
  if (error) throw error;
  return data || [];
}

/** Replace my hours with the given set. */
export async function replaceMyHours(hours) {
  const { data, error } = await supabase.rpc("staff_replace_my_hours", {
    p_hours: hours,
  });
  if (error) throw error;
  return data;
}

/** My time-off requests. */
export async function myTimeOffRequests() {
  const { data, error } = await supabase.rpc("staff_my_time_off_requests");
  if (error) throw error;
  return data || [];
}

/** Create a new time-off request. */
export async function requestTimeOff({ startsAt, endsAt, reason }) {
  const { data, error } = await supabase.rpc("staff_request_time_off", {
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_reason: reason || null,
  });
  if (error) throw error;
  return data;
}

/** Cancel my pending time-off request. */
export async function cancelTimeOff(id) {
  const { error } = await supabase.rpc("staff_cancel_time_off", { p_id: id });
  if (error) throw error;
}