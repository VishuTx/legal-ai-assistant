from fastapi import HTTPException

# Magic bytes — the first few bytes of a file that identify its real type,
# regardless of what extension the filename claims to have.
MAGIC_BYTES = {
    "pdf": [b"%PDF"],
    "docx": [b"PK\x03\x04"],   # DOCX is a ZIP archive
    "doc": [b"PK\x03\x04", b"\xd0\xcf\x11\xe0"],  # old .doc format has different signature
}


def validate_file_bytes(content: bytes, declared_ext: str) -> None:
    """
    Verify the file's actual binary content matches its claimed extension.
    Prevents someone uploading a malicious file renamed to .pdf or .docx.
    Raises HTTPException 400 if mismatch.
    """
    if declared_ext not in MAGIC_BYTES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {declared_ext}")

    valid_signatures = MAGIC_BYTES[declared_ext]
    header = content[:8]

    if not any(header.startswith(sig) for sig in valid_signatures):
        raise HTTPException(
            status_code=400,
            detail=f"File content does not match declared type '{declared_ext}'. "
                   f"The file may be corrupted or mislabeled."
        )