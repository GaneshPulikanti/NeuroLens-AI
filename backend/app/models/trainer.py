import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
import joblib
import numpy as np
import pandas as pd
from scipy.stats import pearsonr
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge, ElasticNet
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVR

from app.core.config import settings
from app.models.cohort_builder import build_or_load_arc_cohort

class ModelTrainer:
    """Trains, compares, and evaluates leakage-free machine-learning regression models for predicting WAB Aphasia Quotient."""

    def __init__(self):
        self.models_dir = settings.MODELS_DIR
        self.models_dir.mkdir(parents=True, exist_ok=True)

    def run_training_experiment(
        self,
        model_type: str = "ridge",
        feature_set: str = "roi_features",
        n_splits: int = 5,
        random_seed: int = 42,
    ) -> Dict[str, Any]:
        """Trains models using strict participant-level K-Fold cross validation and baseline benchmarking."""
        df = build_or_load_arc_cohort()
        total_participants = len(df)

        # Feature Set Selection
        if feature_set == "lesion_volume_only":
            features = ["total_lesion_vol_cm3"]
        elif feature_set == "language_network_only":
            features = [
                "broca_load_pct",
                "wernicke_load_pct",
                "parietal_conduction_pct",
                "motor_articulatory_pct",
                "laterality_index",
            ]
        elif feature_set == "anatomical_rois":
            features = [
                "L_IFG_opercularis_pct",
                "L_IFG_triangularis_pct",
                "L_STG_post_pct",
                "L_MTG_post_pct",
                "L_SMG_pct",
                "L_AG_pct",
                "L_Precentral_pct",
                "L_Insula_pct",
            ]
        else:  # "roi_features" / all available imaging features
            features = [
                "total_lesion_vol_cm3",
                "laterality_index",
                "broca_load_pct",
                "wernicke_load_pct",
                "parietal_conduction_pct",
                "motor_articulatory_pct",
                "L_IFG_opercularis_pct",
                "L_IFG_triangularis_pct",
                "L_STG_post_pct",
                "L_MTG_post_pct",
                "L_SMG_pct",
                "L_AG_pct",
                "L_Precentral_pct",
                "L_Insula_pct",
                "cog_x_mni",
                "cog_y_mni",
                "cog_z_mni",
            ]

        X = df[features].values
        y = df["wab_aq"].values

        # Strict KFold (participant-level splitting)
        kf = KFold(n_splits=n_splits, shuffle=True, random_state=random_seed)

        def eval_pipeline(regressor_ctor):
            y_trues = []
            y_preds = []
            for train_idx, val_idx in kf.split(X):
                X_tr, y_tr = X[train_idx], y[train_idx]
                X_va, y_va = X[val_idx], y[val_idx]

                pipe = Pipeline([
                    ("scaler", StandardScaler()),
                    ("reg", regressor_ctor()),
                ])
                pipe.fit(X_tr, y_tr)
                preds = pipe.predict(X_va)

                y_trues.extend(y_va)
                y_preds.extend(preds)

            y_trues = np.array(y_trues)
            y_preds = np.clip(np.array(y_preds), 0.0, 100.0)

            mae = float(mean_absolute_error(y_trues, y_preds))
            rmse = float(np.sqrt(mean_squared_error(y_trues, y_preds)))
            r2 = float(r2_score(y_trues, y_preds))
            r_val, p_val = pearsonr(y_trues, y_preds)

            return {
                "mae": round(mae, 2),
                "rmse": round(rmse, 2),
                "r2": round(r2, 3),
                "pearson_r": round(float(r_val), 3),
                "p_value": float(p_val),
            }

        # 1. Baseline 0: Dummy Regressor (Mean baseline)
        dummy_metrics = eval_pipeline(lambda: DummyRegressor(strategy="mean"))

        # 2. Baseline 1: Univariate Lesion-Volume-Only baseline
        X_vol = df[["total_lesion_vol_cm3"]].values
        vol_trues, vol_preds = [], []
        for train_idx, val_idx in kf.split(X_vol):
            pipe_v = Pipeline([("scaler", StandardScaler()), ("reg", Ridge(alpha=1.0))])
            pipe_v.fit(X_vol[train_idx], y[train_idx])
            p_v = pipe_v.predict(X_vol[val_idx])
            vol_trues.extend(y[val_idx])
            vol_preds.extend(p_v)
        vol_mae = float(mean_absolute_error(vol_trues, vol_preds))
        vol_rmse = float(np.sqrt(mean_squared_error(vol_trues, vol_preds)))
        vol_r2 = float(r2_score(vol_trues, vol_preds))
        vol_r, _ = pearsonr(vol_trues, vol_preds)
        vol_baseline_metrics = {
            "mae": round(vol_mae, 2),
            "rmse": round(vol_rmse, 2),
            "r2": round(vol_r2, 3),
            "pearson_r": round(float(vol_r), 3),
        }

        # 3. Model Architecture Selected
        if model_type.lower() == "random_forest":
            reg_ctor = lambda: RandomForestRegressor(n_estimators=100, max_depth=6, random_state=random_seed)
        elif model_type.lower() == "svr":
            reg_ctor = lambda: SVR(C=10.0, epsilon=2.0)
        elif model_type.lower() == "elastic_net":
            reg_ctor = lambda: ElasticNet(alpha=0.5, l1_ratio=0.5, random_state=random_seed)
        else:  # ridge
            reg_ctor = lambda: Ridge(alpha=10.0, random_state=random_seed)

        target_metrics = eval_pipeline(reg_ctor)

        # Fit final model on complete cohort for deployment
        final_pipeline = Pipeline([
            ("scaler", StandardScaler()),
            ("reg", reg_ctor()),
        ])
        final_pipeline.fit(X, y)

        # Calculate Feature Importance / Contribution
        feature_importance_list = []
        regressor = final_pipeline.named_steps["reg"]

        if hasattr(regressor, "coef_"):
            coefs = regressor.coef_
            # Higher absolute coefficient means greater influence on score reduction
            for f_name, c_val in zip(features, coefs):
                feature_importance_list.append({
                    "feature": f_name,
                    "importance_weight": round(float(abs(c_val)), 4),
                    "coefficient": round(float(c_val), 4),
                    "direction": "Decreases WAB-AQ (Impairs)" if c_val < 0 else "Preserves WAB-AQ",
                })
        elif hasattr(regressor, "feature_importances_"):
            for f_name, imp in zip(features, regressor.feature_importances_):
                feature_importance_list.append({
                    "feature": f_name,
                    "importance_weight": round(float(imp), 4),
                    "coefficient": round(float(imp), 4),
                    "direction": "Predictive Feature",
                })
        else:
            for f_name in features:
                feature_importance_list.append({
                    "feature": f_name,
                    "importance_weight": 0.1,
                    "coefficient": 0.0,
                    "direction": "Evaluated Feature",
                })

        feature_importance_list.sort(key=lambda item: item["importance_weight"], reverse=True)

        # Model Version & Persistence
        model_version = f"neurolens_{model_type}_{feature_set}_{int(time.time())}"
        artifact_path = self.models_dir / f"{model_version}.joblib"
        metadata_path = self.models_dir / f"{model_version}.json"

        # Residual std for uncertainty estimation (conformal / 95% CI)
        y_all_pred = final_pipeline.predict(X)
        residuals = y - y_all_pred
        residual_std = float(np.std(residuals))
        ci_95_margin = round(1.96 * residual_std, 2)

        meta = {
            "model_version": model_version,
            "model_type": model_type,
            "feature_set": feature_set,
            "features_used": features,
            "trained_timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "n_participants": total_participants,
            "n_splits": n_splits,
            "random_seed": random_seed,
            "metrics": target_metrics,
            "residual_std": round(residual_std, 2),
            "ci_95_margin": ci_95_margin,
            "baselines": {
                "dummy_mean": dummy_metrics,
                "lesion_volume_only": vol_baseline_metrics,
            },
            "feature_importance": feature_importance_list,
        }

        joblib.dump(final_pipeline, artifact_path)
        with open(metadata_path, "w") as f:
            json.dump(meta, f, indent=2)

        return meta

    def list_available_models(self) -> List[Dict[str, Any]]:
        """List all saved models and their metadata."""
        models = []
        for json_file in sorted(self.models_dir.glob("*.json"), reverse=True):
            try:
                with open(json_file, "r") as f:
                    meta = json.load(f)
                    models.append(meta)
            except Exception:
                continue
        return models

    def get_latest_or_default_model(self) -> Dict[str, Any]:
        """Retrieve the latest trained model, or auto-train baseline if none exist."""
        available = self.list_available_models()
        if available:
            return available[0]
        # Train default Ridge model on ARC cohort
        return self.run_training_experiment(model_type="ridge", feature_set="roi_features")

model_trainer = ModelTrainer()
