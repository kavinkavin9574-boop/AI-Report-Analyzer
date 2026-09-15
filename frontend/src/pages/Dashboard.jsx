import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SummaryCard from "../components/SummaryCard.jsx";
import Findings from "../components/Findings.jsx";
import ModelSelector from "../components/ModelSelector.jsx";
import { useSelectedModel } from "../useSelectedModel.js";
import { getReportData, getAnalysis, generateAnalysis } from "../api.js";

export default function Dashboard() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");
  const { models, selected, selectModel } = useSelectedModel();

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const dataRes = await getReportData(id);
        if (!active) return;
        setData(dataRes.data);

        try {
          const analysisRes = await getAnalysis(id);
          if (active) setAnalysis(analysisRes.data);
        } catch {
          const generated = await generateAnalysis(id, selected);
          if (active) setAnalysis(generated.data);
        }
      } catch (err) {
        if (active) setError(err.response?.data?.detail || "Could not load report.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
    // Only re-run on report change; regeneration with a new model is explicit (button below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function regenerate() {
    setRegenerating(true);
    setError("");
    try {
      const res = await generateAnalysis(id, selected);
      setAnalysis(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not regenerate analysis.");
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading dashboard…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return null;

  const { report, fields } = data;
  const outsideCount = fields.filter((f) => f.is_outside_range).length;
  const summaryReport = {
    ...report,
    field_count: fields.length,
    normal_count: fields.length - outsideCount,
    outside_count: outsideCount,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{report.filename}</h1>
          <p className="text-xs text-slate-500 mt-1">
            {report.page_count} page(s) · {report.table_count} table(s) · processed in{" "}
            {report.processing_ms ? `${report.processing_ms}ms` : "—"}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link to={`/reports/${id}/details`} className="px-3 py-1.5 rounded border bg-white hover:border-brand-400">
            View Data
          </Link>
          <Link to="/compare" className="px-3 py-1.5 rounded border bg-white hover:border-brand-400">
            Compare
          </Link>
          <Link to={`/reports/${id}/chat`} className="px-3 py-1.5 rounded bg-brand-600 text-white hover:bg-brand-700">
            Chat With Report
          </Link>
        </div>
      </div>

      <SummaryCard report={summaryReport} />

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium">Key Findings</h2>
            <div className="flex items-center gap-2">
              <ModelSelector models={models} selected={selected} onChange={selectModel} />
              <button
                onClick={regenerate}
                disabled={regenerating}
                className="text-xs px-2 py-1.5 rounded border bg-white hover:border-brand-400 disabled:opacity-50"
              >
                {regenerating ? "Regenerating…" : "Regenerate"}
              </button>
            </div>
          </div>
          <Findings analysis={analysis} />
          {analysis?.model_used && (
            <p className="text-xs text-slate-400 mt-1">Generated with {analysis.model_used}</p>
          )}
        </div>
        <div>
          <h2 className="font-medium mb-2">Report Information</h2>
          <div className="bg-white rounded-lg border p-4 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="capitalize">{report.report_type.replace("_", " ")}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="capitalize">{report.status}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Pages</span><span>{report.page_count}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Tables extracted</span><span>{report.table_count}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Uploaded</span><span>{new Date(report.upload_date).toLocaleString()}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
