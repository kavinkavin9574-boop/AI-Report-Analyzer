"""
Structured extraction.

Raw OCR / native text -> clean whitespace / dedupe ->
detect "label value unit (ref_min-ref_max)" patterns -> validated fields.

This is a rule-based parser (regex) rather than an LLM call, matching the
guide's pipeline: "Detect labels, values and units" as a deterministic step
before tables/AI analysis. It's intentionally conservative: it only emits a
field when it finds a plausible numeric value next to a label.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Optional

LINE_RE = re.compile(
    r"""^(?P<label>[A-Za-z][A-Za-z0-9 /()\-]{1,40}?)\s*[:\-]?\s*
        (?P<value>-?\d+\.?\d*)\s*
        (?P<unit>[a-zA-Z/%µμ]{0,10})?\s*
        (?:\(?\s*(?:ref(?:erence)?\.?)?\s*
            (?P<ref_min>-?\d+\.?\d*)\s*[-–to]{1,3}\s*(?P<ref_max>-?\d+\.?\d*)
        \s*\)?)?
        \s*$""",
    re.VERBOSE,
)


@dataclass
class ExtractedField:
    parameter: str
    value: Optional[float]
    raw_value: str
    unit: Optional[str]
    reference_min: Optional[float]
    reference_max: Optional[float]
    confidence: float
    page_number: int
    is_outside_range: bool


def clean_lines(raw_text: str) -> List[str]:
    lines = [l.strip() for l in raw_text.splitlines()]
    lines = [l for l in lines if l]
    seen = set()
    deduped = []
    for l in lines:
        key = l.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(l)
    return deduped


def extract_fields(page_text: str, page_number: int, base_confidence: float = 1.0) -> List[ExtractedField]:
    fields: List[ExtractedField] = []
    for line in clean_lines(page_text):
        m = LINE_RE.match(line)
        if not m:
            continue
        label = m.group("label").strip()
        if len(label) < 2:
            continue
        try:
            value = float(m.group("value"))
        except (TypeError, ValueError):
            continue

        ref_min = m.group("ref_min")
        ref_max = m.group("ref_max")
        ref_min_f = float(ref_min) if ref_min else None
        ref_max_f = float(ref_max) if ref_max else None

        outside = False
        if ref_min_f is not None and ref_max_f is not None:
            outside = value < ref_min_f or value > ref_max_f

        fields.append(
            ExtractedField(
                parameter=label,
                value=value,
                raw_value=line,
                unit=(m.group("unit") or None),
                reference_min=ref_min_f,
                reference_max=ref_max_f,
                confidence=round(base_confidence, 3),
                page_number=page_number,
                is_outside_range=outside,
            )
        )
    return fields
