"""
Pipeline orchestrator.

Ties together preprocess -> ocr -> extraction -> tables -> chunking for a
single report. Called synchronously from the upload endpoint (acceptable
for a demo; production should move this to a background task/queue with
the frontend polling /status, as noted in the guide).
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import List

from app.services import preprocess, ocr_service, extraction_service, table_service, rag_service
from app.config import settings


@dataclass
class PipelineResult:
    page_count: int
    ocr_confidence: float
    fields: List[extraction_service.ExtractedField] = field(default_factory=list)
    tables: List[table_service.ExtractedTable] = field(default_factory=list)
    chunks: List[rag_service.Chunk] = field(default_factory=list)
    ocr_blocks: List[dict] = field(default_factory=list)
    processing_ms: int = 0
    used_ocr: bool = False


def run_pipeline(file_path: str, content_type: str) -> PipelineResult:
    start = time.time()
    pages = preprocess.load_pages(file_path, content_type)

    all_fields: List[extraction_service.ExtractedField] = []
    all_tables: List[table_service.ExtractedTable] = []
    all_chunks: List[rag_service.Chunk] = []
    all_ocr_blocks: List[dict] = []
    confidences: List[float] = []
    chunk_idx = 0
    used_ocr = False

    for page in pages:
        if page.native_text is not None:
            page_text = page.native_text
            page_confidence = 1.0  # native PDF text layer, not OCR'd
        else:
            used_ocr = True
            blocks = ocr_service.extract_text_blocks(page.image, lang=settings.ocr_lang)
            page_text = "\n".join(b.text for b in blocks)
            page_confidence = ocr_service.average_confidence(blocks) if blocks else 0.0
            for b in blocks:
                all_ocr_blocks.append(
                    {"page_number": page.page_number, "text": b.text, "bbox": b.bbox, "confidence": b.confidence}
                )

        confidences.append(page_confidence)

        all_fields.extend(extraction_service.extract_fields(page_text, page.page_number, page_confidence or 1.0))

        table = table_service.extract_tables(page_text, page.page_number)
        if table:
            all_tables.append(table)

        page_chunks = rag_service.chunk_page_text(page.page_number, page_text, start_index=chunk_idx)
        chunk_idx += len(page_chunks)
        all_chunks.extend(page_chunks)

    overall_confidence = sum(confidences) / len(confidences) if confidences else 0.0
    elapsed_ms = int((time.time() - start) * 1000)

    return PipelineResult(
        page_count=len(pages),
        ocr_confidence=round(overall_confidence, 3),
        fields=all_fields,
        tables=all_tables,
        chunks=all_chunks,
        ocr_blocks=all_ocr_blocks,
        processing_ms=elapsed_ms,
        used_ocr=used_ocr,
    )
