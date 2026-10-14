function pad(n) { return String(n).padStart(2, "0"); }

function toIcsDate(iso) {
  const d = new Date(iso);
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) + "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) + "Z"
  );
}

function esc(s) {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Builds a single-event .ics file content string.
 * booking: { reference, starts_at, ends_at, service_name, business_name,
 *            business_timezone, location_name, location_address }
 */
export function buildBookingIcs(booking) {
  const uid = `${booking.reference}@booking-saas`;
  const now = toIcsDate(new Date().toISOString());
  const summary = `${booking.service_name} at ${booking.business_name}`;
  const description =
    `Reference: ${booking.reference}\n` +
    `Service: ${booking.service_name}\n` +
    `Business: ${booking.business_name}` +
    (booking.location_name ? `\nLocation: ${booking.location_name}` : "");
  const location = [booking.location_name, booking.location_address]
    .filter(Boolean).join(", ");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Booking SaaS//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${toIcsDate(booking.starts_at)}`,
    `DTEND:${toIcsDate(booking.ends_at)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    location ? `LOCATION:${esc(location)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}

/**
 * Triggers a download of the .ics file for a booking.
 */
export function downloadBookingIcs(booking) {
  const ics = buildBookingIcs(booking);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `booking-${booking.reference}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Google Maps directions URL.
 */
export function directionsUrl(address) {
  if (!address) return null;
  const parts = [
    address.line1, address.line2,
    address.city, address.region, address.postal_code, address.country,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(parts.join(", "))}`;
}