import { supabase } from "../lib/supabaseClient";

export async function businessAppointmentsRange({
  businessId, from, to, staffId, locationId, serviceId, status,
}) {
  const { data, error } = await supabase.rpc("business_appointments_range", {
    p_business_id: businessId,
    p_from: from,
    p_to: to,
    p_staff_id: staffId || null,
    p_location_id: locationId || null,
    p_service_id: serviceId || null,
    p_status: status || null,
  });
  if (error) throw error;
  return data || [];
}

export async function dashboardSummary(businessId) {
  const { data, error } = await supabase.rpc("business_dashboard_summary", {
    p_business_id: businessId,
  });
  if (error) throw error;
  return data;
}

export async function businessAnalytics({ businessId, from, to }) {
  const { data, error } = await supabase.rpc("business_analytics", {
    p_business_id: businessId,
    p_from: from,
    p_to: to,
  });
  if (error) throw error;
  return data;
}

export async function createBusinessAppointment(payload) {
  const { data, error } = await supabase.rpc("create_business_appointment", {
    p_business_id: payload.businessId,
    p_service_id: payload.serviceId,
    p_starts_at: payload.startsAt,
    p_customer_id: payload.customerId || null,
    p_customer_name: payload.customerName || null,
    p_customer_email: payload.customerEmail || null,
    p_customer_phone: payload.customerPhone || null,
    p_staff_id: payload.staffId || null,
    p_location_id: payload.locationId || null,
    p_notes: payload.notes || null,
    p_internal_notes: payload.internalNotes || null,
  });
  if (error) throw error;
  return data;
}

export async function rescheduleBusinessAppointment({
  appointmentId, newStartsAt, newStaffId,
}) {
  const { data, error } = await supabase.rpc("reschedule_business_appointment", {
    p_appointment_id: appointmentId,
    p_new_starts_at: newStartsAt,
    p_new_staff_id: newStaffId || null,
  });
  if (error) throw error;
  return data;
}

/**
 * Returns chart-ready shapes for the dashboard:
 *   byDay:    [{ label: "Oct 12", bookings, revenue }, ...]
 *   byService:[{ label: "Haircut", bookings, revenue }, ...]
 *   byStatus: [{ label: "confirmed", value }, ...]
 */
export async function dashboardChartData(businessId, days = 30) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);

  const raw = await businessAnalytics({
    businessId,
    from: from.toISOString(),
    to: to.toISOString(),
  });

  const byDay = (raw?.by_day || []).map((d) => ({
    label: new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    bookings: Number(d.bookings) || 0,
    revenue: Math.round((Number(d.revenue_cents) || 0) / 100),
  }));

  const byService = (raw?.by_service || []).slice(0, 6).map((s) => ({
    label: s.service_name,
    bookings: Number(s.bookings) || 0,
    revenue: Math.round((Number(s.revenue_cents) || 0) / 100),
  }));

  const byStatus = (raw?.by_status || []).map((s) => ({
    label: s.status,
    value: Number(s.count) || 0,
  }));

  return { byDay, byService, byStatus, totals: raw?.totals || {} };
}