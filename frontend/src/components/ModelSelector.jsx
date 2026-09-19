/**
 * Small dropdown for picking which OpenRouter model to use. Renders nothing
 * if the model list hasn't loaded yet (e.g. no OPENROUTER_API_KEY configured
 * on the backend) so it never blocks the deterministic fallback path.
 */
export default function ModelSelector({ models, selected, onChange, className = "" }) {
  if (!models || models.length === 0) return null;

  return (
    <select
      value={selected}
      onChange={(e) => onChange(e.target.value)}
      title="AI model"
      className={`input-dark max-w-[220px] truncate py-1.5 text-xs text-slate-300 ${className}`}
    >
      {models.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}
