import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
});

export async function uploadReport(file, onProgress) {
  const form = new FormData();
  form.append("file", file);
  return api.post("/reports/upload", form, {
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    },
  });
}

export async function listReports() {
  return api.get("/reports");
}

export async function getReport(id) {
  return api.get(`/reports/${id}`);
}

export async function getReportStatus(id) {
  return api.get(`/reports/${id}/status`);
}

export async function getReportData(id) {
  return api.get(`/reports/${id}/data`);
}

export async function getReportOcr(id) {
  return api.get(`/reports/${id}/ocr`);
}

export async function getReportTables(id) {
  return api.get(`/reports/${id}/tables`);
}

export async function getAnalysis(id) {
  return api.get(`/analysis/${id}`);
}

export async function generateAnalysis(id, model) {
  return api.post(`/analysis/${id}`, model ? { model } : {});
}

export async function compareReports(ids, model) {
  return api.post("/analysis/compare", { report_ids: ids, ...(model ? { model } : {}) });
}

export async function askReport(id, question, model) {
  return api.post("/chat", { report_id: id, question, ...(model ? { model } : {}) });
}

export async function getChatHistory(id) {
  return api.get(`/chat/${id}/history`);
}

export async function getAvailableModels() {
  return api.get("/settings/models");
}
