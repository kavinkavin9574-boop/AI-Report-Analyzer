function Section({ title, items, tone = "default" }) {
  if (!items || items.length === 0) return null;
  const toneClass =
    tone === "warn"
      ? "text-amber-200 border-amber-500/30 bg-amber-500/10"
      : tone === "danger"
        ? "text-rose-200 border-rose-500/30 bg-rose-500/10"
        : "text-slate-200 border-white/10 bg-white/5";

  return (
    <div className={`rounded-xl border p-4 mb-3 backdrop-blur-md ${toneClass}`}>
      <h3 className="font-medium mb-2 text-sm">{title}</h3>
      <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function Findings({ analysis }) {
  if (!analysis) {
    return <p className="text-sm text-slate-500">No AI analysis available yet.</p>;
  }
  return (
    <div>
      {analysis.summary && (
        <div className="panel p-4 mb-3">
          <h3 className="font-medium mb-1 text-sm text-slate-200">Summary</h3>
          <p className="text-sm text-slate-300 leading-relaxed">{analysis.summary}</p>
        </div>
      )}
      <Section title="Key Findings" items={analysis.key_findings} />
      <Section title="Outside Reference Range" items={analysis.outside_reference_ranges} tone="danger" />
      <Section title="Missing / Uncertain Fields" items={analysis.missing_or_uncertain_fields} tone="warn" />
      <Section title="May Need Professional Review" items={analysis.professional_review_items} tone="warn" />
    </div>
  );
}
