function Section({ title, items, tone = "default" }) {
  if (!items || items.length === 0) return null;
  const toneClass =
    tone === "warn" ? "text-amber-700 bg-amber-50 border-amber-200" :
    tone === "danger" ? "text-red-700 bg-red-50 border-red-200" :
    "text-slate-700 bg-slate-50 border-slate-200";

  return (
    <div className={`rounded-lg border p-4 mb-3 ${toneClass}`}>
      <h3 className="font-medium mb-2">{title}</h3>
      <ul className="list-disc list-inside space-y-1 text-sm">
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
        <div className="rounded-lg border bg-white p-4 mb-3">
          <h3 className="font-medium mb-1">Summary</h3>
          <p className="text-sm text-slate-700">{analysis.summary}</p>
        </div>
      )}
      <Section title="Key Findings" items={analysis.key_findings} />
      <Section title="Outside Reference Range" items={analysis.outside_reference_ranges} tone="danger" />
      <Section title="Missing / Uncertain Fields" items={analysis.missing_or_uncertain_fields} tone="warn" />
      <Section title="May Need Professional Review" items={analysis.professional_review_items} tone="warn" />
    </div>
  );
}
