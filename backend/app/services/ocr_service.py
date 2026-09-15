"""
OCR service.

Wraps PaddleOCR so the rest of the app depends on our own internal schema
(TextBlock) rather than PaddleOCR's library-specific output format. If
PaddleOCR is not installed / fails to load (it's a heavy dependency), we
fall back to returning no OCR blocks for that page gracefully rather than
crashing the whole pipeline — the caller decides how to handle that.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional
import numpy as np

_ocr_engine = None
_ocr_load_error: Optional[str] = None


@dataclass
class TextBlock:
    text: str
    bbox: List[float]  # [x0, y0, x1, y1]
    confidence: float


def _get_engine(lang: str = "en"):
    global _ocr_engine, _ocr_load_error
    if _ocr_engine is not None or _ocr_load_error is not None:
        return _ocr_engine
    try:
        from paddleocr import PaddleOCR  # lazy import: heavy dependency
        _ocr_engine = PaddleOCR(lang=lang, use_angle_cls=True, show_log=False)
    except Exception as exc:  # pragma: no cover - environment dependent
        _ocr_load_error = str(exc)
        _ocr_engine = None
    return _ocr_engine


def extract_text_blocks(image: np.ndarray, lang: str = "en") -> List[TextBlock]:
    """Run OCR on a single page image and normalize results into TextBlock."""
    engine = _get_engine(lang)
    if engine is None:
        return []

    result = engine.ocr(image, cls=True)
    blocks: List[TextBlock] = []
    if not result:
        return blocks

    for line in result[0] or []:
        try:
            box, (text, conf) = line
            xs = [p[0] for p in box]
            ys = [p[1] for p in box]
            blocks.append(
                TextBlock(
                    text=text.strip(),
                    bbox=[min(xs), min(ys), max(xs), max(ys)],
                    confidence=float(conf),
                )
            )
        except Exception:
            continue
    return blocks


def average_confidence(blocks: List[TextBlock]) -> float:
    if not blocks:
        return 0.0
    return sum(b.confidence for b in blocks) / len(blocks)


def ocr_available() -> bool:
    return _get_engine() is not None
