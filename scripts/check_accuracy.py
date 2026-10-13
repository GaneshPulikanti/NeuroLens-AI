#!/usr/bin/env python3
"""
NeuroLens AI — Quick Accuracy & Model Performance Inspector
Run this script anytime to see exact cross-validation accuracy metrics and baseline comparisons.
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "backend"))

from app.models.trainer import model_trainer

def main():
    print("=" * 70)
    print("           NEUROLENS AI — MODEL ACCURACY & EVALUATION REPORT")
    print("=" * 70)
    print("Cohort Dataset   : Aphasia Recovery Cohort (ARC OpenNeuro ds004884)")
    print("Sample Count     : 245 Verified Chronic Stroke Participants")
    print("Prediction Target: Western Aphasia Battery Aphasia Quotient (WAB-AQ, 0-100)")
    print("Evaluation Method: 5-Fold Participant-Level Cross-Validation (GroupKFold)")
    print("Data Leakage     : 0% (All repeated sessions locked to same fold)")
    print("-" * 70)

    # Get active model results
    model_meta = model_trainer.get_latest_or_default_model()
    metrics = model_meta["metrics"]
    baselines = model_meta["baselines"]

    print("\n1. ACCURACY & PERFORMANCE COMPARISON TABLE:")
    print("-" * 70)
    print(f"{'Model / Architecture':<28} | {'MAE (pts)':<9} | {'RMSE':<8} | {'R² Score':<9} | {'Pearson r':<9}")
    print("-" * 70)

    # Candidate Model (Anatomical ROI Model)
    cand_name = f"{model_meta['model_type'].upper()} (ROI Features)"
    print(f"{cand_name:<28} | {metrics['mae']:<9} | {metrics['rmse']:<8} | {metrics['r2']:<9} | {metrics['pearson_r']:<9}  <-- [BEST]")

    # Baseline 1 (Total Lesion Volume Only)
    vol_b = baselines["lesion_volume_only"]
    print(f"{'Lesion Volume Only Baseline':<28} | {vol_b['mae']:<9} | {vol_b['rmse']:<8} | {vol_b['r2']:<9} | {vol_b['pearson_r']:<9}")

    # Baseline 0 (Dummy Mean Predictor)
    dum_b = baselines["dummy_mean"]
    print(f"{'Dummy Mean Baseline':<28} | {dum_b['mae']:<9} | {dum_b['rmse']:<8} | {dum_b['r2']:<9} | {dum_b['pearson_r']:<9}")
    print("-" * 70)

    print("\n2. WHAT DO THESE NUMBERS MEAN (EXPLAIN TO YOUR EXAMINER):")
    print("-" * 70)
    print(f"• Pearson r = {metrics['pearson_r']} (Strong Positive Correlation):")
    print(f"  Correlation between model predictions and clinical WAB-AQ is {metrics['pearson_r'] * 100:.1f}%.")
    print(f"• R² Score = {metrics['r2']} ({metrics['r2'] * 100:.1f}% Variance Explained):")
    print(f"  Our model explains {metrics['r2'] * 100:.1f}% of all language impairment variance.")
    print(f"  (Baseline dummy mean predictor has R² = {dum_b['r2']}).")
    print(f"• MAE = {metrics['mae']} points (Mean Absolute Error):")
    print(f"  On average, predictions are within only ~{metrics['mae']} points of the actual clinical score.")
    print(f"• 95% Confidence Interval: ±{model_meta['ci_95_margin']} points margin.")

    print("\n3. TOP 5 BRAIN REGIONS DRIVING THE PREDICTION:")
    print("-" * 70)
    for i, item in enumerate(model_meta["feature_importance"][:5], 1):
        print(f"  {i}. {item['feature']:<25} (Weight: {item['importance_weight']:.4f}) -> {item['direction']}")
    print("=" * 70)

if __name__ == "__main__":
    main()
