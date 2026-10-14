import { supabase } from "../lib/supabaseClient";
import { linkCustomerByEmail, getMyBookings } from "./customer";

/**
 * Sign in a customer in the context of a specific business.
 * Uses global Supabase auth, then auto-links any guest bookings by email.
 */
export async function signInCustomerForBusiness(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  try { await linkCustomerByEmail(); } catch { /* non-fatal */ }
}

export async function registerCustomerForBusiness({ email, password, fullName }) {
  const { error } = await supabase.auth.signUp({
    email, password, options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  try { await linkCustomerByEmail(); } catch { /* non-fatal */ }
}

/**
 * Returns the signed-in customer's bookings for a single business.
 */
export async function getMyBookingsForBusiness(businessId) {
  const all = await getMyBookings();
  return all.filter((b) => b.business_id === businessId);
}