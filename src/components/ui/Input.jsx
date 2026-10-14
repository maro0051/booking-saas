export default function Input({ label, id, error, ...rest }) {
  const inputId = id || rest.name;
  return (
    <div className="field">
      {label && <label htmlFor={inputId}>{label}</label>}
      <input id={inputId} className="input" {...rest} />
      {error && <span className="alert alert-error">{error}</span>}
    </div>
  );
}
