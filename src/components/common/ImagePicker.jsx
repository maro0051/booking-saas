import { useRef, useState } from "react";
import { Upload, Trash2, Loader2 } from "lucide-react";
import Button from "../ui/Button";
import Alert from "../ui/Alert";

/**
 * ImagePicker
 *   value    — current public URL (or "")
 *   onChange — called with the new URL (after upload) or "" (when removed)
 *   upload   — async (file) => publicUrl  — the caller supplies the uploader
 *   shape    — "circle" | "square"
 *   size     — px
 */
export default function ImagePicker({
  value,
  onChange,
  upload,
  shape = "square",
  size = 96,
  label = "Image",
  hint = "PNG, JPG, or WEBP · max 5 MB",
  initialsFallback = "",
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const url = await upload(file);
      onChange(url);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const radius = shape === "circle" ? 999 : 12;

  return (
    <div>
      <div className="row" style={{ gap: 16, alignItems: "center" }}>
        <div
          style={{
            width: size, height: size, borderRadius: radius,
            background: "var(--bg-sunken)",
            border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", flexShrink: 0,
            position: "relative",
          }}
        >
          {value ? (
            <img
              src={value}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : initialsFallback ? (
            <span style={{
              fontSize: size * 0.34, fontWeight: 600, color: "var(--fg-muted)",
            }}>{initialsFallback}</span>
          ) : (
            <span className="muted text-xs">No image</span>
          )}
          {busy && (
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff",
            }}>
              <Loader2 size={20} className="spin" />
            </div>
          )}
        </div>

        <div className="stack" style={{ gap: 6 }}>
          <div>
            <Button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              <Upload size={14} /> {value ? "Replace" : "Upload"}
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onChange("")}
                disabled={busy}
                style={{ marginLeft: 6 }}
              >
                <Trash2 size={14} /> Remove
              </Button>
            )}
          </div>
          <div className="muted text-xs">{hint}</div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleFile}
        style={{ display: "none" }}
      />

      {error && (
        <div style={{ marginTop: 8 }}>
          <Alert variant="error">{error}</Alert>
        </div>
      )}
    </div>
  );
}