import { supabase } from "../lib/supabaseClient";

export async function platformStats() {
  const { data, error } = await supabase.rpc("admin_platform_stats");
  if (error) throw error;
  return data;
}

export async function dashboardAnalytics() {
  const { data, error } = await supabase.rpc("admin_dashboard_analytics");
  if (error) throw error;
  return data;
}

export async function listBusinesses({ search, status, limit = 25, offset = 0 } = {}) {
  const { data, error } = await supabase.rpc("admin_list_businesses", {
    p_search: search || null,
    p_status: status || null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return data || [];
}

export async function getBusiness(id) {
  const { data, error } = await supabase.rpc("admin_get_business", { p_business_id: id });
  if (error) throw error;
  return data;
}

export async function setBusinessStatus(id, status) {
  const { data, error } = await supabase.rpc("admin_set_business_status", {
    p_business_id: id, p_status: status,
  });
  if (error) throw error;
  return data;
}

export async function listPlans() {
  const { data, error } = await supabase.rpc("admin_list_plans");
  if (error) throw error;
  return data || [];
}

export async function upsertPlan(plan) {
  const { data, error } = await supabase.rpc("admin_upsert_plan", { p_plan: plan });
  if (error) throw error;
  return data;
}

export async function listSupport({ status, limit = 25, offset = 0 } = {}) {
  const { data, error } = await supabase.rpc("admin_list_support", {
    p_status: status || null, p_limit: limit, p_offset: offset,
  });
  if (error) throw error;
  return data || [];
}

export async function updateSupport(id, status, priority = null) {
  const { data, error } = await supabase.rpc("admin_update_support", {
    p_id: id, p_status: status, p_priority: priority,
  });
  if (error) throw error;
  return data;
}

export async function listAuditLogs({ action, limit = 50, offset = 0 } = {}) {
  const { data, error } = await supabase.rpc("admin_list_audit_logs", {
    p_action: action || null, p_limit: limit, p_offset: offset,
  });
  if (error) throw error;
  return data || [];
}

export async function listAdmins() {
  const { data, error } = await supabase.rpc("admin_list_admins");
  if (error) throw error;
  return data || [];
}