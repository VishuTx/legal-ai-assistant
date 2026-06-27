from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import init_db
from app.services.vector_store import get_embedding_model
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ───────────────────────────────────────────────────
    logger.info("Starting Legal AI backend...")
    settings.create_dirs()          # create uploads/ and chroma_db/ if missing
    await init_db()                 # create SQLite tables
    get_embedding_model()           # load sentence-transformer model into memory now
    logger.info("Ready.")
    yield
    # ── Shutdown ──────────────────────────────────────────────────
    logger.info("Shutting down.")


app = FastAPI(
    title="Legal AI Assistant",
    description="AI-powered contract review, redlining, and legal Q&A",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS — allow React frontend (localhost:3000 in dev) ──────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health check ─────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "app": settings.app_name}

# ── Routers (uncomment each as you build them) ───────────────────

# ── Routers (uncomment each as you build them) ───────────────────
from app.api.routes import documents
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
# from app.api.routes import analysis, chat

from app.api.routes import documents, analysis, chat
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(analysis.router, prefix="/api/analysis",  tags=["analysis"])
app.include_router(chat.router,     prefix="/api/chat",      tags=["chat"])

# app.include_router(analysis.router, prefix="/api/analysis",  tags=["analysis"])
# app.include_router(chat.router,     prefix="/api/chat",      tags=["chat"])

# from app.api.routes import documents, analysis, chat
# app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
# app.include_router(analysis.router, prefix="/api/analysis",  tags=["analysis"])
# app.include_router(chat.router,     prefix="/api/chat",      tags=["chat"])
