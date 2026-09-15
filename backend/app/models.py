import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Float, DateTime, ForeignKey, Text, Enum, JSON
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_id() -> str:
    return uuid.uuid4().hex[:12]


class ReportStatus(str, enum.Enum):
    uploaded = "uploaded"
    preprocessing = "preprocessing"
    ocr_processing = "ocr_processing"
    extracting = "extracting"
    analyzing = "analyzing"
    completed = "completed"
    failed = "failed"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False, default="Demo User")
    email = Column(String, unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    reports = relationship("Report", back_populates="user")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    filename = Column(String, nullable=False)
    stored_path = Column(String, nullable=False)
    report_type = Column(String, default="unknown")
    status = Column(Enum(ReportStatus), default=ReportStatus.uploaded)
    error_message = Column(Text, nullable=True)
    ocr_confidence = Column(Float, nullable=True)
    page_count = Column(Integer, default=0)
    table_count = Column(Integer, default=0)
    processing_ms = Column(Integer, nullable=True)
    upload_date = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reports")
    extracted_data = relationship("ExtractedData", back_populates="report", cascade="all, delete-orphan")
    analyses = relationship("Analysis", back_populates="report", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="report", cascade="all, delete-orphan")
    chunks = relationship("ReportChunk", back_populates="report", cascade="all, delete-orphan")
    ocr_blocks = relationship("OcrBlock", back_populates="report", cascade="all, delete-orphan")
    tables = relationship("ExtractedTable", back_populates="report", cascade="all, delete-orphan")


class OcrBlock(Base):
    __tablename__ = "ocr_blocks"

    id = Column(String, primary_key=True, default=gen_id)
    report_id = Column(String, ForeignKey("reports.id"), nullable=False)
    page_number = Column(Integer, default=1)
    text = Column(Text, default="")
    bbox = Column(JSON, nullable=True)  # [x0, y0, x1, y1]
    confidence = Column(Float, default=1.0)

    report = relationship("Report", back_populates="ocr_blocks")


class ExtractedData(Base):
    __tablename__ = "extracted_data"

    id = Column(String, primary_key=True, default=gen_id)
    report_id = Column(String, ForeignKey("reports.id"), nullable=False)
    parameter = Column(String, nullable=False)
    value = Column(Float, nullable=True)
    raw_value = Column(String, nullable=True)
    unit = Column(String, nullable=True)
    reference_min = Column(Float, nullable=True)
    reference_max = Column(Float, nullable=True)
    confidence = Column(Float, default=1.0)
    page_number = Column(Integer, default=1)
    is_outside_range = Column(Integer, default=0)  # 0/1 boolean flag

    report = relationship("Report", back_populates="extracted_data")


class ExtractedTable(Base):
    __tablename__ = "extracted_tables"

    id = Column(String, primary_key=True, default=gen_id)
    report_id = Column(String, ForeignKey("reports.id"), nullable=False)
    page_number = Column(Integer, default=1)
    name = Column(String, default="Table")
    rows = Column(JSON, default=list)  # list of dicts
    raw_text = Column(Text, nullable=True)

    report = relationship("Report", back_populates="tables")


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String, primary_key=True, default=gen_id)
    report_id = Column(String, ForeignKey("reports.id"), nullable=False)
    summary = Column(Text, nullable=True)
    key_findings = Column(JSON, default=list)
    outside_reference_ranges = Column(JSON, default=list)
    missing_or_uncertain_fields = Column(JSON, default=list)
    professional_review_items = Column(JSON, default=list)
    model_used = Column(String, nullable=True)  # OpenRouter model slug, e.g. "openai/gpt-4o"
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report", back_populates="analyses")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=gen_id)
    report_id = Column(String, ForeignKey("reports.id"), nullable=False)
    role = Column(String, nullable=False)  # "user" | "assistant"
    message = Column(Text, nullable=False)
    sources = Column(JSON, default=list)  # [{page_number, source_text}]
    model_used = Column(String, nullable=True)  # OpenRouter model slug used for assistant replies
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report", back_populates="chat_messages")


class ReportChunk(Base):
    __tablename__ = "report_chunks"

    id = Column(String, primary_key=True, default=gen_id)
    report_id = Column(String, ForeignKey("reports.id"), nullable=False)
    page_number = Column(Integer, default=1)
    chunk_index = Column(Integer, default=0)
    source_text = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=True)  # stored as list[float] for portability

    report = relationship("Report", back_populates="chunks")
