// Supabase Edge Function: send-email
// Triggered by a Database Webhook on public.notifications (INSERT).
// Renders the appropriate template and sends via Resend, then updates the row.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "onboarding@resend.dev";
const FROM_NAME = Deno.env.get("FROM_NAME") ?? "Booking SaaS";
const APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:5173";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

type Notification = {
  id: string;
  business_id: string | null;
  appointment_id: string | null;
  recipient_email: string | null;
  channel: string;
  template: string;
  payload: Record<string, any>;
};

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtDate(iso: string, tz = "UTC"): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function layout({ title, intro, rows, ctaHref, ctaLabel, footer }): string {
  const rowsHtml = rows
    .filter((r: any) => r.value)
    .map(
      (r: any) => `
      <tr>
        <td style="padding:6px 0;color:#64748b;font-size:13px;">${esc(r.label)}</td>
        <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:500;text-align:right;">${esc(r.value)}</td>
      </tr>`
    )
    .join("");

  const ctaHtml = ctaHref
    ? `<tr><td style="padding-top:22px;" align="center">
        <a href="${esc(ctaHref)}"
           style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;
                  text-decoration:none;border-radius:8px;font-weight:500;font-size:14px;">
          ${esc(ctaLabel ?? "View booking")}
        </a>
      </td></tr>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 12px rgba(15,23,42,.06);">
        <tr><td style="padding:24px 28px 4px;">
          <div style="font-size:11px;letter-spacing:2px;color:#6366f1;font-weight:600;text-transform:uppercase;">${esc(FROM_NAME)}</div>
          <h1 style="margin:6px 0 4px;font-size:20px;color:#0f172a;">${esc(title)}</h1>
          <p style="margin:0 0 8px;color:#475569;font-size:14px;line-height:1.55;">${esc(intro)}</p>
        </td></tr>
        <tr><td style="padding:0 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin-top:12px;">
            ${rowsHtml}
          </table>
        </td></tr>
        <tr><td style="padding:0 28px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${ctaHtml}
          </table>
        </td></tr>
        <tr><td style="padding:22px 28px 26px;">
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.55;">${esc(footer ?? "You received this email because you made a booking.")}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function render(template: string, p: Record<string, any>, tz: string) {
  const when = p.starts_at ? fmtDate(p.starts_at, tz) : "";
  const whenOld = p.old_starts_at ? fmtDate(p.old_starts_at, tz) : "";
  const bookingUrl = p.business_slug && p.reference
    ? `${APP_URL}/book/${p.business_slug}/confirmation/${p.reference}`
    : undefined;

  switch (template) {
    case "booking_confirmed":
      return {
        subject: `Your booking is confirmed - ${p.business_name}`,
        html: layout({
          title: "Booking confirmed",
          intro: `Hi ${p.customer_name ?? "there"}, your appointment is confirmed.`,
          rows: [
            { label: "Business", value: p.business_name },
            { label: "Service", value: p.service_name },
            { label: "When", value: when },
            { label: "Reference", value: p.reference },
          ],
          ctaHref: bookingUrl, ctaLabel: "View or manage booking",
        }),
      };
    case "booking_pending":
      return {
        subject: `Booking received - ${p.business_name}`,
        html: layout({
          title: "Booking received",
          intro: `Hi ${p.customer_name ?? "there"}, we've received your request. It's pending confirmation from the business.`,
          rows: [
            { label: "Business", value: p.business_name },
            { label: "Service", value: p.service_name },
            { label: "When", value: when },
            { label: "Reference", value: p.reference },
          ],
          ctaHref: bookingUrl, ctaLabel: "View booking",
        }),
      };
    case "booking_cancelled":
      return {
        subject: `Booking cancelled - ${p.business_name}`,
        html: layout({
          title: "Booking cancelled",
          intro: `Hi ${p.customer_name ?? "there"}, your booking has been cancelled.`,
          rows: [
            { label: "Business", value: p.business_name },
            { label: "Service", value: p.service_name },
            { label: "When", value: when },
            { label: "Reference", value: p.reference },
          ],
        }),
      };
    case "booking_rescheduled":
      return {
        subject: `Booking rescheduled - ${p.business_name}`,
        html: layout({
          title: "Booking rescheduled",
          intro: `Hi ${p.customer_name ?? "there"}, your booking time has changed.`,
          rows: [
            { label: "Business", value: p.business_name },
            { label: "Service", value: p.service_name },
            { label: "Previous time", value: whenOld },
            { label: "New time", value: when },
            { label: "Reference", value: p.reference },
          ],
          ctaHref: bookingUrl, ctaLabel: "View booking",
        }),
      };
    case "booking_completed":
      return {
        subject: `Thanks for visiting - ${p.business_name}`,
        html: layout({
          title: "Thanks for your visit",
          intro: `Hi ${p.customer_name ?? "there"}, your appointment is marked as complete. We'd love to see you again.`,
          rows: [
            { label: "Business", value: p.business_name },
            { label: "Service", value: p.service_name },
            { label: "When", value: when },
          ],
          ctaHref: p.business_slug ? `${APP_URL}/book/${p.business_slug}` : undefined,
          ctaLabel: "Book again",
        }),
      };
    case "booking_no_show":
      return {
        subject: `Missed appointment - ${p.business_name}`,
        html: layout({
          title: "You missed your appointment",
          intro: `Hi ${p.customer_name ?? "there"}, our records show you didn't make it. Please contact the business if this was a mistake.`,
          rows: [
            { label: "Business", value: p.business_name },
            { label: "Service", value: p.service_name },
            { label: "When", value: when },
          ],
        }),
      };
    case "booking_declined":
      return {
        subject: `Booking declined - ${p.business_name}`,
        html: layout({
          title: "Booking declined",
          intro: `Hi ${p.customer_name ?? "there"}, unfortunately the business couldn't accept your requested time.`,
          rows: [
            { label: "Business", value: p.business_name },
            { label: "Service", value: p.service_name },
            { label: "When", value: when },
          ],
          ctaHref: p.business_slug ? `${APP_URL}/book/${p.business_slug}` : undefined,
          ctaLabel: "Try another time",
        }),
      };
    case "business_new_booking":
      return {
        subject: `New booking - ${p.customer_name ?? "customer"}`,
        html: layout({
          title: "New booking received",
          intro: `A new appointment has been booked at ${p.business_name ?? "your business"}.`,
          rows: [
            { label: "Customer", value: p.customer_name },
            { label: "Email", value: p.customer_email },
            { label: "Phone", value: p.customer_phone },
            { label: "Service", value: p.service_name },
            { label: "When", value: when },
            { label: "Reference", value: p.reference },
            { label: "Status", value: p.status },
          ],
          ctaHref: p.business_slug ? `${APP_URL}/dashboard/appointments` : undefined,
          ctaLabel: "Open dashboard",
        }),
      };
    case "business_booking_cancelled":
      return {
        subject: `Booking cancelled - ${p.customer_name ?? "customer"}`,
        html: layout({
          title: "Booking cancelled",
          intro: `${p.customer_name ?? "A customer"} cancelled their appointment at ${p.business_name ?? "your business"}.`,
          rows: [
            { label: "Customer", value: p.customer_name },
            { label: "Service", value: p.service_name },
            { label: "When", value: when },
            { label: "Reference", value: p.reference },
            { label: "Reason", value: p.cancelled_reason },
          ],
          ctaHref: `${APP_URL}/dashboard/appointments`,
          ctaLabel: "Open dashboard",
        }),
      };
    case "business_booking_rescheduled":
      return {
        subject: `Booking rescheduled - ${p.customer_name ?? "customer"}`,
        html: layout({
          title: "Booking rescheduled",
          intro: `${p.customer_name ?? "A customer"} moved their appointment at ${p.business_name ?? "your business"}.`,
          rows: [
            { label: "Customer", value: p.customer_name },
            { label: "Service", value: p.service_name },
            { label: "Previous time", value: whenOld },
            { label: "New time", value: when },
            { label: "Reference", value: p.reference },
          ],
          ctaHref: `${APP_URL}/dashboard/appointments`,
          ctaLabel: "Open dashboard",
        }),
      };
    case "business_time_off_request":
      return {
        subject: `Time-off request - ${p.staff_name ?? "staff"}`,
        html: layout({
          title: "Time-off request",
          intro: `${p.staff_name ?? "A staff member"} at ${p.business_name ?? "your business"} has requested time off.`,
          rows: [
            { label: "Staff", value: p.staff_name },
            { label: "From", value: when },
            { label: "To", value: p.ends_at ? fmtDate(p.ends_at, tz) : "" },
            { label: "Reason", value: p.reason },
          ],
          ctaHref: `${APP_URL}/dashboard/staff`,
          ctaLabel: "Review request",
        }),
      };
    case "admin_new_business":
      return {
        subject: `New business on the platform - ${p.business_name ?? "unknown"}`,
        html: layout({
          title: "New business signed up",
          intro: `A new business just joined the platform.`,
          rows: [
            { label: "Name", value: p.business_name },
            { label: "Slug", value: p.business_slug },
            { label: "Contact email", value: p.contact_email },
            { label: "Timezone", value: p.timezone },
          ],
          ctaHref: `${APP_URL}/admin/businesses`,
          ctaLabel: "Open admin",
        }),
      };
    case "admin_support_request":
      return {
        subject: `Support request - ${p.subject ?? ""}`,
        html: layout({
          title: "New support request",
          intro: `A support request was submitted.`,
          rows: [
            { label: "Subject", value: p.subject },
            { label: "Priority", value: p.priority },
            { label: "Business", value: p.business_name },
            { label: "From", value: p.user_email },
            { label: "Message", value: p.body },
          ],
          ctaHref: `${APP_URL}/admin/support`,
          ctaLabel: "Open admin",
        }),
      };
    case "staff_invite":
      return {
        subject: `You've been invited to ${p.business_name ?? "a business"}`,
        html: layout({
          title: "You've been invited",
          intro: `Your manager at ${p.business_name ?? "the business"} created a staff account for you. Sign in with the email we sent to and the temporary password below.`,
          rows: [
            { label: "Business", value: p.business_name },
            { label: "Your name", value: p.staff_name },
            { label: "Temporary password", value: p.temp_password },
          ],
          ctaHref: APP_URL + "/staff/login",
          ctaLabel: "Sign in as staff",
          footer: "Please change your password after signing in.",
        }),
      };
    default:
      return {
        subject: `Update from ${p.business_name ?? FROM_NAME}`,
        html: layout({
          title: "Booking update",
          intro: "There's an update about your booking.",
          rows: [],
        }),
      };
  }
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();

    // Supabase Database Webhook payload: { type, table, record, old_record }
    const row: Notification | undefined = body?.record;
    if (!row) return new Response("no record", { status: 400 });

    if (row.channel !== "email" || !row.recipient_email) {
      return new Response("skip", { status: 200 });
    }

    // Defensive: payload must be an object
    if (!row.payload || typeof row.payload !== "object") {
      row.payload = {};
    }

    // Resolve timezone from the business
    let tz = "UTC";
    if (row.business_id) {
      const { data } = await admin
        .from("businesses")
        .select("timezone, name")
        .eq("id", row.business_id)
        .maybeSingle();
      if (data?.timezone) tz = data.timezone;
      if (data?.name && !row.payload.business_name) row.payload.business_name = data.name;
    }

    const { subject, html } = render(row.template, row.payload ?? {}, tz);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [row.recipient_email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      await admin
        .from("notifications")
        .update({ status: "failed", error: text.slice(0, 500) })
        .eq("id", row.id);
      return new Response(`resend error: ${text}`, { status: 500 });
    }

    await admin
      .from("notifications")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", row.id);

    return new Response("ok", { status: 200 });
  } catch (err) {
    return new Response(`error: ${String(err)}`, { status: 500 });
  }
});