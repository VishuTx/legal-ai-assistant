# L-SF — AI Legal Research Assistant

> Contract review, redlining and legal Q&A — grounded in the documents, cited to the page.

---

## Overview

L-SF is a full-stack AI-powered legal research platform built for lawyers, law students and in-house legal teams. Upload a contract or legal document and the system analyses every clause, flags risks with severity levels, generates redline suggestions, answers questions about the document with page-cited responses, and searches Indian case law for relevant precedents.

Built on a production-grade RAG (Retrieval-Augmented Generation) architecture — not a tutorial wrapper. Every answer is grounded in retrieved document content, never hallucinated.

---

## Features

### Contract Review
- **Risk Analysis** — extracts contract type, parties, governing law, term, key obligations. Scores overall risk 0–10 with flagged clauses, severity levels (high/medium/low), and clause-by-clause recommendations
- **Redlining** — generates original vs. proposed text for every problematic clause, with legal justification and priority classification (must-have / recommended / optional)
- **Missing Clause Detection** — identifies standard protections absent from the document

### Legal Q&A
- Conversational Q&A grounded in the uploaded document
- Every answer cites the exact page number it was retrieved from
- Multi-turn chat sessions with full history persistence
- Simulated streaming response reveal on the frontend

### Indian Case Law Search
- Searches Indian court judgments via kanoon.dev API
- Semantic re-ranking of results using cosine similarity — not keyword matching
- LLM-generated relevance summaries explaining *why* each case applies
- Binding status classification (Supreme Court binding vs. High Court persuasive)
- Clause-to-case mapping — find precedents for any flagged contract clause
- Filter by court: Supreme Court, Delhi, Bombay, Calcutta, Madras, Allahabad, and more

### Production Engineering
- Per-document ChromaDB vector collections with cosine similarity search
- Legal-aware chunking — splits at ARTICLE, Section, CLAUSE boundaries to preserve clause integrity
- Background document processing — upload returns immediately, embedding runs async
- Analysis caching — repeat analysis requests return instantly without calling the LLM
- Stuck document recovery — server restart resets processing-state documents automatically
- Magic bytes file validation — rejects malicious files regardless of extension
- Detailed health endpoint reporting DB, vector store, and embedding model status

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              React Frontend                  │
│   Library · Dossier · Consultation · Cases   │
└─────────────────┬───────────────────────────┘
                  │ HTTP / REST
┌─────────────────▼───────────────────────────┐
│              FastAPI Backend                 │
│  /documents  /analysis  /chat  /cases        │
└──────┬──────────┬──────────┬────────────────┘
       │          │          │
┌──────▼──┐ ┌────▼────┐ ┌───▼──────────────┐
│Document │ │Contract │ │   RAG Pipeline   │
│Pipeline │ │Analyser │ │retrieve → answer │
│extract  │ │redline  │ │                  │
│chunk    │ │risk     │ └───────┬──────────┘
└──────┬──┘ └────┬────┘        │
       │         │             │
┌──────▼─────────▼─────────────▼──────────────┐
│                 Services                     │
│  ChromaDB  ·  SQLite  ·  sentence-transformers│
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│              Groq API (free tier)             │
│   llama-3.3-70b-versatile (analysis)         │
│   llama-3.1-8b-instant (chat Q&A)            │
└──────────────────────────────────────────────┘
```

### RAG Pipeline

```
Upload PDF/DOCX
      ↓
PyMuPDF extracts text — page boundaries preserved
      ↓
RecursiveCharacterTextSplitter chunks at legal separators
(ARTICLE → Section → CLAUSE → paragraph → line)
chunk_size=1000, overlap=200
      ↓
sentence-transformers (all-MiniLM-L6-v2) embeds each chunk
100% local — zero API cost
      ↓
ChromaDB stores vectors + metadata (page_number, chunk_index)
per-document isolated collection
      ↓
Query → embed → cosine similarity search → top-5 chunks
      ↓
Groq LLM generates answer grounded in retrieved chunks
      ↓
