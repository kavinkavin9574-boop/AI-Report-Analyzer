from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.services import rag_service, llm_service

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=schemas.ChatResponse)
def chat_with_report(payload: schemas.ChatRequest, db: Session = Depends(get_db)):
    report = db.query(models.Report).get(payload.report_id)
    if not report:
        raise HTTPException(404, "Report not found")

    chunks = db.query(models.ReportChunk).filter_by(report_id=payload.report_id).all()
    chunk_dicts = [{"page_number": c.page_number, "source_text": c.source_text, "embedding": c.embedding} for c in chunks]

    top_chunks = rag_service.retrieve(payload.question, chunk_dicts, top_k=4)
    answer, model_used = llm_service.answer_question(payload.question, top_chunks, model=payload.model)
    grounded = len(top_chunks) > 0

    db.add(models.ChatMessage(report_id=payload.report_id, role="user", message=payload.question))
    db.add(models.ChatMessage(
        report_id=payload.report_id, role="assistant", message=answer,
        sources=[{"page_number": c["page_number"], "source_text": c["source_text"][:200]} for c in top_chunks],
        model_used=model_used,
    ))
    db.commit()

    return {
        "answer": answer,
        "sources": [{"page_number": c["page_number"], "source_text": c["source_text"]} for c in top_chunks],
        "grounded": grounded,
        "model_used": model_used,
    }


@router.get("/{report_id}/history")
def chat_history(report_id: str, db: Session = Depends(get_db)):
    messages = (
        db.query(models.ChatMessage)
        .filter_by(report_id=report_id)
        .order_by(models.ChatMessage.created_at.asc())
        .all()
    )
    return [{"role": m.role, "message": m.message, "sources": m.sources, "created_at": m.created_at} for m in messages]
