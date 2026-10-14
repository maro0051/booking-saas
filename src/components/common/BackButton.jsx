import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Pill-shaped back button. Renders as a link when `to` is provided,
 * otherwise falls back to navigate(-1). Uses ghost styling with
 * a green hover tint from the design system.
 */
export default function BackButton({ to, label = "Back", onClick }) {
  const navigate = useNavigate();

  function handle(e) {
    if (onClick) { e.preventDefault(); onClick(e); return; }
    if (!to) { e.preventDefault(); navigate(-1); }
  }

  const common = {
    type: "button",
    className: "btn btn-ghost",
    onClick: handle,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 14px",
      borderRadius: 999,
      fontWeight: 500,
      fontSize: 13.5,
      border: "1px solid var(--border)",
      background: "var(--bg-elev)",
    },
  };

  if (to && !onClick) {
    return (
      <a href={to} {...common} onClick={(e) => { e.preventDefault(); navigate(to); }}>
        <ArrowLeft size={15} />
        <span>{label}</span>
      </a>
    );
  }

  return (
    <button {...common}>
      <ArrowLeft size={15} />
      <span>{label}</span>
    </button>
  );
}