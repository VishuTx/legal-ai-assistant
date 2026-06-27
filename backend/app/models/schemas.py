from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


# ── Document schemas ──────────────────────────────────────────────

class DocumentOut(BaseModel):
    id: str
    filename: str
    original_name: str
    file_type: str
    file_size: int
    status: str
    page_count: int
    chunk_count: int
    upload_at: datetime

    class Config:
        from_attributes = True


# ── Contract analysis schemas ─────────────────────────────────────

class ClauseRisk(BaseModel):
    clause_type: str
    excerpt: str
    risk_level: str          # high | medium | low
    explanation: str
    page_number: Optional[int] = None
    recommendation: str


class ContractSummary(BaseModel):
    contract_type: str
    parties: List[str]
    effective_date: Optional[str]
    term_duration: Optional[str]
    governing_law: Optional[str]
    key_obligations: List[str]
    overall_risk: str        # high | medium | low
    risk_score: float        # 0.0 - 10.0
    flagged_clauses: List[ClauseRisk]
    missing_standard_clauses: List[str]
    executive_summary: str


class RedlineItem(BaseModel):
    clause_type: str
    original_text: str
    suggested_text: str
    reason: str
    priority: str            # must-have | recommended | optional


class RedlineReport(BaseModel):
    document_id: str
    total_redlines: int
    must_have_changes: int
    redlines: List[RedlineItem]
    negotiation_summary: str


class AnalysisRequest(BaseModel):
    document_id: str
    analysis_type: str = Field(default="full", pattern="^(full|risk|redline|summary)$")
    playbook_context: Optional[str] = None   # optional custom playbook instructions


# ── Chat schemas ──────────────────────────────────────────────────

class ChatMessageOut(BaseModel):
    id: str
    role: str
    content: str
    sources: Optional[List[dict]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionOut(BaseModel):
    id: str
    document_id: str
    created_at: datetime
    messages: List[ChatMessageOut] = []

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    message_id: str
    answer: str
    sources: List[dict]      # [{text, page, score}]
    session_id: str
