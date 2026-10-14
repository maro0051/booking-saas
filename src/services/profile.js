import { supabase } from "../lib/supabaseClient";

export async function getMyProfile() {
  const { data, error } = await supabase.rpc("get_my_profile");
  if (error) throw error;
  return data;
}

export async function updateMyProfile({ fullName, phone, locale }) {
  const { data, error } = await supabase.rpc("update_my_profile", {
    p_full_name: fullName || null,
    p_phone: phone || null,
    p_preferred_locale: locale || null,
  });
  if (error) throw error;
  return data;
}

/**
 * Ask Supabase to send a "change my email" confirmation. The change only
 * takes effect after the user clicks the link in the new inbox.
 */
export async function requestEmailChange(newEmail) {
  const { data, error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw error;
  return data;
}

export async function updateMyPassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}