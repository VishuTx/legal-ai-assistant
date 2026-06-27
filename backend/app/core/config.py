from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # App
    app_name: str = "Legal AI Assistant"
    debug: bool = True
    secret_key: str = "change-in-production"

    # Groq
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    groq_model_fast: str = "llama3-8b-8192"

    # Storage
    upload_dir: Path = Path("./uploads")
    chroma_dir: Path = Path("./chroma_db")
    database_url: str = "sqlite+aiosqlite:///./legal_ai.db"

    # Chunking — tuned for legal documents
    chunk_size: int = 1000
    chunk_overlap: int = 200

    # Embedding model (local, no API cost)
    embedding_model: str = "all-MiniLM-L6-v2"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def create_dirs(self):
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.chroma_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()
