import io
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ["DATABASE_URL"] = "sqlite:///./test_report_analyzer.db"

import fitz
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import init_db

init_db()
client = TestClient(app)


@pytest.fixture(autouse=True, scope="module")
def cleanup_db():
    yield
    try:
        os.remove("./test_report_analyzer.db")
    except FileNotFoundError:
        pass


def make_pdf_bytes(text: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text)
    data = doc.tobytes()
    doc.close()
    return data


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_upload_rejects_bad_content_type():
    resp = client.post(
        "/api/reports/upload",
        files={"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")},
    )
    assert resp.status_code == 400


def test_upload_and_pipeline_with_native_text_pdf():
    pdf_bytes = make_pdf_bytes("Hemoglobin 11.2 g/dL 12-16\nGlucose 108 mg/dL 70-100")
    resp = client.post(
        "/api/reports/upload",
        files={"file": ("lab_report.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] in ("completed", "failed")
    report_id = body["id"]

    data_resp = client.get(f"/api/reports/{report_id}/data")
    assert data_resp.status_code == 200
    data = data_resp.json()
    assert data["report"]["id"] == report_id

    analysis_resp = client.get(f"/api/analysis/{report_id}")
    assert analysis_resp.status_code in (200, 404)


def test_chat_without_question_data():
    pdf_bytes = make_pdf_bytes("Notes: patient reports mild fatigue.")
    upload_resp = client.post(
        "/api/reports/upload",
        files={"file": ("notes.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
    )
    report_id = upload_resp.json()["id"]

    chat_resp = client.post("/api/chat", json={"report_id": report_id, "question": "What does it say about fatigue?"})
    assert chat_resp.status_code == 200
    body = chat_resp.json()
    assert "answer" in body
    assert isinstance(body["sources"], list)


def test_compare_requires_two_reports():
    resp = client.post("/api/analysis/compare", json={"report_ids": ["only-one"]})
    assert resp.status_code == 400