Answer returned with page citations
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | FastAPI 0.111 + uvicorn |
| LLM inference | Groq API — LLaMA 3.3-70B + LLaMA 3.1-8B |
| Embeddings | sentence-transformers · all-MiniLM-L6-v2 (local) |
| Vector database | ChromaDB (persistent, per-document collections) |
| Relational database | SQLite + SQLAlchemy async + aiosqlite |
| PDF parsing | PyMuPDF (fitz) |
| DOCX parsing | python-docx |
| Chunking | langchain-text-splitters |
| Case law | kanoon.dev API + semantic re-ranking |
| HTTP client | httpx (async) |
| Frontend framework | Next.js 14 App Router + TypeScript |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion + Lenis smooth scroll |
| Fonts | Playfair Display · Cormorant Garamond · Jost |
| Deployment | Railway (backend) · Vercel (frontend) |

---

## Project Structure

```
legal-ai/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI entrypoint, lifespan, routers
│   │   ├── core/
│   │   │   ├── config.py               # Pydantic settings from .env
│   │   │   ├── database.py             # Async SQLAlchemy engine + session
│   │   │   └── startup.py              # Reset stuck documents on startup
│   │   ├── models/
│   │   │   ├── db_models.py            # Document, ContractAnalysis, ChatSession, ChatMessage
│   │   │   └── schemas.py              # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── document_processor.py   # PDF/DOCX extraction + legal-aware chunking
│   │   │   ├── vector_store.py         # ChromaDB embed/store/retrieve
│   │   │   ├── llm_service.py          # Groq API — analysis, redline, Q&A prompts
│   │   │   ├── cache.py                # Analysis result caching
│   │   │   ├── case_search.py          # kanoon.dev API + semantic re-ranking
│   │   │   └── case_analyser.py        # LLM relevance analysis for cases
│   │   ├── api/routes/
│   │   │   ├── documents.py            # Upload, list, get, delete
│   │   │   ├── analysis.py             # Contract analysis + redline
│   │   │   ├── chat.py                 # Sessions + RAG Q&A
│   │   │   ├── cases.py                # Case law search + clause mapping
│   │   │   └── health.py               # Detailed health check
│   │   └── utils/
│   │       ├── json_repair.py          # Fix malformed LLM JSON output
│   │       └── file_validator.py       # Magic bytes security check
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── app/
        │   ├── layout.tsx              # Font system + Lenis scroll wrapper
        │   ├── page.tsx                # Library — upload + document index
        │   ├── about/page.tsx          # Method page — dark editorial section
        │   └── documents/[id]/
        │       ├── page.tsx            # Dossier — analysis + redline tabs
        │       └── chat/page.tsx       # Consultation — RAG Q&A interface
        ├── components/
        │   ├── navbar.tsx              # Sticky transparent-to-opaque navbar
        │   ├── upload-dropzone.tsx     # Drag-and-drop file upload
        │   ├── document-row.tsx        # Editorial document list row
        │   ├── risk-score.tsx          # Signature animated risk numeral
        │   ├── clause-row.tsx          # Flagged clause with severity
        │   ├── redline-row.tsx         # Original vs proposed text diff
        │   ├── chat-message.tsx        # Q&A message with typewriter reveal
        │   ├── case-research-panel.tsx # Indian case law search UI
        │   ├── count-up.tsx            # Animated number count-up
        │   ├── reveal.tsx              # Scroll-triggered fade-up animation
        │   ├── status-tag.tsx          # Document processing status indicator
        │   └── smooth-scroll.tsx       # Lenis smooth scroll wrapper
        └── lib/
            └── api.ts                  # Typed API client for all endpoints
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Basic liveness check |
| GET | `/health/detailed` | DB · vector store · embedding model status |
| POST | `/api/documents/upload` | Upload PDF/DOCX — processing runs in background |
| GET | `/api/documents/` | List all documents with status |
| GET | `/api/documents/{id}` | Get document details and processing status |
| DELETE | `/api/documents/{id}` | Delete document + vectors + chat history |
| POST | `/api/analysis/analyse` | Run full analysis or redline generation |
| GET | `/api/analysis/history/{doc_id}` | All analyses run on a document |
| GET | `/api/analysis/result/{id}` | Fetch one specific analysis result |
| POST | `/api/chat/session/{doc_id}` | Create a new chat session |
| GET | `/api/chat/session/{session_id}` | Get session with message history |
| POST | `/api/chat/ask` | Ask a question — returns answer + page citations |
| DELETE | `/api/chat/session/{session_id}` | Delete session + messages |
| POST | `/api/cases/search` | Search Indian case law semantically |
| POST | `/api/cases/clause/{doc_id}` | Find cases for a specific contract clause |
| GET | `/api/cases/courts` | Available court filter options |

Full interactive documentation available at `/docs` (Swagger UI) when the backend is running.

---

## Local Setup

### Prerequisites

- Python 3.11
- Node.js 18+
- A [Groq API key](https://console.groq.com/keys) (free tier)
- A [kanoon.dev API key](https://kanoon.dev) (free tier, for case search)

### Backend

```bash
# Clone and navigate
git clone https://github.com/VishuTx/legal-ai-assistant.git
cd legal-ai-assistant/backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your API keys
```

**.env configuration:**

```env
GROQ_API_KEY=groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_MODEL_FAST=llama-3.1-8b-instant
KANOON_API_KEY=_kanoon_api_key_here
APP_NAME=Legal AI Assistant
DEBUG=true
SECRET_KEY=change-this-in-production
UPLOAD_DIR=./uploads
CHROMA_DIR=./chroma_db
DATABASE_URL=sqlite+aiosqlite:///./legal_ai.db
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

