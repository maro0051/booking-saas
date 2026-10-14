import { supabase } from "../lib/supabaseClient";

export async function linkCustomerByEmail() {
  const { data, error } = await supabase.rpc("link_customer_by_email");
  if (error) throw error;
  return data;
}

export async function getMyBookings() {
  const { data, error } = await supabase.rpc("get_my_bookings");
  if (error) throw error;
  return data || [];
}

export async function rescheduleByReference({
  slug, reference, email, newStartsAt, newStaffId, newLocationId,
}) {
  const { data, error } = await supabase.rpc("reschedule_booking_by_reference", {
    p_slug: slug,
    p_reference: reference,
    p_email: email,
    p_new_starts_at: newStartsAt,
    p_new_staff_id: newStaffId || null,
    p_new_location_id: newLocationId || null,
  });
  if (error) throw error;
  return data;
}

export async function cancelByReference(slug, reference, email) {
  const { data, error } = await supabase.rpc("cancel_booking_by_reference", {
    p_slug: slug, p_reference: reference, p_email: email,
  });
  if (error) throw error;
  return data;
}