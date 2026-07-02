from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.db_models import Document, ChatSession, ChatMessage
from app.models.schemas import ChatRequest, ChatResponse, ChatSessionOut
from app.services.vector_store import retrieve_relevant_chunks
from app.services.llm_service import answer_legal_question
from typing import List
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/session/{document_id}", response_model=ChatSessionOut, status_code=201)
async def create_session(
    document_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "ready":
        raise HTTPException(
            status_code=400,
            detail=f"Document not ready yet. Status: {doc.status}"
        )

    session = ChatSession(document_id=document_id)
    db.add(session)
    await db.commit()

    # Reload with messages explicitly loaded — prevents MissingGreenlet error
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.id == session.id)
        .options(selectinload(ChatSession.messages))
    )
    session = result.scalar_one()
    return session


@router.get("/session/{session_id}", response_model=ChatSessionOut)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.id == session_id)
        .options(selectinload(ChatSession.messages))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/sessions/{document_id}", response_model=List[ChatSessionOut])
async def list_sessions(
    document_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.document_id == document_id)
        .options(selectinload(ChatSession.messages))
        .order_by(ChatSession.created_at.desc())
    )
    return result.scalars().all()


@router.post("/ask", response_model=ChatResponse)
async def ask_question(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.id == request.session_id)
        .options(selectinload(ChatSession.messages))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_msg = ChatMessage(
        session_id=request.session_id,
        role="user",
        content=request.message,
    )
    db.add(user_msg)
    await db.commit()

    try:
        chunks = retrieve_relevant_chunks(
            document_id=session.document_id,
            query=request.message,
            top_k=5,
        )
    except Exception as e:
        logger.error(f"Vector retrieval failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve context")

    if not chunks:
        raise HTTPException(
            status_code=404,
            detail="No relevant content found for your question."
        )

    try:
        answer, tokens_used = answer_legal_question(
            question=request.message,
            context_chunks=chunks,
        )
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        raise HTTPException(status_code=502, detail=f"AI model error: {str(e)}")

    sources = [
        {
            "text": c["text"][:300],
            "page_number": c["page_number"],
            "score": c["score"],
        }
        for c in chunks
    ]

    assistant_msg = ChatMessage(
        session_id=request.session_id,
        role="assistant",
        content=answer,
        sources=sources,
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    logger.info(f"Answer generated — tokens: {tokens_used}")

    return ChatResponse(
        message_id=assistant_msg.id,
        answer=answer,
        sources=sources,
        session_id=request.session_id,
    )


@router.delete("/session/{session_id}", status_code=204)
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.delete(session)
    await db.commit()
    logger.info(f"Session deleted: {session_id}")