```bash
# Always run from the backend/ directory
cd backend
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000` — Swagger UI at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start dev server
npm run dev
```

Frontend runs at `http://localhost:3000`

---

## Key Engineering Decisions

**Why sentence-transformers over OpenAI embeddings?**
Zero API cost, runs fully offline, and all-MiniLM-L6-v2 provides strong semantic similarity for legal text. The model loads once at startup into memory and is reused for all embedding operations including case law re-ranking.

**Why legal-aware chunking separators?**
Standard character-count chunking splits clauses arbitrarily. A liability cap clause starting at character 990 of a 1000-character chunk becomes unreadable when split. Using `ARTICLE → Section → CLAUSE → paragraph` as separator priority means chunks align with legal document structure — a chunk is typically one complete clause, making retrieval significantly more accurate.

**Why per-document ChromaDB collections?**
Isolation. Searching for "termination clause" should only return results from the document the user is currently working with, not from every document ever uploaded. Per-collection isolation also makes deletion clean — dropping a document's collection removes all its vectors atomically.

**Why Groq over direct OpenAI?**
Groq runs LLaMA models on custom LPU hardware — significantly faster inference than GPU-based providers. The free tier provides enough capacity for serious development. LLaMA 3.3-70B at 70 billion parameters provides reasoning quality comparable to GPT-4-class models for structured legal analysis tasks.

**Why not LangChain?**
The RAG pipeline is three steps: retrieve → format → call LLM. A framework adds abstraction overhead without benefit at this complexity level. Building manually means every step is visible, debuggable Python — which matters when retrieval quality needs tuning or prompt formatting needs adjustment. `langchain-text-splitters` is used specifically for its `RecursiveCharacterTextSplitter` with custom separators — that one utility genuinely earns its place.

---

## What I Learned

Building this exposed several practical failure modes of RAG systems that tutorial implementations skip:

**Context window limits are an engineering problem, not a configuration knob.** The 12,000 TPM rate limit on Groq's free tier forced a real architectural decision — truncate at 30,000 characters or implement chunked analysis. Truncation is fast but incomplete. Chunked map-reduce is correct but requires merging partial results. The right answer depends on document size and use case.

**Retrieval quality is the bottleneck, not generation quality.** A 70B parameter model gives excellent answers when given the right chunks. It gives poor answers when retrieval surfaces irrelevant sections. Legal-aware chunking improved retrieval quality more than any prompt engineering change.

**Async SQLAlchemy has sharp edges.** The `MissingGreenlet` error from lazy-loading relationships after a session closes cost significant debugging time. The fix — `selectinload` on every query returning a model with relationships — is simple once understood, but non-obvious from the SQLAlchemy docs alone.

**Two database files is a real production risk.** Relative SQLite paths resolve to the working directory at startup. Running `uvicorn` from the wrong directory creates a second database file silently. The fix is trivially simple — always `cd backend` first — but the failure mode is completely invisible until data goes missing.

---

## Disclaimer

L-SF is a research and productivity tool. It does not constitute legal advice. All AI-generated analysis should be reviewed by a qualified legal professional before being relied upon.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">Built by <a href="https://github.com/VishuTx">Vishu</a> · MMMUT Gorakhpur · ECE (IoT) 2027</p>
