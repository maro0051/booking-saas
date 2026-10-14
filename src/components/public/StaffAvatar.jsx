function initials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function colorFor(name) {
  const palette = [
    "#6366f1", "#10b981", "#f59e0b", "#ef4444",
    "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16",
  ];
  let h = 0;
  const s = String(name || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

export default function StaffAvatar({ name, color, size = 44, imageUrl }) {
  const bg = color || colorFor(name);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name || ""}
        style={{
          width: size, height: size, borderRadius: 999,
          objectFit: "cover",
          border: "2px solid var(--bg-elev)",
          boxShadow: "0 0 0 1px var(--border)",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size, height: size, borderRadius: 999,
        background: bg, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 600, fontSize: Math.max(11, size * 0.36),
        border: "2px solid var(--bg-elev)",
        boxShadow: "0 0 0 1px var(--border)",
        letterSpacing: -0.5,
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}