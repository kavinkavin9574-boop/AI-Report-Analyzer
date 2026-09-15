"""
RAG service.

Upload -> OCR/text -> chunks -> embeddings -> vector store (FAISS, per
report) -> question -> retrieve relevant chunks -> LLM -> grounded answer
with page/source reference.

Embeddings are computed with Sentence Transformers when available and
stored in the DB (ReportChunk.embedding) so they survive restarts; a FAISS
index is built in-memory per request from those stored vectors, which is
fine at this dataset scale (a handful of reports/chunks) and keeps the
service stateless between requests.

If sentence-transformers isn't available (heavy dependency), we fall back
to simple keyword-overlap retrieval so chat still works, just without
semantic search.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional
import re

import numpy as np

_model = None
_model_load_error: Optional[str] = None

CHUNK_SIZE_CHARS = 800
CHUNK_OVERLAP_CHARS = 150


@dataclass
class Chunk:
    page_number: int
    chunk_index: int
    source_text: str


def chunk_page_text(page_number: int, text: str, start_index: int = 0) -> List[Chunk]:
    chunks: List[Chunk] = []
    text = text.strip()
    if not text:
        return chunks
    i = 0
    idx = start_index
    while i < len(text):
        piece = text[i:i + CHUNK_SIZE_CHARS]
        chunks.append(Chunk(page_number=page_number, chunk_index=idx, source_text=piece))
        idx += 1
        i += CHUNK_SIZE_CHARS - CHUNK_OVERLAP_CHARS
    return chunks


def _get_model():
    global _model, _model_load_error
    if _model is not None or _model_load_error is not None:
        return _model
    try:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    except Exception as exc:  # pragma: no cover - environment dependent
        _model_load_error = str(exc)
        _model = None
    return _model


def embed_texts(texts: List[str]) -> Optional[List[List[float]]]:
    model = _get_model()
    if model is None or not texts:
        return None
    vectors = model.encode(texts, normalize_embeddings=True)
    return [v.tolist() for v in vectors]


def _keyword_score(query: str, text: str) -> float:
    q_words = set(re.findall(r"\w+", query.lower()))
    t_words = set(re.findall(r"\w+", text.lower()))
    if not q_words:
        return 0.0
    return len(q_words & t_words) / len(q_words)


def retrieve(question: str, chunks: List[dict], top_k: int = 4) -> List[dict]:
    """chunks: [{page_number, source_text, embedding}]. Returns top_k
    chunks as [{page_number, source_text, score}], best first."""
    if not chunks:
        return []

    q_vec = embed_texts([question])
    have_embeddings = q_vec is not None and all(c.get("embedding") for c in chunks)

    if have_embeddings:
        try:
            import faiss
            dim = len(chunks[0]["embedding"])
            index = faiss.IndexFlatIP(dim)
            matrix = np.array([c["embedding"] for c in chunks], dtype="float32")
            index.add(matrix)
            query_vec = np.array(q_vec, dtype="float32")
            scores, indices = index.search(query_vec, min(top_k, len(chunks)))
            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx < 0:
                    continue
                c = chunks[idx]
                results.append({"page_number": c["page_number"], "source_text": c["source_text"], "score": float(score)})
            return results
        except Exception:
            pass  # fall through to keyword scoring

    scored = sorted(
        chunks,
        key=lambda c: _keyword_score(question, c["source_text"]),
        reverse=True,
    )
    scored = [c for c in scored if _keyword_score(question, c["source_text"]) > 0][:top_k]
    return [{"page_number": c["page_number"], "source_text": c["source_text"], "score": None} for c in scored]
