import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Optional
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Singleton pattern — load the embedding model once at startup (it's ~90MB)
_embedding_model: Optional[SentenceTransformer] = None
_chroma_client: Optional[chromadb.PersistentClient] = None


def get_embedding_model() -> SentenceTransformer:
    global _embedding_model
    if _embedding_model is None:
        logger.info(f"Loading embedding model: {settings.embedding_model}")
        _embedding_model = SentenceTransformer(settings.embedding_model)
        logger.info("Embedding model loaded.")
    return _embedding_model


def get_chroma_client() -> chromadb.PersistentClient:
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(
            path=str(settings.chroma_dir),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _chroma_client


def get_collection(document_id: str) -> chromadb.Collection:
    """Each document gets its own Chroma collection for isolation."""
    client = get_chroma_client()
    # Chroma collection names must be alphanumeric + hyphens
    collection_name = f"doc_{document_id.replace('-', '_')}"
    return client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )


def embed_and_store(document_id: str, chunks: List[Dict]) -> int:
    """
    Embed all chunks and store in Chroma.
    Returns number of chunks stored.
    """
    model = get_embedding_model()
    collection = get_collection(document_id)

    texts = [c["text"] for c in chunks]
    metadatas = [
        {
            "page_number": c["page_number"],
            "chunk_index": c["chunk_index"],
            "document_id": document_id,
        }
        for c in chunks
    ]
    ids = [f"{document_id}_{c['chunk_index']}" for c in chunks]

    logger.info(f"Embedding {len(texts)} chunks for document {document_id}")
    embeddings = model.encode(texts, show_progress_bar=False).tolist()

    # Upsert in batches to avoid memory spikes on large docs
    batch_size = 100
    for i in range(0, len(texts), batch_size):
        collection.upsert(
            ids=ids[i:i+batch_size],
            embeddings=embeddings[i:i+batch_size],
            documents=texts[i:i+batch_size],
            metadatas=metadatas[i:i+batch_size],
        )

    logger.info(f"Stored {len(texts)} chunks for document {document_id}")
    return len(texts)


def retrieve_relevant_chunks(
    document_id: str,
    query: str,
    top_k: int = 5,
) -> List[Dict]:
    """
    Semantic search over a document's chunks.
    Returns list of {text, page_number, score} sorted by relevance.
    """
    model = get_embedding_model()
    collection = get_collection(document_id)

    query_embedding = model.encode([query]).tolist()

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(top_k, collection.count()),
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    for i, doc in enumerate(results["documents"][0]):
        chunks.append({
            "text": doc,
            "page_number": results["metadatas"][0][i].get("page_number", 0),
            "score": round(1 - results["distances"][0][i], 4),  # cosine → similarity
        })

    return chunks


def delete_document_vectors(document_id: str):
    """Remove all vectors when a document is deleted."""
    client = get_chroma_client()
    collection_name = f"doc_{document_id.replace('-', '_')}"
    try:
        client.delete_collection(collection_name)
    except Exception:
        pass
