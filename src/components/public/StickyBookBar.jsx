import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus } from "lucide-react";

export default function StickyBookBar({
  businessSlug, businessName, ctaLabel, to, enabled = true,
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    function onScroll() { setVisible(window.scrollY > 240); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40,
      padding: 12,
      background: "color-mix(in srgb, var(--bg-elev) 92%, transparent)",
      borderTop: "1px solid var(--border)",
      backdropFilter: "blur(10px)",
      transform: visible ? "translateY(0)" : "translateY(120%)",
      transition: "transform 220ms cubic-bezier(.2,.7,.3,1)",
      pointerEvents: visible ? "auto" : "none",
    }}>
      <div style={{
        maxWidth: 960, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12,
      }}>
        <div className="truncate">
          <div className="text-xs muted">{businessName}</div>
        </div>
        <Link to={to || `/book/${businessSlug}`}>
          <button className="btn btn-primary btn-lg">
            <CalendarPlus size={16} /> {ctaLabel}
          </button>
        </Link>
      </div>
    </div>
  );
}