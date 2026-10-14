export default function Button({
  children,
  variant = "default",
  size = "md",
  type = "button",
  disabled,
  onClick,
  className = "",
  style,
  ...rest
}) {
  const cls = [
    "btn",
    variant === "primary" ? "btn-primary"
      : variant === "danger" ? "btn-danger"
      : variant === "ghost" ? "btn-ghost" : "",
    size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "",
    className,
  ].filter(Boolean).join(" ");
  return (
    <button
      type={type}
      className={cls}
      disabled={disabled}
      onClick={onClick}
      style={style}
      {...rest}
    >
      {children}
    </button>
  );
}