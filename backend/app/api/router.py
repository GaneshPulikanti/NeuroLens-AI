import io
import shutil
from pathlib import Path
from typing import Dict, Any, Optional
from fastapi import APIRouter, File, UploadFile, Query, HTTPException, Form, Response
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import sanitize_filename, validate_mri_extension
from app.imaging.nifti_loader import NiftiVolume
from app.imaging.lesion_analyzer import LesionAnalyzer
from app.imaging.synthetic_fixture import create_synthetic_mni_case
from app.roi.atlas_manager import atlas_manager
from app.roi.roi_overlap import RoiOverlapCalculator
from app.features.feature_extractor import feature_extractor
from app.models.trainer import model_trainer
from app.models.inference import inference_engine
from app.datasets.registry import dataset_registry
from app.reports.report_generator import report_generator
from app.api.study_manager import study_manager

router = APIRouter()

# Pydantic Request Models
class TrainExperimentRequest(BaseModel):
    model_type: str = "ridge"
    feature_set: str = "roi_features"
    n_splits: int = 5
    random_seed: int = 42

class PredictRequest(BaseModel):
    model_version: Optional[str] = None

# --- SYSTEM & DATASETS ---
@router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "subtitle": settings.PROJECT_SUBTITLE,
        "studies_count": len(study_manager.list_studies()),
    }

@router.get("/datasets")
def get_datasets():
    return dataset_registry.get_all_datasets()

# --- MODELS & EXPERIMENTS ---
@router.get("/models")
def get_models():
    models = model_trainer.list_available_models()
    if not models:
        # Auto-train default model so system is always functional
        default_model = model_trainer.get_latest_or_default_model()
        models = [default_model]
    return {
        "count": len(models),
        "models": models,
        "active_model": models[0],
    }

@router.post("/experiments/train")
def run_experiment(req: TrainExperimentRequest):
    result = model_trainer.run_training_experiment(
        model_type=req.model_type,
        feature_set=req.feature_set,
        n_splits=req.n_splits,
        random_seed=req.random_seed,
    )
    return {
        "message": "Training experiment completed successfully",
        "experiment": result,
    }

# --- STUDIES & MRI MANAGEMENT ---
@router.get("/studies")
def list_studies():
    return study_manager.list_studies()

@router.post("/studies")
def create_new_study():
    study_id = study_manager.create_study()
    return {"study_id": study_id, "message": "Study created successfully"}

@router.post("/studies/{study_id}/load-demo")
def load_demo_into_study(study_id: str):
    study_path = settings.STUDIES_DIR / study_id
    profile = "mild" if "mild" in study_id else ("severe" if "severe" in study_id else "moderate")
    mri_p, mask_p = create_synthetic_mni_case(study_path, case_name=f"case_{study_id}", profile=profile)
    study_manager.clear_cache(study_id)
    return {
        "study_id": study_id,
        "mri_file": mri_p.name,
        "mask_file": mask_p.name,
        "message": "Standard MNI research stroke case loaded into study",
    }

@router.post("/studies/{study_id}/upload")
async def upload_file(
    study_id: str,
    file: UploadFile = File(...),
    file_type: str = Form("mri"),  # 'mri' or 'lesion_mask'
):
    safe_name = sanitize_filename(file.filename)
    if not validate_mri_extension(safe_name):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{safe_name}'. Only .nii or .nii.gz NIfTI files are accepted.",
        )

    study_path = settings.STUDIES_DIR / study_id
    study_path.mkdir(parents=True, exist_ok=True)

    # Prefix to clearly differentiate
    prefix = "mask_" if file_type == "lesion_mask" else "mri_"
    target_path = study_path / f"{prefix}{safe_name}"

    try:
        with open(target_path, "wb") as f_out:
            shutil.copyfileobj(file.file, f_out)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File save error: {str(e)}")

    # Clean up lingering demo/synthetic files in this study so they don't supersede the user's upload
    if file_type == "mri":
        for old in study_path.glob("case_*_T1w*"):
            old.unlink(missing_ok=True)
    elif file_type == "lesion_mask":
        for old in study_path.glob("case_*_lesion_mask*"):
            old.unlink(missing_ok=True)

    study_manager.clear_cache(study_id)

    # Validate file integrity
    try:
        vol = NiftiVolume(target_path)
        meta = vol.get_metadata()
    except Exception as e:
        if target_path.exists():
            target_path.unlink()
        raise HTTPException(
            status_code=422,
            detail=f"Corrupt or incompatible NIfTI volume: {str(e)}",
        )

    return {
        "study_id": study_id,
        "file_type": file_type,
        "filename": target_path.name,
        "metadata": meta,
        "message": "File uploaded and verified successfully",
    }

