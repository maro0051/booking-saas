import { X } from "lucide-react";
import { useEffect } from "react";

export default function MobileDrawer({ open, onClose, children, title }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="mobile-drawer-backdrop" onClick={onClose} />
      <aside className="mobile-drawer">
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontWeight: 700 }}>{title || ""}</span>
          <button
            className="btn btn-ghost btn-icon"
            aria-label="Close menu"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: "12px 10px" }}>{children}</div>
      </aside>
    </>
  );
}