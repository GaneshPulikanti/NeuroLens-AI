import json
from pathlib import Path
from typing import Dict, Any, Optional
import joblib
import numpy as np
import pandas as pd
from app.core.config import settings
from app.models.trainer import model_trainer

class ModelInferenceEngine:
    """Performs model inference, uncertainty estimation, and interpretability scoring on clinical imaging features."""

    def predict(
        self,
        features: Dict[str, float],
        model_version: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate predicted WAB-AQ, 95% prediction intervals, impairment category, and feature impacts."""
        models_dir = settings.MODELS_DIR

        # Select model
        if model_version:
            artifact_path = models_dir / f"{model_version}.joblib"
            meta_path = models_dir / f"{model_version}.json"
            if not artifact_path.exists() or not meta_path.exists():
                raise FileNotFoundError(f"Model version {model_version} not found")
            with open(meta_path, "r") as f:
                meta = json.load(f)
            pipeline = joblib.load(artifact_path)
        else:
            meta = model_trainer.get_latest_or_default_model()
            ver = meta["model_version"]
            artifact_path = models_dir / f"{ver}.joblib"
            pipeline = joblib.load(artifact_path)

        features_used = meta["features_used"]
        # Build feature vector
        row = [features.get(f_name, 0.0) for f_name in features_used]
        X = np.array([row])

        raw_pred = float(pipeline.predict(X)[0])
        pred_aq = round(float(np.clip(raw_pred, 0.0, 100.0)), 2)

        ci_margin = meta.get("ci_95_margin", 12.5)
        lower_bound = round(max(0.0, pred_aq - ci_margin), 1)
        upper_bound = round(min(100.0, pred_aq + ci_margin), 1)

        # Standard Clinical WAB-R Impairment Classification
        if pred_aq >= 93.8:
            impairment_category = "Subclinical / Intact Language Range"
            impairment_severity = "Minimal"
            clinical_implication = "Score falls above the standard Western Aphasia Battery cutoff for overt aphasia (93.8). Subtle word-finding difficulties may persist under cognitive fatigue."
            badge_color = "emerald"
        elif pred_aq >= 75.0:
            impairment_category = "Mild Language Impairment"
            impairment_severity = "Mild"
            clinical_implication = "Functional verbal communication largely preserved; typical errors include anomia, mild circumlocution, or slight phonemic paraphasias."
            badge_color = "teal"
        elif pred_aq >= 50.0:
            impairment_category = "Moderate Language Impairment"
            impairment_severity = "Moderate"
            clinical_implication = "Marked disruption in either expressive syntax/fluency or auditory comprehension; supported conversation techniques recommended."
            badge_color = "amber"
        else:
            impairment_category = "Severe Language Impairment"
            impairment_severity = "Severe"
            clinical_implication = "Extensive perisylvian involvement resulting in profound limitation across expressive and/or receptive language domains."
            badge_color = "red"

        # Feature contributions for this individual scan
        individual_contributions = []
        for feat_item in meta.get("feature_importance", []):
            f_name = feat_item["feature"]
            val = features.get(f_name, 0.0)
            weight = feat_item.get("coefficient", 0.0)
            impact = weight * (val / 100.0 if "pct" in f_name else val / 50.0)
            individual_contributions.append({
                "feature": f_name,
                "patient_value": round(val, 2),
                "model_weight": feat_item.get("coefficient", 0.0),
                "estimated_impact": round(float(impact), 2),
                "direction": "Reduces WAB-AQ" if impact < 0 else "Preserves WAB-AQ",
            })

        return {
            "model_version": meta["model_version"],
            "model_type": meta["model_type"],
            "feature_set": meta["feature_set"],
            "predicted_wab_aq": pred_aq,
            "uncertainty_interval_95": {
                "lower": lower_bound,
                "upper": upper_bound,
                "margin": ci_margin,
            },
            "impairment_category": impairment_category,
            "impairment_severity": impairment_severity,
            "badge_color": badge_color,
            "clinical_implication": clinical_implication,
            "features_used": features_used,
            "feature_contributions": individual_contributions[:8],  # Top 8 most impactful
            "scientific_disclaimer": "This prediction is generated for research and educational purposes only. It is not an approved clinical diagnostic tool and must not be used as the sole basis for clinical treatment decisions.",
        }

inference_engine = ModelInferenceEngine()
