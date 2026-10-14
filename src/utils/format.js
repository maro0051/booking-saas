export function formatMoney(cents, currency = "CAD", locale = "en-CA") {
  if (cents == null) return "—";
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${(amount).toFixed(2)} ${currency}`;
  }
}

export function formatMinutes(mins) {
  if (!mins && mins !== 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}