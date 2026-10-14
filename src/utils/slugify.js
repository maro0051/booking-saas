export function slugify(input) {
  return (input || "")
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const RESERVED = new Set([
  "admin", "api", "login", "signup", "dashboard", "book",
  "customer", "onboarding", "static", "assets", "app", "www",
]);

export function isReservedSlug(slug) {
  return RESERVED.has(slug);
}