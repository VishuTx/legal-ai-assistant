from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.db_models import Document, ContractAnalysis
from app.models.schemas import AnalysisRequest, ContractSummary, RedlineReport
from app.services.llm_service import analyse_contract, generate_redlines
from app.core.config import settings
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


def get_full_text(document_id: str) -> str:
    """
    Read the uploaded file from disk and return raw text.
    Used for full-document analysis (not RAG — we send everything to the LLM).
    """
    from app.services.document_processor import extract_and_chunk
    from pathlib import Path
    import os

    # Find the file in uploads dir
    upload_dir = settings.upload_dir
    for fname in os.listdir(upload_dir):
        if fname.startswith(document_id):
            file_path = upload_dir / fname
            ext = fname.rsplit(".", 1)[-1].lower()
            chunks, _ = extract_and_chunk(file_path, ext)
            # Join all chunks back into full text for analysis
            return "\n\n".join(c["text"] for c in chunks)

    raise FileNotFoundError(f"File for document {document_id} not found on disk")


@router.post("/analyse", response_model=dict)
async def analyse_document(
    request: AnalysisRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Run full contract analysis on an uploaded document.
    Returns: contract type, parties, risk score, flagged clauses, missing clauses.
    """
    # Check document exists and is ready
    result = await db.execute(
        select(Document).where(Document.id == request.document_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "ready":
        raise HTTPException(
            status_code=400,
            detail=f"Document is not ready yet. Current status: {doc.status}"
        )

    try:
        full_text = get_full_text(request.document_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    logger.info(f"Running contract analysis on document {request.document_id}")

    try:
        if request.analysis_type == "redline":
            result_data = generate_redlines(
                full_text,
                playbook_context=request.playbook_context or "",
            )
            analysis_type = "redline"
        else:
            # full / risk / summary all use the same analysis call
            result_data = analyse_contract(full_text)
            analysis_type = request.analysis_type

    except json.JSONDecodeError as e:
        logger.error(f"LLM returned invalid JSON: {e}")
        raise HTTPException(
            status_code=502,
            detail="AI model returned malformed response. Please retry."
        )
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    # Save analysis result to DB
    tokens_used = result_data.pop("_tokens_used", 0)
    model_used = result_data.pop("_model", settings.groq_model)

    analysis_record = ContractAnalysis(
        document_id=request.document_id,
        analysis_type=analysis_type,
        result=result_data,
        model_used=model_used,
        tokens_used=tokens_used,
    )
    db.add(analysis_record)
    await db.commit()

    logger.info(
        f"Analysis complete — type: {analysis_type}, "
        f"tokens: {tokens_used}, model: {model_used}"
    )

    return {
        "analysis_id": analysis_record.id,
        "document_id": request.document_id,
        "analysis_type": analysis_type,
        "model_used": model_used,
        "tokens_used": tokens_used,
        "result": result_data,
    }


@router.get("/history/{document_id}")
async def get_analysis_history(
    document_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return all past analyses run on a document."""
    result = await db.execute(
        select(ContractAnalysis)
        .where(ContractAnalysis.document_id == document_id)
        .order_by(ContractAnalysis.created_at.desc())
    )
    analyses = result.scalars().all()

    return [
        {
            "analysis_id": a.id,
            "analysis_type": a.analysis_type,
            "model_used": a.model_used,
            "tokens_used": a.tokens_used,
            "created_at": a.created_at,
            "result": a.result,
        }
        for a in analyses
    ]


@router.get("/result/{analysis_id}")
async def get_analysis_result(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Fetch a specific analysis result by its ID."""
    result = await db.execute(
        select(ContractAnalysis).where(ContractAnalysis.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return {
        "analysis_id": analysis.id,
        "document_id": analysis.document_id,
        "analysis_type": analysis.analysis_type,
        "model_used": analysis.model_used,
        "tokens_used": analysis.tokens_used,
        "created_at": analysis.created_at,
        "result": analysis.result,
    }