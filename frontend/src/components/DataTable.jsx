export default function DataTable({ fields }) {
  if (!fields || fields.length === 0) {
    return <p className="text-sm text-slate-500">No structured fields were extracted from this report.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100 text-left text-slate-600">
          <tr>
            <th className="px-3 py-2">Parameter</th>
            <th className="px-3 py-2">Value</th>
            <th className="px-3 py-2">Unit</th>
            <th className="px-3 py-2">Reference Range</th>
            <th className="px-3 py-2">Page</th>
            <th className="px-3 py-2">Confidence</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.id} className="border-t">
              <td className="px-3 py-2 font-medium">{f.parameter}</td>
              <td className="px-3 py-2">{f.value ?? f.raw_value}</td>
              <td className="px-3 py-2">{f.unit || "—"}</td>
              <td className="px-3 py-2">
                {f.reference_min != null && f.reference_max != null
                  ? `${f.reference_min}–${f.reference_max}`
                  : "—"}
              </td>
              <td className="px-3 py-2">{f.page_number}</td>
              <td className="px-3 py-2">{Math.round((f.confidence ?? 0) * 100)}%</td>
              <td className="px-3 py-2">
                {f.is_outside_range ? (
                  <span className="text-red-600 font-medium">Outside range</span>
                ) : (
                  <span className="text-emerald-600">Normal</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
