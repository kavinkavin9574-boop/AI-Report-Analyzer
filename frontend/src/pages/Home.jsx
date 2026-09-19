import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UploadBox from "../components/UploadBox.jsx";
import { uploadReport, listReports } from "../api.js";

export default function Home() {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => {
    listReports()
      .then((res) => setReports(res.data))
      .catch(() => setError("Could not load recent reports."))
      .finally(() => setLoadingReports(false));
  }, []);

  async function handleFile(file) {
    setUploading(true);
    setProgress(0);
    setError("");
    try {
      const res = await uploadReport(file, setProgress);
      navigate(`/reports/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-brand-400 mb-2">Lab reports, scans, documents</p>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Analyze a report</h1>
        <p className="text-slate-400 text-sm mb-6 max-w-xl">
          Upload a lab report, scan, or document. We'll OCR it, extract structured data, and generate an AI summary.
        </p>
        <UploadBox onFileSelected={handleFile} uploading={uploading} progress={progress} />
        {error && <p className="text-sm text-rose-400 mt-3">{error}</p>}
      </div>

      <div>
        <h2 className="text-lg font-medium mb-4 text-slate-200">Recent reports</h2>
        {loadingReports && <p className="text-sm text-slate-500">Loading…</p>}
        {!loadingReports && reports.length === 0 && (
          <p className="text-sm text-slate-500">No reports yet — upload one above to get started.</p>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/reports/${r.id}`)}
              className="panel text-left p-4 transition hover:-translate-y-0.5 hover:border-brand-400/50 hover:bg-white/[0.07]"
            >
              <div className="font-medium truncate text-slate-100">{r.filename}</div>
              <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
                <span className="chip">{r.status.replace("_", " ")}</span>
                <span>{new Date(r.upload_date).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
