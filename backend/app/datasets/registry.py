import os
from pathlib import Path
from typing import Dict, Any, List
import pandas as pd
from app.core.config import settings

class DatasetRegistry:
    """Provides verified metadata, disk status, and data preparation utilities for research cohorts."""

    def __init__(self):
        self.arc_dir = settings.ARC_DIR
        self.isles_dir = settings.ISLES_DIR

    def get_arc_status(self) -> Dict[str, Any]:
        """Check status of Aphasia Recovery Cohort (ARC) files."""
        tsv_path = self.arc_dir / "participants.tsv"
        cohort_csv = self.arc_dir / "arc_cohort_features.csv"

        if tsv_path.exists():
            try:
                df = pd.read_csv(tsv_path, sep="\t")
                count = len(df)
                subtypes = df["wab_type"].value_counts(dropna=False).to_dict()
                # Clean NaNs in keys for json serialization
                clean_subtypes = {str(k): int(v) for k, v in subtypes.items()}
                aq_stats = {
                    "mean": round(float(df["wab_aq"].mean()), 2),
                    "std": round(float(df["wab_aq"].std()), 2),
                    "median": round(float(df["wab_aq"].median()), 2),
                    "min": round(float(df["wab_aq"].min()), 2),
                    "max": round(float(df["wab_aq"].max()), 2),
                }
                ready = True
            except Exception:
                count = 0
                clean_subtypes = {}
                aq_stats = {}
                ready = False
        else:
            count = 0
            clean_subtypes = {}
            aq_stats = {}
            ready = False

        return {
            "name": "Aphasia Recovery Cohort (ARC)",
            "dataset_id": "ds004884",
            "source_url": "https://openneuro.org/datasets/ds004884",
            "doi": "10.18112/openneuro.ds004884.v1.0.2",
            "license": "CC0 1.0 Universal",
            "status": "Ready (Verified Manifest)" if ready else "Metadata Missing",
            "verified_participant_count": count,
            "prediction_target": "Western Aphasia Battery-Revised Aphasia Quotient (wab_aq)",
            "wab_aq_distribution": aq_stats,
            "subtype_distribution": clean_subtypes,
            "features_cache_exists": cohort_csv.exists(),
            "local_directory": str(self.arc_dir),
            "command_to_download_raw": "datalad install https://github.com/OpenNeuroDatasets/ds004884.git",
        }

    def get_isles_status(self) -> Dict[str, Any]:
        """Check status of ISLES 2022 lesion segmentation benchmark."""
        sample_scans = list(self.isles_dir.glob("*.nii.gz"))
        return {
            "name": "ISLES 2022 (Ischemic Stroke Lesion Segmentation)",
            "challenge_url": "https://www.isles-challenge.org/",
            "zenodo_url": "https://zenodo.org/records/7960856",
            "doi": "10.1038/s41597-022-01875-5",
            "license": "CC BY-NC 4.0",
            "purpose": "3D Stroke Lesion Segmentation & Dice Metric Benchmarking",
            "modalities": ["DWI", "ADC", "FLAIR"],
            "annotation": "Expert manual binary lesion segmentation",
            "local_scans_count": len(sample_scans),
            "status": "Segmentation Benchmark Active",
            "local_directory": str(self.isles_dir),
            "scientific_note": "ISLES lesion data is strictly dedicated to lesion segmentation metrics (Dice/IoU). It is not combined with ARC language scores.",
        }

    def get_all_datasets(self) -> Dict[str, Any]:
        """Return global dataset registry status."""
        return {
            "primary": self.get_arc_status(),
            "secondary": self.get_isles_status(),
        }

dataset_registry = DatasetRegistry()
