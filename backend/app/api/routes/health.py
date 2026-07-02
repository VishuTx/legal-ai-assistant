from fastapi import APIRouter
from app.services.vector_store import get_chroma_client, get_embedding_model
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/detailed")
async def detailed_health():
    """
    Reports the status of every dependency the system relies on.
    Use this for deployment monitoring / uptime checks.
    """
    status = {
        "app": settings.app_name,
        "database": "unknown",
        "vector_store": "unknown",
        "embedding_model": "unknown",
        "groq_configured": bool(settings.groq_api_key and settings.groq_api_key != "your_groq_api_key_here"),
    }

    # Check database
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        status["database"] = "ok"
    except Exception as e:
        status["database"] = f"error: {str(e)}"

    # Check Chroma
    try:
        client = get_chroma_client()
        collections = client.list_collections()
        status["vector_store"] = "ok"
        status["vector_store_collections"] = len(collections)
    except Exception as e:
        status["vector_store"] = f"error: {str(e)}"

    # Check embedding model
    try:
        model = get_embedding_model()
        status["embedding_model"] = "ok" if model else "not loaded"
    except Exception as e:
        status["embedding_model"] = f"error: {str(e)}"

    overall = "healthy" if all(
        v == "ok" for k, v in status.items()
        if k in ("database", "vector_store", "embedding_model")
    ) else "degraded"

    return {"overall_status": overall, **status}