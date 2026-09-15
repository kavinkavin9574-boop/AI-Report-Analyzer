import os
import uuid

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app import models, schemas
from app.services import preprocess, pdf_service

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/upload", response_model=schemas.ReportOut)
async def upload_report(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()

    try:
        preprocess.validate_upload(file.content_type, len(content), settings.max_upload_mb)
    except ValueError as exc:
        raise HTTPException(400, str(exc))

    ext = os.path.splitext(file.filename or "")[1] or ".bin"
    stored_name = f"{uuid.uuid4().hex}{ext}"
    stored_path = os.path.join(settings.upload_dir, stored_name)
    with open(stored_path, "wb") as f:
        f.write(content)

    report = models.Report(
        filename=file.filename or stored_name,
        stored_path=stored_path,
        report_type=_guess_report_type(file.filename or ""),
        status=models.ReportStatus.uploaded,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Synchronous processing for demo purposes (see docstring in pdf_service).
    _process_report(report.id, file.content_type, db)
    db.refresh(report)
    return report


def _guess_report_type(filename: str) -> str:
    lower = filename.lower()
    if "blood" in lower or "cbc" in lower or "lab" in lower:
        return "lab_report"
    if "radiology" in lower or "xray" in lower or "scan" in lower:
        return "radiology_report"
    return "general_report"


def _process_report(report_id: str, content_type: str, db: Session) -> None:
    report = db.query(models.Report).get(report_id)
    if report is None:
        return
    try:
        report.status = models.ReportStatus.preprocessing
        db.commit()

        result = pdf_service.run_pipeline(report.stored_path, content_type)

        report.status = models.ReportStatus.extracting
        report.page_count = result.page_count
        report.ocr_confidence = result.ocr_confidence
        report.table_count = len(result.tables)
        report.processing_ms = result.processing_ms
        db.commit()

        for b in result.ocr_blocks:
            db.add(models.OcrBlock(report_id=report.id, page_number=b["page_number"], text=b["text"], bbox=b["bbox"], confidence=b["confidence"]))

        for f in result.fields:
            db.add(models.ExtractedData(
                report_id=report.id, parameter=f.parameter, value=f.value, raw_value=f.raw_value,
                unit=f.unit, reference_min=f.reference_min, reference_max=f.reference_max,
                confidence=f.confidence, page_number=f.page_number, is_outside_range=int(f.is_outside_range),
            ))

        for t in result.tables:
            db.add(models.ExtractedTable(report_id=report.id, page_number=t.page_number, name=t.name, rows=t.rows, raw_text=t.raw_text))

        embeddings = None
        if result.chunks:
            from app.services import rag_service
            embeddings = rag_service.embed_texts([c.source_text for c in result.chunks])
        for i, c in enumerate(result.chunks):
            emb = embeddings[i] if embeddings else None
            db.add(models.ReportChunk(report_id=report.id, page_number=c.page_number, chunk_index=c.chunk_index, source_text=c.source_text, embedding=emb))

        db.commit()

        report.status = models.ReportStatus.analyzing
        db.commit()

        from app.services import llm_service
        fields_payload = [
            {
                "parameter": f.parameter, "value": f.value, "unit": f.unit,
                "reference_min": f.reference_min, "reference_max": f.reference_max,
                "confidence": f.confidence, "is_outside_range": f.is_outside_range,
            }
            for f in result.fields
        ]
        analysis_data = llm_service.analyze_report(fields_payload, report.report_type)
        db.add(models.Analysis(
            report_id=report.id,
            summary=analysis_data.get("summary"),
            key_findings=analysis_data.get("key_findings", []),
            outside_reference_ranges=analysis_data.get("outside_reference_ranges", []),
            missing_or_uncertain_fields=analysis_data.get("missing_or_uncertain_fields", []),
            professional_review_items=analysis_data.get("professional_review_items", []),
        ))

        report.status = models.ReportStatus.completed
        db.commit()
    except Exception as exc:
        report.status = models.ReportStatus.failed
        report.error_message = str(exc)
        db.commit()


@router.get("", response_model=list[schemas.ReportOut])
def list_reports(db: Session = Depends(get_db)):
    return db.query(models.Report).order_by(models.Report.upload_date.desc()).all()


@router.get("/{report_id}", response_model=schemas.ReportOut)
def get_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(models.Report).get(report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    return report


@router.get("/{report_id}/status", response_model=schemas.ReportOut)
def get_status(report_id: str, db: Session = Depends(get_db)):
    return get_report(report_id, db)


@router.get("/{report_id}/data", response_model=schemas.ReportDataOut)
def get_data(report_id: str, db: Session = Depends(get_db)):
    report = db.query(models.Report).get(report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    fields = db.query(models.ExtractedData).filter_by(report_id=report_id).all()
    tables = db.query(models.ExtractedTable).filter_by(report_id=report_id).all()
    return {"report": report, "fields": fields, "tables": tables}


@router.get("/{report_id}/ocr")
def get_ocr(report_id: str, db: Session = Depends(get_db)):
    blocks = db.query(models.OcrBlock).filter_by(report_id=report_id).all()
    return [{"page_number": b.page_number, "text": b.text, "bbox": b.bbox, "confidence": b.confidence} for b in blocks]


@router.get("/{report_id}/tables", response_model=list[schemas.ExtractedTableOut])
def get_tables(report_id: str, db: Session = Depends(get_db)):
    return db.query(models.ExtractedTable).filter_by(report_id=report_id).all()
