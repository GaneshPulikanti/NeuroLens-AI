import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"

class Settings(BaseSettings):
    PROJECT_NAME: str = "NeuroLens AI"
    PROJECT_SUBTITLE: str = "ROI-Based Brain MRI Analysis for Aphasia-Related Language Impairment Prediction"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DEBUG: bool = True

    # Storage paths
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = DATA_DIR
    STUDIES_DIR: Path = DATA_DIR / "studies"
    MODELS_DIR: Path = DATA_DIR / "models"
    ARC_DIR: Path = DATA_DIR / "arc"
    ISLES_DIR: Path = DATA_DIR / "isles"
    ATLAS_DIR: Path = DATA_DIR / "atlas"

    # Security & limits
    MAX_UPLOAD_SIZE_MB: int = 250
    ALLOWED_EXTENSIONS: set = {".nii", ".nii.gz", ".gz"}

    model_config = {
        "env_file": ".env",
        "extra": "allow",
    }

settings = Settings()

# Ensure directories exist
for folder in [
    settings.DATA_DIR,
    settings.STUDIES_DIR,
    settings.MODELS_DIR,
    settings.ARC_DIR,
    settings.ISLES_DIR,
    settings.ATLAS_DIR,
]:
    folder.mkdir(parents=True, exist_ok=True)
