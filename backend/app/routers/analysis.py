from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.services import llm_service

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("/compare", response_model=schemas.CompareResponse)
def compare_reports(payload: schemas.CompareRequest, db: Session = Depends(get_db)):
    if len(payload.report_ids) < 2:
        raise HTTPException(400, "Provide at least 2 report_ids to compare")

    reports = db.query(models.Report).filter(models.Report.id.in_(payload.report_ids)).all()
    if len(reports) != len(payload.report_ids):
        raise HTTPException(404, "One or more reports not found")

    by_param = defaultdict(list)
    for report in reports:
        fields = db.query(models.ExtractedData).filter_by(report_id=report.id).all()
        for f in fields:
            canonical = f.parameter.strip().lower()
            by_param[canonical].append({
                "report_id": report.id,
                "date": report.upload_date.isoformat(),
                "value": f.value,
                "unit": f.unit,
                "in_range": not bool(f.is_outside_range),
                "display_name": f.parameter,
            })

    parameters = []
    for canonical, points in by_param.items():
        if len(points) < 2:
            continue  # only include params that appear in 2+ reports (a real trend)
        points_sorted = sorted(points, key=lambda p: p["date"])
        parameters.append({
            "parameter": points_sorted[0]["display_name"],
            "unit": points_sorted[0].get("unit"),
            "points": points_sorted,
        })

    ai_comparison = llm_service.compare_reports_summary(
        {"parameters": parameters}, model=payload.model
    )

    return {
        "parameters": parameters,
        "ai_comparison": ai_comparison,
        "model_used": payload.model if ai_comparison else None,
    }


@router.post("/{report_id}", response_model=schemas.AnalysisOut)
def generate_analysis(
    report_id: str,
    payload: Optional[schemas.AnalysisRequest] = Body(default=None),
    db: Session = Depends(get_db),
):
    payload = payload or schemas.AnalysisRequest()
    report = db.query(models.Report).get(report_id)
    if not report:
        raise HTTPException(404, "Report not found")

    fields = db.query(models.ExtractedData).filter_by(report_id=report_id).all()
    fields_payload = [
        {
            "parameter": f.parameter, "value": f.value, "unit": f.unit,
            "reference_min": f.reference_min, "reference_max": f.reference_max,
            "confidence": f.confidence, "is_outside_range": bool(f.is_outside_range),
        }
        for f in fields
    ]
    data = llm_service.analyze_report(fields_payload, report.report_type, model=payload.model)
    analysis = models.Analysis(
        report_id=report_id,
        summary=data.get("summary"),
        key_findings=data.get("key_findings", []),
        outside_reference_ranges=data.get("outside_reference_ranges", []),
        missing_or_uncertain_fields=data.get("missing_or_uncertain_fields", []),
        professional_review_items=data.get("professional_review_items", []),
        model_used=data.get("model_used"),
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis


@router.get("/{report_id}", response_model=schemas.AnalysisOut)
def get_analysis(report_id: str, db: Session = Depends(get_db)):
    analysis = (
        db.query(models.Analysis)
        .filter_by(report_id=report_id)
        .order_by(models.Analysis.created_at.desc())
        .first()
    )
    if not analysis:
        raise HTTPException(404, "No analysis found for this report")
    return analysis
