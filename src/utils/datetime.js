import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export function formatInTz(date, tz, fmt = "EEE, MMM d, yyyy h:mm a") {
  return formatInTimeZone(new Date(date), tz, fmt);
}

export function todayInTz(tz) {
  return formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
}

export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function weekdayLabel(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

/**
 * Converts a "YYYY-MM-DD" + "HH:mm" in a business timezone to an ISO string.
 */
export function zonedDateTimeToIso(dateStr, timeStr, tz) {
  return fromZonedTime(`${dateStr}T${timeStr}:00`, tz).toISOString();
}