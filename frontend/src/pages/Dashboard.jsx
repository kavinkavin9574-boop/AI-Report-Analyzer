import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SummaryCard from "../components/SummaryCard.jsx";
import Findings from "../components/Findings.jsx";
import ModelSelector from "../components/ModelSelector.jsx";
import { useSelectedModel } from "../useSelectedModel.js";
import { getReportData, getAnalysis, generateAnalysis } from "../api.js";

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded-lg bg-white/10" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-white/5 border border-white/10" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="h-56 rounded-xl bg-white/5 border border-white/10" />
        <div className="h-56 rounded-xl bg-white/5 border border-white/10" />
      </div>
      <p className="sr-only">Loading dashboard…</p>
    </div>
  );
}

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

  if (loading) return <Skeleton />;
  if (error && !data) return <p className="text-sm text-rose-400">{error}</p>;
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
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{report.filename}</h1>
            <span className="chip">{report.status.replace("_", " ")}</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {report.page_count} page(s) · {report.table_count} table(s) · processed in{" "}
            {report.processing_ms ? `${report.processing_ms}ms` : "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/reports/${id}/details`} className="btn-ghost">
            View Data
          </Link>
          <Link to="/compare" className="btn-ghost">
            Compare
          </Link>
          <Link to={`/reports/${id}/chat`} className="btn-primary">
            Chat With Report
          </Link>
        </div>
      </div>

      <SummaryCard report={summaryReport} />

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="font-medium text-slate-200">Key Findings</h2>
            <div className="flex items-center gap-2">
              <ModelSelector models={models} selected={selected} onChange={selectModel} />
              <button
                onClick={regenerate}
                disabled={regenerating}
                className="btn-ghost !px-2 !py-1.5 text-xs"
              >
                {regenerating ? "Regenerating…" : "Regenerate"}
              </button>
            </div>
          </div>
          <Findings analysis={analysis} />
          {analysis?.model_used && (
            <p className="text-xs text-slate-500 mt-2">Generated with {analysis.model_used}</p>
          )}
        </div>
        <div>
          <h2 className="font-medium mb-3 text-slate-200">Report Information</h2>
          <div className="panel p-4 text-sm space-y-3">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-slate-500">Type</span>
              <span className="capitalize text-slate-200">{report.report_type.replace("_", " ")}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-slate-500">Status</span>
              <span className="capitalize text-slate-200">{report.status}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-slate-500">Pages</span>
              <span className="text-slate-200">{report.page_count}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-slate-500">Tables extracted</span>
              <span className="text-slate-200">{report.table_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Uploaded</span>
              <span className="text-slate-200">{new Date(report.upload_date).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
