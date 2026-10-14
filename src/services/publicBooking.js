import { supabase } from "../lib/supabaseClient";

export async function getPublicBusiness(slug) {
  const { data, error } = await supabase.rpc("get_public_business", { p_slug: slug });
  if (error) throw error;
  return data;
}

export async function getAvailability({ slug, serviceId, date, staffId, locationId }) {
  const { data, error } = await supabase.rpc("get_availability", {
    p_slug: slug,
    p_service_id: serviceId,
    p_date: date,
    p_staff_id: staffId || null,
    p_location_id: locationId || null,
  });
  if (error) throw error;
  return (data || []).map((row) => row.starts_at);
}

export async function getNextSlotsForService({
  slug, serviceId, daysAhead = 7, maxPerDay = 4,
}) {
  const { data, error } = await supabase.rpc("get_next_slots_for_service", {
    p_slug: slug,
    p_service_id: serviceId,
    p_days_ahead: daysAhead,
    p_max_per_day: maxPerDay,
  });
  if (error) throw error;
  return (data || []).map((row) => ({
    starts_at: row.starts_at,
    day: row.day,
  }));
}

export async function createPublicBooking({
  slug, serviceId, startsAt, fullName, email, phone, staffId, locationId, notes,
}) {
  const { data, error } = await supabase.rpc("create_public_booking", {
    p_slug: slug,
    p_service_id: serviceId,
    p_starts_at: startsAt,
    p_full_name: fullName,
    p_email: email,
    p_phone: phone || null,
    p_staff_id: staffId || null,
    p_location_id: locationId || null,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data;
}

export async function getBookingByReference(slug, reference) {
  const { data, error } = await supabase.rpc("get_booking_by_reference", {
    p_slug: slug, p_reference: reference,
  });
  if (error) throw error;
  return data;
}

export async function cancelBookingByReference(slug, reference, email) {
  const { data, error } = await supabase.rpc("cancel_booking_by_reference", {
    p_slug: slug, p_reference: reference, p_email: email,
  });
  if (error) throw error;
  return data;
}

export async function hasCustomerBookedAt(businessId) {
  const { data, error } = await supabase.rpc("has_customer_booked_at", {
    p_business_id: businessId,
  });
  if (error) throw error;
  return !!data;
}

export async function getAvailabilityAnyStaff({
  slug, serviceId, date, locationId,
}) {
  const { data, error } = await supabase.rpc("get_availability_any_staff", {
    p_slug: slug,
    p_service_id: serviceId,
    p_date: date,
    p_location_id: locationId || null,
  });
  if (error) throw error;
  return (data || []).map((row) => row.starts_at);
}