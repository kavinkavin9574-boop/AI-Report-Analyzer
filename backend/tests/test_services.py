import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.extraction_service import extract_fields
from app.services.table_service import extract_tables
from app.services.rag_service import chunk_page_text


def test_extract_fields_basic():
    text = "Hemoglobin 11.2 g/dL 12-16\nGlucose 108 mg/dL 70-100\nRandom line with no numbers"
    fields = extract_fields(text, page_number=1)
    names = [f.parameter for f in fields]
    assert "Hemoglobin" in names
    assert "Glucose" in names

    hb = next(f for f in fields if f.parameter == "Hemoglobin")
    assert hb.value == 11.2
    assert hb.reference_min == 12
    assert hb.reference_max == 16
    assert hb.is_outside_range is True


def test_extract_fields_in_range_not_flagged():
    text = "Sodium 140 mmol/L 135-145"
    fields = extract_fields(text, page_number=1)
    assert fields[0].is_outside_range is False


def test_extract_tables_from_delimited_text():
    text = "Test  Result  Reference\nA     11.2   12-16\nB     108    70-100"
    table = extract_tables(text, page_number=1)
    assert table is not None
    assert len(table.rows) == 2
    assert table.rows[0]["Test"] == "A"


def test_extract_tables_returns_none_for_prose():
    text = "This is just a plain sentence with no table structure at all."
    table = extract_tables(text, page_number=1)
    assert table is None


def test_chunking_produces_overlapping_chunks():
    text = "x" * 2000
    chunks = chunk_page_text(1, text)
    assert len(chunks) >= 2
    assert all(c.page_number == 1 for c in chunks)
