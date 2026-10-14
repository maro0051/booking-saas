import { supabase } from "../lib/supabaseClient";

/**
 * Returns { authenticated, is_admin, is_business_member, is_customer }
 * for the currently signed-in user, computed server-side.
 */
export async function getMyRoles() {
  const { data, error } = await supabase.rpc("my_roles");
  if (error) throw error;
  return data ?? {
    authenticated: false,
    is_admin: false,
    is_business_member: false,
    is_customer: false,
  };
}

/** Where should this user land by default? */
export function primaryHome(roles) {
  if (roles?.is_admin) return "/admin";
  if (roles?.is_business_member) return "/dashboard";
  if (roles?.is_customer) return "/customer/dashboard";
  return "/";
}