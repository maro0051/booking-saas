import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export function isoDate(d) { return d.toISOString().slice(0, 10); }

export function dayRange(date) {
  const start = new Date(date); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  return { start, end };
}

export function weekRange(date, weekStartsOn = 1) {
  const start = startOfWeek(date, { weekStartsOn });
  const end = endOfWeek(date, { weekStartsOn });
  end.setDate(end.getDate() + 1); end.setHours(0,0,0,0);
  return { start, end };
}

export function monthRange(date) {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  end.setDate(end.getDate() + 1); end.setHours(0,0,0,0);
  return { start, end };
}

export function addDaysTo(date, n) { return addDays(date, n); }