export default function SummaryCard({ report }) {
  const kpis = [
    { label: "Parameters", value: report.field_count ?? "—", tone: "default" },
    { label: "Normal", value: report.normal_count ?? "—", tone: "ok" },
    { label: "Outside range", value: report.outside_count ?? "—", tone: "danger" },
    {
      label: "OCR confidence",
      value: report.ocr_confidence != null ? `${Math.round(report.ocr_confidence * 100)}%` : "—",
      tone: "accent",
      progress: report.ocr_confidence != null ? Math.round(report.ocr_confidence * 100) : null,
    },
  ];

  const valueClass = {
    default: "text-slate-100",
    ok: "text-emerald-400",
    danger: "text-rose-400",
    accent: "text-brand-400",
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="kpi">
          <div className={`text-2xl font-semibold tracking-tight ${valueClass[kpi.tone]}`}>{kpi.value}</div>
          <div className="text-[11px] uppercase tracking-wide text-slate-500 mt-1">{kpi.label}</div>
          {kpi.progress != null && (
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-1 rounded-full bg-brand-500" style={{ width: `${kpi.progress}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
