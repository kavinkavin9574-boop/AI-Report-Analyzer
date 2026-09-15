import { useEffect, useState } from "react";
import TrendChart from "../components/TrendChart.jsx";
import ModelSelector from "../components/ModelSelector.jsx";
import { useSelectedModel } from "../useSelectedModel.js";
import { listReports, compareReports } from "../api.js";

export default function Compare() {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { models, selected: selectedModel, selectModel } = useSelectedModel();

  useEffect(() => {
    listReports().then((res) => setReports(res.data.filter((r) => r.status === "completed")));
  }, []);

  function toggle(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function runCompare() {
    if (selected.length < 2) {
      setError("Select at least 2 reports to compare.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await compareReports(selected, selectedModel);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Comparison failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold mb-1">Compare reports</h1>
        <p className="text-slate-500 text-sm">Select two or more completed reports to see trends across dates.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {reports.map((r) => (
          <label
            key={r.id}
            className={`flex items-center gap-2 border rounded-lg p-3 bg-white cursor-pointer ${
              selected.includes(r.id) ? "border-brand-500 ring-1 ring-brand-200" : ""
            }`}
          >
            <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
            <div className="text-sm">
              <div className="font-medium truncate">{r.filename}</div>
              <div className="text-xs text-slate-400">{new Date(r.upload_date).toLocaleDateString()}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={runCompare}
          disabled={loading}
          className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50 text-sm"
        >
          {loading ? "Comparing…" : "Compare selected"}
        </button>
        <ModelSelector models={models} selected={selectedModel} onChange={selectModel} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="space-y-4">
          {result.ai_comparison && (
            <div className="bg-white rounded-lg border p-4 text-sm">
              <h3 className="font-medium mb-1">AI Comparison Summary</h3>
              <p>{result.ai_comparison}</p>
              {result.model_used && (
                <p className="text-xs text-slate-400 mt-2">Generated with {result.model_used}</p>
              )}
            </div>
          )}
          <TrendChart parameters={result.parameters} />
        </div>
      )}
    </div>
  );
}
