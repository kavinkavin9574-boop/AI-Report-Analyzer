export default function DataTable({ fields }) {
  if (!fields || fields.length === 0) {
    return <p className="text-sm text-slate-500">No structured fields were extracted from this report.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-[#12121c] text-left text-slate-400">
          <tr>
            <th className="px-3 py-2.5 font-medium">Parameter</th>
            <th className="px-3 py-2.5 font-medium">Value</th>
            <th className="px-3 py-2.5 font-medium">Unit</th>
            <th className="px-3 py-2.5 font-medium">Reference Range</th>
            <th className="px-3 py-2.5 font-medium">Page</th>
            <th className="px-3 py-2.5 font-medium">Confidence</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f, i) => (
            <tr key={f.id} className={`border-t border-white/5 ${i % 2 ? "bg-white/[0.03]" : ""}`}>
              <td className="px-3 py-2 font-medium text-slate-100">{f.parameter}</td>
              <td className="px-3 py-2 text-slate-300">{f.value ?? f.raw_value}</td>
              <td className="px-3 py-2 text-slate-300">{f.unit || "—"}</td>
              <td className="px-3 py-2 text-slate-300">
                {f.reference_min != null && f.reference_max != null
                  ? `${f.reference_min}–${f.reference_max}`
                  : "—"}
              </td>
              <td className="px-3 py-2 text-slate-300">{f.page_number}</td>
              <td className="px-3 py-2 text-slate-300">{Math.round((f.confidence ?? 0) * 100)}%</td>
              <td className="px-3 py-2">
                {f.is_outside_range ? (
                  <span className="text-rose-400 font-medium">Outside range</span>
                ) : (
                  <span className="text-emerald-400">Normal</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
