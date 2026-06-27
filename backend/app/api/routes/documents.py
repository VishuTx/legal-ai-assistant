from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.db_models import Document
from app.models.schemas import DocumentOut
from app.services.document_processor import extract_and_chunk
from app.services.vector_store import embed_and_store, delete_document_vectors
from app.core.config import settings
from typing import List
import shutil
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_EXTENSIONS = {"pdf", "docx", "doc"}
MAX_FILE_SIZE_MB = 20


def get_file_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


async def process_document_background(
    document_id: str,
    file_path: str,
    file_type: str,
    db_url: str,
):
    """
    Runs after upload response is returned.
    Extracts text, chunks it, embeds and stores in Chroma.
    Updates document status in DB when done.
    """
    from app.core.database import AsyncSessionLocal
    from pathlib import Path

    async with AsyncSessionLocal() as db:
        try:
            chunks, page_count = extract_and_chunk(Path(file_path), file_type)
            chunk_count = embed_and_store(document_id, chunks)

            result = await db.execute(
                select(Document).where(Document.id == document_id)
            )
            doc = result.scalar_one_or_none()
            if doc:
                doc.status = "ready"
                doc.page_count = page_count
                doc.chunk_count = chunk_count
                await db.commit()
                logger.info(f"Document {document_id} processed: {page_count} pages, {chunk_count} chunks")

        except Exception as e:
            logger.error(f"Error processing document {document_id}: {e}")
            result = await db.execute(
                select(Document).where(Document.id == document_id)
            )
            doc = result.scalar_one_or_none()
            if doc:
                doc.status = "error"
                await db.commit()


@router.post("/upload", response_model=DocumentOut, status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a PDF or DOCX legal document.
    Processing (chunking + embedding) happens in the background.
    Document status starts as 'processing' and becomes 'ready' when done.
    """
    # Validate extension
    ext = get_file_extension(file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {ALLOWED_EXTENSIONS}"
        )

    # Validate file size
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f} MB). Max allowed: {MAX_FILE_SIZE_MB} MB"
        )

    # Save to disk
    document_id = str(uuid.uuid4())
    filename = f"{document_id}.{ext}"
    file_path = settings.upload_dir / filename

    with open(file_path, "wb") as f:
        f.write(content)

    # Save record to DB with status = processing
    doc = Document(
        id=document_id,
        filename=filename,
        original_name=file.filename or filename,
        file_type=ext,
        file_size=len(content),
        status="processing",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Kick off background processing
    background_tasks.add_task(
        process_document_background,
        document_id=document_id,
        file_path=str(file_path),
        file_type=ext,
        db_url=settings.database_url,
    )

    logger.info(f"Document uploaded: {file.filename} → {document_id}")
    return doc


@router.get("/", response_model=List[DocumentOut])
async def list_documents(db: AsyncSession = Depends(get_db)):
    """Return all uploaded documents, newest first."""
    result = await db.execute(
        select(Document).order_by(Document.upload_at.desc())
    )
    return result.scalars().all()


@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(document_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single document's details and processing status."""
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/{document_id}", status_code=204)
async def delete_document(document_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a document, its file, and all its vectors from Chroma."""
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete file from disk
    file_path = settings.upload_dir / doc.filename
    if file_path.exists():
        file_path.unlink()

    # Delete vectors from Chroma
    delete_document_vectors(document_id)

    # Delete DB record (cascades to analyses + chat sessions)
    await db.delete(doc)
    await db.commit()

    logger.info(f"Document deleted: {document_id}")