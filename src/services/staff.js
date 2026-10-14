import { supabase } from "../lib/supabaseClient";

export async function listStaff(businessId) {
  const { data, error } = await supabase
    .from("staff")
    .select("*, staff_services(service_id), staff_locations(location_id)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((s) => ({
    ...s,
    service_ids: (s.staff_services || []).map((x) => x.service_id),
    location_ids: (s.staff_locations || []).map((x) => x.location_id),
  }));
}

export async function createStaff(businessId, payload) {
  const { service_ids = [], location_ids = [], ...rest } = payload;
  const { data: staff, error } = await supabase
    .from("staff")
    .insert({ ...rest, business_id: businessId })
    .select()
    .single();
  if (error) throw error;

  if (service_ids.length) {
    const { error: ssErr } = await supabase
      .from("staff_services")
      .insert(service_ids.map((sid) => ({ staff_id: staff.id, service_id: sid })));
    if (ssErr) throw ssErr;
  }
  if (location_ids.length) {
    const { error: slErr } = await supabase
      .from("staff_locations")
      .insert(location_ids.map((lid) => ({ staff_id: staff.id, location_id: lid })));
    if (slErr) throw slErr;
  }
  return staff;
}

export async function updateStaff(staffId, payload) {
  const { service_ids = [], location_ids = [], ...rest } = payload;

  const { data: staff, error } = await supabase
    .from("staff")
    .update(rest)
    .eq("id", staffId)
    .select()
    .single();
  if (error) throw error;

  const { error: dssErr } = await supabase
    .from("staff_services").delete().eq("staff_id", staffId);
  if (dssErr) throw dssErr;

  const { error: dslErr } = await supabase
    .from("staff_locations").delete().eq("staff_id", staffId);
  if (dslErr) throw dslErr;

  if (service_ids.length) {
    const { error: iErr } = await supabase
      .from("staff_services")
      .insert(service_ids.map((sid) => ({ staff_id: staffId, service_id: sid })));
    if (iErr) throw iErr;
  }
  if (location_ids.length) {
    const { error: iErr } = await supabase
      .from("staff_locations")
      .insert(location_ids.map((lid) => ({ staff_id: staffId, location_id: lid })));
    if (iErr) throw iErr;
  }
  return staff;
}

export async function deleteStaff(staffId) {
  const { error } = await supabase.from("staff").delete().eq("id", staffId);
  if (error) throw error;
}

export async function listStaffTimeOff(staffId) {
  const { data, error } = await supabase
    .from("staff_time_off")
    .select("*")
    .eq("staff_id", staffId)
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createStaffTimeOff(staffId, { starts_at, ends_at, reason }) {
  const { data, error } = await supabase
    .from("staff_time_off")
    .insert({ staff_id: staffId, starts_at, ends_at, reason: reason || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStaffTimeOff(id) {
  const { error } = await supabase.from("staff_time_off").delete().eq("id", id);
  if (error) throw error;
}