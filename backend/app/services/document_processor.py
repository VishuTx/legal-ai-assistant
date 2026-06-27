import fitz  # PyMuPDF
import docx
from pathlib import Path
from typing import List, Dict
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import settings
import re


LEGAL_SEPARATORS = [
    # Legal document structure — most specific first
    "\nARTICLE ",
    "\nSection ",
    "\nCLAUSE ",
    "\n\nWHEREAS",
    "\n\nNOW, THEREFORE",
    "\n\nIN WITNESS WHEREOF",
    "\n\n\n",
    "\n\n",
    "\n",
    " ",
    "",
]


def extract_text_from_pdf(file_path: Path) -> List[Dict]:
    """
    Extract text from PDF, returning list of {text, page_number} dicts.
    Preserves page boundaries so to cite page numbers in responses.
    """
    pages = []
    doc = fitz.open(str(file_path))

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")

        # Clean up common PDF extraction artifacts
        text = re.sub(r'\s+', ' ', text).strip()
        text = re.sub(r'(\w)-\s+(\w)', r'\1\2', text)  # fix hyphenated line breaks

        if text:
            pages.append({
                "text": text,
                "page_number": page_num + 1,
            })

    doc.close()
    return pages


def extract_text_from_docx(file_path: Path) -> List[Dict]:
    """Extract text from DOCX, treating each paragraph as a logical unit."""
    doc = docx.Document(str(file_path))
    pages = []
    current_text = []
    pseudo_page = 1

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        current_text.append(text)

        # Every ~50 paragraphs = pseudo page (DOCX has no real page boundaries)
        if len(current_text) >= 50:
            pages.append({
                "text": "\n".join(current_text),
                "page_number": pseudo_page,
            })
            current_text = []
            pseudo_page += 1

    if current_text:
        pages.append({
            "text": "\n".join(current_text),
            "page_number": pseudo_page,
        })

    return pages


def chunk_document(pages: List[Dict]) -> List[Dict]:
    """
    Chunk document pages into smaller pieces for embedding.
    Each chunk retains its page_number and chunk_index metadata.
    """
    splitter = RecursiveCharacterTextSplitter(
        separators=LEGAL_SEPARATORS,
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        length_function=len,
    )

    chunks = []
    chunk_index = 0

    for page in pages:
        page_chunks = splitter.split_text(page["text"])
        for chunk_text in page_chunks:
            chunk_text = chunk_text.strip()
            if len(chunk_text) < 50:   # skip tiny fragments
                continue
            chunks.append({
                "text": chunk_text,
                "page_number": page["page_number"],
                "chunk_index": chunk_index,
            })
            chunk_index += 1

    return chunks


def extract_and_chunk(file_path: Path, file_type: str) -> tuple[List[Dict], int]:
    """
    Full pipeline: extract → chunk.
    Returns (chunks, page_count).
    """
    if file_type == "pdf":
        pages = extract_text_from_pdf(file_path)
    elif file_type in ("docx", "doc"):
        pages = extract_text_from_docx(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

    page_count = len(pages)
    chunks = chunk_document(pages)
    return chunks, page_count
