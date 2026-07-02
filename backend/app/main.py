from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import init_db, AsyncSessionLocal
from app.services.vector_store import get_embedding_model
from app.core.startup import reset_stuck_documents
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Legal AI backend...")
    settings.create_dirs()
    await init_db()
    get_embedding_model()
    async with AsyncSessionLocal() as db:
        reset_count = await reset_stuck_documents(db)
        if reset_count:
            logger.warning(f"Reset {reset_count} stuck document(s) to 'error' status")
    logger.info("Ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="Legal AI Assistant",
    description="AI-powered contract review, redlining, and legal Q&A",
    version="0.1.0",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Basic health ──────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "app": settings.app_name}

# ── Debug (remove after chat is confirmed working) ────────────────
@app.get("/debug/check/{doc_id}")
async def debug_check(doc_id: str):
    from app.models.db_models import Document
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Document).where(Document.id == doc_id))
        doc = result.scalar_one_or_none()
        if doc:
            return {"found": True, "status": doc.status, "name": doc.original_name}
        all_result = await db.execute(select(Document.id, Document.original_name))
        all_docs = [{"id": str(r[0]), "name": r[1]} for r in all_result.fetchall()]
        return {"found": False, "all_documents_in_db": all_docs}

# ── Routers ───────────────────────────────────────────────────────
from app.api.routes import documents, analysis, chat
from app.api.routes import health as health_router

app.include_router(documents.router,     prefix="/api/documents", tags=["documents"])
app.include_router(analysis.router,      prefix="/api/analysis",  tags=["analysis"])
app.include_router(chat.router,          prefix="/api/chat",      tags=["chat"])
app.include_router(health_router.router, prefix="/health",        tags=["health"])