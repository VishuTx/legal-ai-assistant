from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.db_models import Document
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

STUCK_THRESHOLD_MINUTES = 10


async def reset_stuck_documents(db: AsyncSession) -> int:
    """
    Find documents stuck in 'processing' status for too long
    (likely because the server restarted mid-task) and mark them 'error'
    so the user knows to re-upload instead of waiting forever.

    Returns the number of documents reset.
    """
    cutoff = datetime.utcnow() - timedelta(minutes=STUCK_THRESHOLD_MINUTES)

    result = await db.execute(
        select(Document)
        .where(Document.status == "processing")
        .where(Document.upload_at < cutoff)
    )
    stuck_docs = result.scalars().all()

    for doc in stuck_docs:
        doc.status = "error"
        logger.warning(f"Reset stuck document to 'error': {doc.id} ({doc.original_name})")

    if stuck_docs:
        await db.commit()

    return len(stuck_docs)