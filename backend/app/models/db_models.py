from sqlalchemy import Column, String, DateTime, Text, Integer, Float, ForeignKey, JSON
from sqlalchemy.orm import DeclarativeBase, relationship
from datetime import datetime
import uuid


class Base(DeclarativeBase):
    pass


def new_uuid() -> str:
    return str(uuid.uuid4())


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=new_uuid)
    filename = Column(String, nullable=False)
    original_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)       # pdf, docx
    file_size = Column(Integer, nullable=False)      # bytes
    status = Column(String, default="processing")   # processing | ready | error
    page_count = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    upload_at = Column(DateTime, default=datetime.utcnow)

    analyses = relationship("ContractAnalysis", back_populates="document", cascade="all, delete")
    chat_sessions = relationship("ChatSession", back_populates="document", cascade="all, delete")


class ContractAnalysis(Base):
    __tablename__ = "contract_analyses"

    id = Column(String, primary_key=True, default=new_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    analysis_type = Column(String, nullable=False)  # full | clause | risk
    result = Column(JSON, nullable=False)           # structured JSON output
    model_used = Column(String, nullable=False)
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="analyses")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=new_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete", order_by="ChatMessage.created_at")
    document = relationship("Document", back_populates="chat_sessions")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=new_uuid)
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String, nullable=False)           # user | assistant
    content = Column(Text, nullable=False)
    sources = Column(JSON, nullable=True)           # cited chunks with page numbers
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")