@router.get("/studies/{study_id}")
def get_study_details(study_id: str):
    mri_vol, mask_vol = study_manager.get_study_volumes(study_id)

    if not mri_vol:
        raise HTTPException(status_code=404, detail=f"Study '{study_id}' has no MRI volume uploaded.")

    mri_meta = mri_vol.get_metadata()
    mask_meta = mask_vol.get_metadata() if mask_vol else None

    alignment_ok = True
    alignment_issues = []
    lesion_metrics = None

    if mask_vol:
        alignment_ok, alignment_issues = mri_vol.validate_alignment(mask_vol)
        analyzer = LesionAnalyzer(mask_vol)
        lesion_metrics = analyzer.compute_metrics()

    return {
        "study_id": study_id,
        "mri": mri_meta,
        "has_lesion_mask": mask_vol is not None,
        "lesion_mask": mask_meta,
        "alignment_compatible": alignment_ok,
        "alignment_warnings": alignment_issues,
        "lesion_morphometry": lesion_metrics,
        "atlas_available": True,
    }

# --- SLICE RENDERING & MEDICAL VIEWER ---
@router.get("/studies/{study_id}/slices/{plane}/{index}")
def render_slice(
    study_id: str,
    plane: str,
    index: int,
    preset: str = Query("brain", description="Window preset: brain, stroke, full"),
    custom_level: Optional[float] = Query(None),
    custom_width: Optional[float] = Query(None),
    show_lesion: bool = Query(True),
    lesion_opacity: float = Query(0.55),
    show_rois: bool = Query(False),
    roi_opacity: float = Query(0.35),
):
    mri_vol, mask_vol = study_manager.get_study_volumes(study_id)
    if not mri_vol:
        raise HTTPException(status_code=404, detail="MRI volume not found")

    custom_window = None
    if custom_level is not None and custom_width is not None:
        custom_window = {"level": custom_level, "width": custom_width}

    # Lesion mask overlay
    effective_mask = mask_vol if (show_lesion and mask_vol) else None

    # ROI overlay
    roi_mask = None
    roi_labels = None
    if show_rois:
        roi_mask = atlas_manager.generate_roi_label_volume(mri_vol.shape, mri_vol.affine)
        roi_labels = {r["id"]: r["key"] for r in atlas_manager.rois}

    # Render PNG image
    img = mri_vol.render_slice_rgba(
        plane=plane,
        index=index,
        preset=preset,
        custom_window=custom_window,
        lesion_mask=effective_mask,
        lesion_opacity=lesion_opacity,
        roi_mask=roi_mask,
        roi_labels=roi_labels,
        roi_opacity=roi_opacity,
    )

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")

