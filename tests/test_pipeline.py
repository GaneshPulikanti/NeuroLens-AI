import pytest
import numpy as np
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.imaging.nifti_loader import NiftiVolume
from app.imaging.lesion_analyzer import LesionAnalyzer
from app.imaging.synthetic_fixture import create_synthetic_mni_case
from app.roi.atlas_manager import atlas_manager
from app.roi.roi_overlap import RoiOverlapCalculator
from app.features.feature_extractor import feature_extractor
from app.models.trainer import model_trainer
from app.models.inference import inference_engine
from app.reports.report_generator import report_generator
from app.api.study_manager import study_manager

client = TestClient(app)

@pytest.fixture(scope="session")
def demo_study_paths(tmp_path_factory):
    tmp_dir = tmp_path_factory.mktemp("test_mri_case")
    mri_p, mask_p = create_synthetic_mni_case(tmp_dir, case_name="test_case")
    return mri_p, mask_p

def test_nifti_loading_and_geometry(demo_study_paths):
    mri_path, _ = demo_study_paths
    vol = NiftiVolume(mri_path)
    meta = vol.get_metadata()

    assert len(meta["shape"]) == 3 and all(d > 0 for d in meta["shape"])
    assert len(meta["voxel_dims_mm"]) == 3
    assert meta["voxel_volume_cm3"] > 0.0
    assert "intensity" in meta

def test_lesion_volume_and_laterality(demo_study_paths):
    _, mask_path = demo_study_paths
    mask_vol = NiftiVolume(mask_path)
    analyzer = LesionAnalyzer(mask_vol)
    metrics = analyzer.compute_metrics()

    assert metrics["lesion_detected"] is True
    assert metrics["volume_cm3"] > 0.0
    assert metrics["voxel_count"] > 0
    assert -1.0 <= metrics["laterality_index"] <= 1.0
    assert "Dominant Left" in metrics["laterality_label"]

def test_roi_overlap_calculation(demo_study_paths):
    _, mask_path = demo_study_paths
    mask_vol = NiftiVolume(mask_path)
    calculator = RoiOverlapCalculator(mask_vol)
    results = calculator.calculate_overlap_metrics()

    assert "region_measurements" in results
    assert len(results["region_measurements"]) == len(atlas_manager.rois)
    assert "network_summary" in results

    broca_load = results["network_summary"]["broca_complex_mean_pct"]
    assert 0.0 <= broca_load <= 100.0

def test_feature_extraction(demo_study_paths):
    _, mask_path = demo_study_paths
    mask_vol = NiftiVolume(mask_path)
    features = feature_extractor.extract_features(mask_vol)

    assert "total_lesion_vol_cm3" in features
    assert "broca_load_pct" in features
    assert "wernicke_load_pct" in features
    assert features["total_lesion_vol_cm3"] > 0.0

def test_model_training_and_group_kfold():
    result = model_trainer.run_training_experiment(
        model_type="ridge",
        feature_set="roi_features",
        n_splits=3,
        random_seed=42,
    )

    assert "metrics" in result
    assert result["metrics"]["mae"] > 0.0
    assert result["metrics"]["rmse"] > 0.0
    assert "baselines" in result
    assert "lesion_volume_only" in result["baselines"]
    assert "feature_importance" in result
    assert len(result["feature_importance"]) > 0

def test_inference_pipeline(demo_study_paths):
    _, mask_path = demo_study_paths
    mask_vol = NiftiVolume(mask_path)
    features = feature_extractor.extract_features(mask_vol)
    pred = inference_engine.predict(features)

    assert "predicted_wab_aq" in pred
    assert 0.0 <= pred["predicted_wab_aq"] <= 100.0
    assert "uncertainty_interval_95" in pred
    assert pred["uncertainty_interval_95"]["lower"] <= pred["predicted_wab_aq"] <= pred["uncertainty_interval_95"]["upper"]
    assert "impairment_category" in pred

def test_api_health_endpoint():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["service"] == "NeuroLens AI"

def test_api_datasets_endpoint():
    resp = client.get("/api/datasets")
    assert resp.status_code == 200
    data = resp.json()
    assert "primary" in data
    assert data["primary"]["name"] == "Aphasia Recovery Cohort (ARC)"
    assert data["primary"]["verified_participant_count"] == 245

def test_api_study_slices_and_rendering():
    study_id = "demo_stroke_case_01"
    resp = client.get(f"/api/studies/{study_id}/slices/axial/45?preset=brain&show_lesion=true")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/png"

def test_api_report_generation():
    study_id = "demo_stroke_case_01"
    resp = client.get(f"/api/reports/{study_id}")
    assert resp.status_code == 200
    report = resp.json()
    assert "study_id" in report
    assert "predictive_model_evaluation" in report
    assert "roi_analysis" in report
    assert "scientific_disclaimer" in report
