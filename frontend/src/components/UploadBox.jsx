import { useCallback, useRef, useState } from "react";

const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];

export default function UploadBox({ onFileSelected, uploading, progress }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const validateAndSelect = useCallback(
    (file) => {
      if (!file) return;
      if (!ACCEPTED.includes(file.type)) {
        setError("Unsupported file type. Please upload a PDF, JPG, or PNG.");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError("File is too large. Max size is 20MB.");
        return;
      }
      setError("");
      onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          validateAndSelect(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragOver ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-white hover:border-brand-400"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => validateAndSelect(e.target.files?.[0])}
        />
        <p className="text-slate-600">
          Drag and drop a report here, or <span className="text-brand-600 font-medium">browse</span>
        </p>
        <p className="text-xs text-slate-400 mt-2">PDF, JPG, or PNG — up to 20MB</p>
      </div>

      {uploading && (
        <div className="mt-3">
          <div className="h-2 w-full bg-slate-200 rounded overflow-hidden">
            <div className="h-2 bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-1">Uploading… {progress}%</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
