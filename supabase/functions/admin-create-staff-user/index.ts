// Supabase Edge Function: admin-create-staff-user
// Called by a business owner to create a staff login.
//
// Steps:
//   1. Verify the caller is an owner of the given business.
//   2. Generate a temp password (or use one supplied).
//   3. Create the auth user via the service role.
//   4. Link staff.user_id + insert business_members row (role='staff').
//   5. Queue a "staff invite" notification with the temp password.
//
// Returns: { user_id, email, temp_password } — the temp password is only
// shown to the caller once.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

function generatePassword(length = 14) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length];
  return out;
}

async function requireOwner(userId: string, businessId: string) {
  const { data, error } = await admin
    .from("business_members")
    .select("role, status")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return false;
  return data.role === "owner" && data.status === "active";
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return new Response("unauthenticated", { status: 401 });

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return new Response("invalid token", { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return new Response("invalid body", { status: 400 });

    const {
      business_id,
      staff_id,
      email,
      full_name,
      temp_password,           // optional: caller may supply one
      send_welcome_email = true,
    } = body;

    if (!business_id || !staff_id || !email) {
      return new Response("missing business_id, staff_id, or email", { status: 400 });
    }

    const isOwner = await requireOwner(userData.user.id, business_id);
    if (!isOwner) return new Response("not authorized", { status: 403 });

    // Confirm the staff row belongs to that business and has no user_id yet
    const { data: staffRow, error: staffErr } = await admin
      .from("staff")
      .select("id, business_id, user_id, display_name")
      .eq("id", staff_id)
      .maybeSingle();
    if (staffErr || !staffRow) return new Response("staff not found", { status: 404 });
    if (staffRow.business_id !== business_id) {
      return new Response("staff not in business", { status: 400 });
    }
    if (staffRow.user_id) {
      return new Response("staff already has a login", { status: 409 });
    }

    const password = temp_password || generatePassword();
    const cleanEmail = String(email).trim().toLowerCase();

    // 1. Create the auth user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || staffRow.display_name || cleanEmail },
    });
    if (createErr || !created?.user) {
      return new Response(`auth error: ${createErr?.message || "unknown"}`, { status: 500 });
    }
    const userId = created.user.id;

    // 2. Link staff.user_id
    const { error: linkErr } = await admin
      .from("staff")
      .update({ user_id: userId })
      .eq("id", staff_id);
    if (linkErr) {
      // Best-effort cleanup: delete the auth user we just created
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      return new Response(`link error: ${linkErr.message}`, { status: 500 });
    }

    // 3. Add a business_members row (role = 'staff')
    const { error: memberErr } = await admin
      .from("business_members")
      .upsert(
        {
          business_id,
          user_id: userId,
          role: "staff",
          status: "active",
          invited_by: userData.user.id,
        },
        { onConflict: "business_id,user_id" },
      );
    if (memberErr) {
      await admin.from("staff").update({ user_id: null }).eq("id", staff_id).catch(() => {});
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      return new Response(`member error: ${memberErr.message}`, { status: 500 });
    }

    // 4. Queue the invite notification (email sending is deferred to Resend phase)
    if (send_welcome_email) {
      const { data: business } = await admin
        .from("businesses")
        .select("name")
        .eq("id", business_id)
        .maybeSingle();

      await admin.from("notifications").insert({
        business_id,
        recipient_email: cleanEmail,
        recipient_user_id: userId,
        channel: "email",
        template: "staff_invite",
        status: "queued",
        payload: {
          business_name: business?.name || null,
          temp_password: password,
          staff_name: staffRow.display_name,
        },
      });
    }

    return new Response(
      JSON.stringify({
        user_id: userId,
        email: cleanEmail,
        temp_password: password,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(`error: ${String(err)}`, { status: 500 });
  }
});