from datetime import datetime
from typing import Optional, List, Any

from pydantic import BaseModel, ConfigDict


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    report_type: str
    status: str
    error_message: Optional[str] = None
    ocr_confidence: Optional[float] = None
    page_count: int
    table_count: int
    processing_ms: Optional[int] = None
    upload_date: datetime


class ExtractedFieldOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    parameter: str
    value: Optional[float]
    raw_value: Optional[str]
    unit: Optional[str]
    reference_min: Optional[float]
    reference_max: Optional[float]
    confidence: float
    page_number: int
    is_outside_range: int


class ExtractedTableOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    page_number: int
    name: str
    rows: List[Any]


class ReportDataOut(BaseModel):
    report: ReportOut
    fields: List[ExtractedFieldOut]
    tables: List[ExtractedTableOut]


class AnalysisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    summary: Optional[str]
    key_findings: List[Any]
    outside_reference_ranges: List[Any]
    missing_or_uncertain_fields: List[Any]
    professional_review_items: List[Any]
    model_used: Optional[str] = None
    created_at: datetime


class AnalysisRequest(BaseModel):
    model: Optional[str] = None  # OpenRouter model slug override, e.g. "openai/gpt-4o"


class CompareRequest(BaseModel):
    report_ids: List[str]
    model: Optional[str] = None


class CompareParameterTrend(BaseModel):
    parameter: str
    unit: Optional[str] = None
    points: List[dict]  # [{report_id, date, value, in_range}]


class CompareResponse(BaseModel):
    parameters: List[CompareParameterTrend]
    ai_comparison: Optional[str] = None
    model_used: Optional[str] = None


class ChatRequest(BaseModel):
    report_id: str
    question: str
    model: Optional[str] = None


class ChatSource(BaseModel):
    page_number: int
    source_text: str


class ChatResponse(BaseModel):
    answer: str
    sources: List[ChatSource]
    grounded: bool
    model_used: Optional[str] = None


class ModelInfo(BaseModel):
    id: str
    name: str


class ModelsResponse(BaseModel):
    default_model: str
    models: List[ModelInfo]
