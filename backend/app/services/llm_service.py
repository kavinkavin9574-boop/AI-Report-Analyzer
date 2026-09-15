"""
AI analysis service.

Sends clean, structured report data (never raw images) to the LLM with a
strict system prompt and a required JSON output schema. The model is
instructed not to invent values and to separate extracted facts from
interpretation. The response is validated before being stored.

LLM calls go through OpenRouter (https://openrouter.ai), which exposes a
single OpenAI-compatible endpoint in front of many providers/models. That
lets the caller pick a model per-request instead of being locked to one
provider.
"""
from __future__ import annotations

import json
import time
from typing import List, Optional

import httpx

from app.config import settings, DEFAULT_AVAILABLE_MODELS

SYSTEM_PROMPT = """You are a report analysis assistant.
Use only the supplied report data. Do not invent values. Do not diagnose.
Separate extracted facts from interpretation. Clearly identify missing or
uncertain information.

Respond with ONLY a JSON object (no markdown fences, no preamble) matching
exactly this schema:
{
  "summary": "short summary string",
  "key_findings": ["string", ...],
  "outside_reference_ranges": ["string", ...],
  "missing_or_uncertain_fields": ["string", ...],
  "professional_review_items": ["string", ...]
}"""

REQUIRED_KEYS = {
    "summary",
    "key_findings",
    "outside_reference_ranges",
    "missing_or_uncertain_fields",
    "professional_review_items",
}

# Cache the live OpenRouter model list for a while so every request doesn't
# round-trip to their API. (module-level, process-lifetime cache)
_models_cache: dict = {"fetched_at": 0.0, "models": None}
_MODELS_CACHE_TTL_SECONDS = 3600


def _client():
    if not settings.openrouter_api_key:
        return None
    import openai
    return openai.OpenAI(
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
        default_headers={
            # OpenRouter-recommended attribution headers (optional, but they
            # use these for their public rankings / abuse mitigation).
            "HTTP-Referer": settings.app_url,
            "X-Title": settings.app_title,
        },
    )


def _resolve_model(model: Optional[str]) -> str:
    return (model or settings.llm_model).strip()


def _chat(client, model: str, system: str, user_content: str, max_tokens: int) -> str:
    response = client.chat.completions.create(
        model=model,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
    )
    return (response.choices[0].message.content or "").strip()


def get_available_models() -> List[dict]:
    """Returns [{id, name}] for the model switcher. Tries OpenRouter's live
    /models endpoint (cached), falls back to the curated static list from
    settings/config if that fails or no key is configured."""
    now = time.time()
    if _models_cache["models"] and now - _models_cache["fetched_at"] < _MODELS_CACHE_TTL_SECONDS:
        return _models_cache["models"]

    if settings.openrouter_api_key:
        try:
            resp = httpx.get(
                f"{settings.openrouter_base_url}/models",
                headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
                timeout=10.0,
            )
            resp.raise_for_status()
            data = resp.json().get("data", [])
            by_id = {m["id"]: m.get("name", m["id"]) for m in data}
            # Show the curated/configured list first (in order), using live
            # display names where we have them, then fall back to the id.
            curated = [
                {"id": m, "name": by_id.get(m, m)}
                for m in settings.available_models
                if m in by_id or True  # keep configured models even if not in live list
            ]
            _models_cache["models"] = curated
            _models_cache["fetched_at"] = now
            return curated
        except Exception:
            pass  # fall through to static list below

    static = [{"id": m, "name": m} for m in (settings.available_models or DEFAULT_AVAILABLE_MODELS)]
    _models_cache["models"] = static
    _models_cache["fetched_at"] = now
    return static


def _fallback_analysis(fields: List[dict]) -> dict:
    """Deterministic, non-LLM fallback so the pipeline still produces a
    usable result when no API key is configured (e.g. local dev/demo)."""
    outside = [f for f in fields if f.get("is_outside_range")]
    return {
        "summary": f"{len(fields)} parameter(s) extracted; {len(outside)} outside supplied reference range(s). "
                    f"(LLM not configured -- set OPENROUTER_API_KEY for AI-generated summaries.)",
        "key_findings": [f"{f['parameter']}: {f['value']} {f.get('unit') or ''}".strip() for f in fields[:10]],
        "outside_reference_ranges": [
            f"{f['parameter']}: {f['value']} (ref {f.get('reference_min')}-{f.get('reference_max')})"
            for f in outside
        ],
        "missing_or_uncertain_fields": [f["parameter"] for f in fields if f.get("confidence", 1.0) < 0.6],
        "professional_review_items": [f"{f['parameter']} out of range" for f in outside],
    }


def analyze_report(fields: List[dict], report_type: str = "report", model: Optional[str] = None) -> dict:
    client = _client()
    if client is None:
        result = _fallback_analysis(fields)
        result["model_used"] = None
        return result

    resolved_model = _resolve_model(model)
    user_content = (
        f"Report type: {report_type}\n\n"
        f"Extracted fields (JSON):\n{json.dumps(fields, indent=2)}"
    )

    try:
        text = _chat(client, resolved_model, SYSTEM_PROMPT, user_content, max_tokens=1500)
        text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        parsed = json.loads(text)
        if not REQUIRED_KEYS.issubset(parsed.keys()):
            raise ValueError("LLM response missing required keys")
        parsed["model_used"] = resolved_model
        return parsed
    except Exception:
        # Validation failed / API error -> safe deterministic fallback,
        # never silently invent data.
        result = _fallback_analysis(fields)
        result["model_used"] = None
        return result


def answer_question(
    question: str, context_chunks: List[dict], model: Optional[str] = None
) -> tuple[str, Optional[str]]:
    """context_chunks: [{source_text, page_number}]. Returns
    (answer_string, model_used_or_None)."""
    if not context_chunks:
        return "I couldn't find relevant information in this report to answer that question.", None

    client = _client()
    context_text = "\n\n".join(
        f"[Page {c['page_number']}] {c['source_text']}" for c in context_chunks
    )

    if client is None:
        # Deterministic fallback: surface the most relevant chunk directly.
        top = context_chunks[0]
        return (
            f"(LLM not configured) The most relevant excerpt found is on page "
            f"{top['page_number']}: \"{top['source_text'][:300]}\"",
            None,
        )

    resolved_model = _resolve_model(model)
    system = (
        "Answer the user's question using ONLY the provided report excerpts. "
        "If the answer is not present, say explicitly that it is not found in "
        "the report. Do not invent information. Cite page numbers you used."
    )
    try:
        answer = _chat(
            client, resolved_model, system,
            f"Report excerpts:\n{context_text}\n\nQuestion: {question}",
            max_tokens=600,
        )
        return answer, resolved_model
    except Exception as exc:
        return f"Error generating answer: {exc}", None


def compare_reports_summary(comparison_data: dict, model: Optional[str] = None) -> Optional[str]:
    client = _client()
    if client is None:
        return None
    resolved_model = _resolve_model(model)
    try:
        return _chat(
            client, resolved_model,
            "Summarize the trend across these reports factually. Do not diagnose. "
            "Note increases/decreases and any values outside reference ranges.",
            json.dumps(comparison_data),
            max_tokens=600,
        )
    except Exception:
        return None
