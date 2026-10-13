from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.router import router as api_router
from app.api.study_manager import study_manager
from app.models.trainer import model_trainer

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize default research demo case and verify baseline models."""
    try:
        study_manager.ensure_default_demo_study()
        model_trainer.get_latest_or_default_model()
        print("NeuroLens AI backend started successfully. Seed demo case and default models active.")
    except Exception as e:
        print(f"Warning during startup initialization: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=f"### {settings.PROJECT_SUBTITLE}\n\nA research-grade computational neuroimaging and machine-learning API for 3D brain MRI slice inspection, lesion morphometry, anatomical ROI overlap calculation, and aphasia severity prediction.",
    version=settings.VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# CORS middleware for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Router
app.include_router(api_router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "subtitle": settings.PROJECT_SUBTITLE,
        "version": settings.VERSION,
        "docs": "/api/docs",
        "api_health": f"{settings.API_PREFIX}/health",
    }
