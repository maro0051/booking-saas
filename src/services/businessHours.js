import { supabase } from "../lib/supabaseClient";

export async function listBusinessHours(businessId) {
  const { data, error } = await supabase
    .from("business_hours")
    .select("*")
    .eq("business_id", businessId)
    .order("weekday", { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * Replaces the weekly hours for a business.
 * hours: array of { weekday, is_open, open_time, close_time }
 * Days with is_open = false are simply deleted.
 */
export async function replaceBusinessHours(businessId, hours) {
  const { error: delErr } = await supabase
    .from("business_hours")
    .delete()
    .eq("business_id", businessId);
  if (delErr) throw delErr;

  const rows = hours
    .filter((h) => h.is_open && h.open_time && h.close_time)
    .map((h) => ({
      business_id: businessId,
      weekday: h.weekday,
      open_time: h.open_time,
      close_time: h.close_time,
    }));

  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from("business_hours")
    .insert(rows)
    .select();
  if (error) throw error;
  return data;
}

export function defaultWeek() {
  return [
    { weekday: 0, is_open: false, open_time: "09:00", close_time: "17:00" },
    { weekday: 1, is_open: true,  open_time: "09:00", close_time: "17:00" },
    { weekday: 2, is_open: true,  open_time: "09:00", close_time: "17:00" },
    { weekday: 3, is_open: true,  open_time: "09:00", close_time: "17:00" },
    { weekday: 4, is_open: true,  open_time: "09:00", close_time: "17:00" },
    { weekday: 5, is_open: true,  open_time: "09:00", close_time: "17:00" },
    { weekday: 6, is_open: false, open_time: "09:00", close_time: "17:00" },
  ];
}