# --- ROI ANALYSIS & OVERLAP ---
@router.post("/studies/{study_id}/roi-analysis")
def perform_roi_analysis(study_id: str):
    mri_vol, mask_vol = study_manager.get_study_volumes(study_id)
    if not mri_vol and not mask_vol:
        raise HTTPException(
            status_code=404,
            detail=f"Study '{study_id}' not found.",
        )

    if not mask_vol:
        # Fallback when no stroke lesion is detected in the scan (intact speech network)
        return {
            "study_id": study_id,
            "results": {
                "atlas": {
                    "atlas_name": "Harvard-Oxford Cortical Atlas",
                    "version": "1.0",
                    "coordinate_space": "MNI152",
                    "roi_count": len(atlas_manager.rois),
                },
                "region_measurements": [
                    {
                        "id": r["id"],
                        "key": r["key"],
                        "name": r["name"],
                        "network": r["network"],
                        "brodmann": r["brodmann"],
                        "hemisphere": r["hemisphere"],
                        "roi_voxel_count": 0,
                        "roi_volume_cm3": r["reference_volume_cm3"],
                        "overlap_voxel_count": 0,
                        "overlap_volume_cm3": 0.0,
                        "overlap_percentage": 0.0,
                        "severity": "Intact",
                        "severity_color": "emerald",
                        "description": r["description"],
                    }
                    for r in atlas_manager.rois
                ],
                "network_summary": {
                    "broca_complex_mean_pct": 0.0,
                    "wernicke_area_mean_pct": 0.0,
                    "parietal_conduction_mean_pct": 0.0,
                    "motor_articulatory_mean_pct": 0.0,
                    "total_language_cortex_lesion_cm3": 0.0,
                    "total_lesion_cm3": 0.0,
                },
            },
        }

    calculator = RoiOverlapCalculator(mask_vol)
    results = calculator.calculate_overlap_metrics()
    return {
        "study_id": study_id,
        "results": results,
    }

# --- PREDICTION & INFERENCE ---
@router.post("/studies/{study_id}/predict")
def predict_study(study_id: str, req: PredictRequest):
    mri_vol, mask_vol = study_manager.get_study_volumes(study_id)
    if not mri_vol and not mask_vol:
        raise HTTPException(
            status_code=404,
            detail=f"Study '{study_id}' not found.",
        )

    if not mask_vol:
        # Intact baseline features when no lesion is present
        features = {
            "total_lesion_vol_cm3": 0.0,
            "laterality_index": 0.0,
            "broca_load_pct": 0.0,
            "wernicke_load_pct": 0.0,
            "parietal_conduction_pct": 0.0,
            "motor_articulatory_pct": 0.0,
            "L_IFG_opercularis_pct": 0.0,
            "L_IFG_triangularis_pct": 0.0,
            "L_STG_post_pct": 0.0,
            "L_MTG_post_pct": 0.0,
            "L_SMG_pct": 0.0,
            "L_AG_pct": 0.0,
            "L_Precentral_pct": 0.0,
            "L_Insula_pct": 0.0,
            "cog_x_mni": 0.0,
            "cog_y_mni": 0.0,
            "cog_z_mni": 0.0,
        }
    else:
        # Extract features from lesion mask
        features = feature_extractor.extract_features(mask_vol)

    # Run inference
    prediction = inference_engine.predict(features, model_version=req.model_version)

    return {
        "study_id": study_id,
        "features_extracted": features,
        "prediction": prediction,
    }

# --- RESEARCH REPORT ---
@router.get("/reports/{study_id}")
def generate_study_report(study_id: str):
    mri_vol, mask_vol = study_manager.get_study_volumes(study_id)
    if not mri_vol or not mask_vol:
        raise HTTPException(
            status_code=400,
            detail="Both MRI volume and lesion mask must be present to compile a research report.",
        )

    mri_meta = mri_vol.get_metadata()
    analyzer = LesionAnalyzer(mask_vol)
    lesion_metrics = analyzer.compute_metrics()

    calculator = RoiOverlapCalculator(mask_vol)
    roi_metrics = calculator.calculate_overlap_metrics()

    features = feature_extractor.extract_features(mask_vol)
    prediction = inference_engine.predict(features)

    report_json = report_generator.generate_report(
        study_id=study_id,
        mri_meta=mri_meta,
        lesion_metrics=lesion_metrics,
        roi_metrics=roi_metrics,
        prediction=prediction,
    )

    return report_json

@router.get("/reports/{study_id}/html", response_class=HTMLResponse)
def get_study_report_html(study_id: str):
    report_json = generate_study_report(study_id)
    html_content = report_generator.generate_html_view(report_json)
    return HTMLResponse(content=html_content)
