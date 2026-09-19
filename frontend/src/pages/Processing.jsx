import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getReportStatus } from "../api.js";

const STAGES = ["uploaded", "preprocessing", "ocr_processing", "extracting", "analyzing", "completed"];

export default function Processing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("uploaded");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await getReportStatus(id);
        if (!active) return;
        setStatus(res.data.status);
        if (res.data.status === "completed") {
          navigate(`/reports/${id}`);
        } else if (res.data.status === "failed") {
          setError(res.data.error_message || "Processing failed.");
        } else {
          setTimeout(poll, 1500);
        }
      } catch {
        if (active) setError("Could not check processing status.");
      }
    };
    poll();
    return () => {
      active = false;
    };
  }, [id, navigate]);

  const currentIndex = STAGES.indexOf(status);

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-lg font-semibold mb-8 text-center tracking-tight">Processing your report</h1>
      <div className="panel p-6 space-y-4">
        {STAGES.map((stage, i) => (
          <div key={stage} className="flex items-center gap-3">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium ${
                i < currentIndex
                  ? "bg-emerald-500 text-white"
                  : i === currentIndex
                    ? "bg-brand-500 text-white shadow-glow animate-pulse"
                    : "bg-white/10 text-slate-500"
              }`}
            >
              {i < currentIndex ? "✓" : i + 1}
            </span>
            <span className={i <= currentIndex ? "text-slate-100 capitalize" : "text-slate-500 capitalize"}>
              {stage.replace("_", " ")}
            </span>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-rose-400 mt-6 text-center">{error}</p>}
    </div>
  );
}
