import os
import re
import uuid
from pathlib import Path
from fastapi import HTTPException
from app.core.config import settings

def generate_study_id() -> str:
    """Generate a clean, sanitized study identifier."""
    return f"study_{uuid.uuid4().hex[:12]}"

def sanitize_filename(filename: str) -> str:
    """Sanitize uploaded filenames to prevent directory traversal or script execution."""
    filename = os.path.basename(filename)
    filename = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', filename)
    return filename

def validate_filepath(path: Path, base_dir: Path) -> bool:
    """Ensure path stays strictly within the intended directory (prevent path traversal)."""
    try:
        resolved_path = path.resolve()
        resolved_base = base_dir.resolve()
        return resolved_path.is_relative_to(resolved_base)
    except Exception:
        return False

def validate_mri_extension(filename: str) -> bool:
    """Verify file has an acceptable NIfTI extension."""
    lower = filename.lower()
    return lower.endswith(".nii") or lower.endswith(".nii.gz")
