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
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold mb-1">Analyze a report</h1>
        <p className="text-slate-500 text-sm mb-4">
          Upload a lab report, scan, or document. We'll OCR it, extract structured data, and generate an AI summary.
        </p>
        <UploadBox onFileSelected={handleFile} uploading={uploading} progress={progress} />
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </div>

      <div>
        <h2 className="text-lg font-medium mb-3">Recent reports</h2>
        {loadingReports && <p className="text-sm text-slate-500">Loading…</p>}
        {!loadingReports && reports.length === 0 && (
          <p className="text-sm text-slate-500">No reports yet — upload one above to get started.</p>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/reports/${r.id}`)}
              className="text-left bg-white border rounded-lg p-4 hover:border-brand-400 transition-colors"
            >
              <div className="font-medium truncate">{r.filename}</div>
              <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span className="capitalize">{r.status.replace("_", " ")}</span>
                <span>{new Date(r.upload_date).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
