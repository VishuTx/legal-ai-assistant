from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.db_models import ContractAnalysis
from typing import Optional


async def get_cached_analysis(
    db: AsyncSession,
    document_id: str,
    analysis_type: str,
) -> Optional[ContractAnalysis]:
    """
    Check if an analysis of this type already exists for this document.
    Returns the existing record if found, None otherwise.
    Saves a Groq API call (and tokens) on repeated requests.
    """
    result = await db.execute(
        select(ContractAnalysis)
        .where(ContractAnalysis.document_id == document_id)
        .where(ContractAnalysis.analysis_type == analysis_type)
        .order_by(ContractAnalysis.created_at.desc())
    )
    return result.scalars().first()