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
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{data.report.filename}</h1>
        <Link to={`/reports/${id}`} className="text-sm text-brand-600 hover:underline">
          ← Back to dashboard
        </Link>
      </div>

      <div className="flex gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${
              tab === t ? "border-brand-600 text-brand-700 font-medium" : "border-transparent text-slate-500"
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
            <div key={t.id} className="bg-white rounded-lg border p-4">
              <h3 className="font-medium mb-2">
                {t.name} <span className="text-xs text-slate-400">(page {t.page_number})</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      {t.rows[0] && Object.keys(t.rows[0]).map((col) => (
                        <th key={col} className="px-3 py-1">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((row, i) => (
                      <tr key={i} className="border-t">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-3 py-1">{String(val)}</td>
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
        <div className="bg-white rounded-lg border p-4 space-y-3">
          {ocr.length === 0 && (
            <p className="text-sm text-slate-500">No OCR blocks — this report's text was read directly from the PDF text layer.</p>
          )}
          {ocr.map((block, i) => (
            <div key={i} className="text-sm border-b last:border-0 pb-2">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Page {block.page_number}</span>
                <span>{Math.round(block.confidence * 100)}% confidence</span>
              </div>
              <p>{block.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
