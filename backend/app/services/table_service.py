"""
Table extraction.

Reconstructs rows/columns from lines that look like a delimited table
(pipe, tab, or 2+ spaces as column separators), which is what report OCR
typically yields for lab-style tables. Preserves the raw OCR text and page
number for traceability, per the guide's requirement.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional

COL_SPLIT_RE = re.compile(r"\s{2,}|\t|\|")


@dataclass
class ExtractedTable:
    page_number: int
    name: str
    rows: List[dict] = field(default_factory=list)
    raw_text: str = ""


def _looks_tabular(line: str) -> bool:
    parts = [p for p in COL_SPLIT_RE.split(line) if p.strip()]
    return len(parts) >= 2


def extract_tables(page_text: str, page_number: int, table_name: str = "Table") -> Optional[ExtractedTable]:
    lines = [l.strip() for l in page_text.splitlines() if l.strip()]
    tabular_lines = [l for l in lines if _looks_tabular(l)]
    if len(tabular_lines) < 2:
        return None

    header_cols = [c.strip() for c in COL_SPLIT_RE.split(tabular_lines[0]) if c.strip()]
    rows = []
    for line in tabular_lines[1:]:
        cols = [c.strip() for c in COL_SPLIT_RE.split(line) if c.strip()]
        if not cols:
            continue
        row = {}
        for i, col_name in enumerate(header_cols):
            row[col_name] = cols[i] if i < len(cols) else None
        # Handle rows with more/fewer cells than header gracefully
        if len(cols) > len(header_cols):
            row["_extra"] = cols[len(header_cols):]
        rows.append(row)

    return ExtractedTable(
        page_number=page_number,
        name=table_name,
        rows=rows,
        raw_text="\n".join(tabular_lines),
    )
