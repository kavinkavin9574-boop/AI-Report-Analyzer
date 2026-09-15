import { useEffect, useState } from "react";
import { getAvailableModels } from "./api.js";

const STORAGE_KEY = "reportAnalyzer.selectedModel";

/**
 * Loads the model list from /api/settings/models and tracks the currently
 * selected model, persisted in localStorage so the pick carries across
 * Dashboard / Chat / Compare pages.
 */
export function useSelectedModel() {
  const [models, setModels] = useState([]);
  const [defaultModel, setDefaultModel] = useState("");
  const [selected, setSelected] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getAvailableModels()
      .then((res) => {
        if (!active) return;
        setModels(res.data.models || []);
        setDefaultModel(res.data.default_model || "");
        setSelected((prev) => prev || res.data.default_model || "");
      })
      .catch(() => {
        // Backend has no OpenRouter key configured / unreachable — the app
        // still works via the deterministic fallback, just no switcher.
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  function selectModel(id) {
    setSelected(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  return { models, defaultModel, selected, selectModel, loading };
}
