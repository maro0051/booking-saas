import { supabase } from "../lib/supabaseClient";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

function pickExt(file) {
  const byMime = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/svg+xml": "svg",
  };
  return byMime[file.type] || (file.name.split(".").pop() || "bin").toLowerCase();
}

/**
 * Uploads a business logo to storage and returns the public URL.
 * Path: business-logos/<businessId>/<timestamp>-<rand>.<ext>
 */
export async function uploadBusinessLogo(businessId, file) {
  if (!file) throw new Error("No file selected");
  if (file.size > MAX_BYTES) throw new Error("Image must be under 5 MB");
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Only PNG, JPG, WEBP, or SVG are allowed");
  }
  const ext = pickExt(file);
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${businessId}/${key}`;

  const { error: upErr } = await supabase.storage
    .from("business-logos")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (upErr) throw upErr;

  const { data } = supabase.storage.from("business-logos").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Uploads a staff photo to storage and returns the public URL.
 * Path: staff-photos/<businessId>/<staffId>/<timestamp>-<rand>.<ext>
 */
export async function uploadStaffPhoto(businessId, staffId, file) {
  if (!file) throw new Error("No file selected");
  if (file.size > MAX_BYTES) throw new Error("Image must be under 5 MB");
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Only PNG, JPG, or WEBP are allowed for staff photos");
  }
  const ext = pickExt(file);
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${businessId}/${staffId}/${key}`;

  const { error: upErr } = await supabase.storage
    .from("staff-photos")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (upErr) throw upErr;

  const { data } = supabase.storage.from("staff-photos").getPublicUrl(path);
  return data.publicUrl;
}