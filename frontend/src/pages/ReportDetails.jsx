import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DataTable from "../components/DataTable.jsx";
import { getReportData, getReportOcr, getReportTables } from "../api.js";

const TABS = ["Structured Fields", "Tables", "OCR Text"];

export default function ReportDetails() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [ocr, setOcr] = useState([]);
  const [tables, setTables] = useState([]);
  const [tab, setTab] = useState(TABS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getReportData(id), getReportOcr(id), getReportTables(id)])
      .then(([dataRes, ocrRes, tablesRes]) => {
        if (!active) return;
        setData(dataRes.data);
        setOcr(ocrRes.data);
        setTables(tablesRes.data);
      })
      .catch((err) => active && setError(err.response?.data?.detail || "Could not load report data."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error) return <p className="text-sm text-rose-400">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight truncate">{data.report.filename}</h1>
        <Link to={`/reports/${id}`} className="text-sm text-brand-400 hover:text-brand-300 shrink-0">
          ← Back to dashboard
        </Link>
      </div>

      <div className="flex flex-wrap gap-1 p-1 rounded-full border border-white/10 bg-white/5 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-sm rounded-full transition ${
              tab === t ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Structured Fields" && <DataTable fields={data.fields} />}

      {tab === "Tables" && (
        <div className="space-y-4">
          {tables.length === 0 && <p className="text-sm text-slate-500">No tables were detected in this report.</p>}
          {tables.map((t) => (
            <div key={t.id} className="panel p-4">
              <h3 className="font-medium mb-3 text-slate-200">
                {t.name} <span className="text-xs text-slate-500">(page {t.page_number})</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-canvas/90">
                    <tr className="text-left text-slate-500">
                      {t.rows[0] && Object.keys(t.rows[0]).map((col) => (
                        <th key={col} className="px-3 py-2 font-medium">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((row, i) => (
                      <tr key={i} className={`border-t border-white/5 ${i % 2 ? "bg-white/[0.03]" : ""}`}>
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-3 py-2 text-slate-300">{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "OCR Text" && (
        <div className="panel p-4 space-y-3">
          {ocr.length === 0 && (
            <p className="text-sm text-slate-500">No OCR blocks — this report's text was read directly from the PDF text layer.</p>
          )}
          {ocr.map((block, i) => (
            <div key={i} className="text-sm border-b border-white/5 last:border-0 pb-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Page {block.page_number}</span>
                <span>{Math.round(block.confidence * 100)}% confidence</span>
              </div>
              <p className="text-slate-300">{block.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
