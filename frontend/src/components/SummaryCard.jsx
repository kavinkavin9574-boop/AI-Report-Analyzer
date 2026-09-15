export default function SummaryCard({ report }) {
  const kpis = [
    { label: "Parameters", value: report.field_count ?? "—" },
    { label: "Normal", value: report.normal_count ?? "—" },
    { label: "Outside range", value: report.outside_count ?? "—" },
    { label: "OCR confidence", value: report.ocr_confidence != null ? `${Math.round(report.ocr_confidence * 100)}%` : "—" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="bg-white rounded-lg border p-4 text-center">
          <div className="text-2xl font-semibold text-brand-700">{kpi.value}</div>
          <div className="text-xs text-slate-500 mt-1">{kpi.label}</div>
        </div>
      ))}
    </div>
  );
}
