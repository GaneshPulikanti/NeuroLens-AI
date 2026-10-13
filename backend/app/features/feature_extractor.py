from typing import Dict, Any, List
import pandas as pd
from app.imaging.nifti_loader import NiftiVolume
from app.imaging.lesion_analyzer import LesionAnalyzer
from app.roi.roi_overlap import RoiOverlapCalculator

# Formal Feature Registry with definitions and scientific rationale
FEATURE_DEFINITIONS: List[Dict[str, str]] = [
    {
        "name": "total_lesion_vol_cm3",
        "category": "Global Volumetric",
        "unit": "cm³",
        "description": "Total physical infarction volume across the cerebrum computed from voxel count and resolution.",
    },
    {
        "name": "laterality_index",
        "category": "Hemispheric",
        "unit": "Ratio [-1 to +1]",
        "description": "(Left Lesion Vol - Right Lesion Vol) / Total Lesion Vol. +1.0 indicates strictly left-hemispheric damage.",
    },
    {
        "name": "broca_load_pct",
        "category": "Language Network",
        "unit": "%",
        "description": "Mean percentage damage across Left IFG pars opercularis and pars triangularis.",
    },
    {
        "name": "wernicke_load_pct",
        "category": "Language Network",
        "unit": "%",
        "description": "Mean percentage damage across Left posterior STG and posterior MTG.",
    },
    {
        "name": "parietal_conduction_pct",
        "category": "Language Network",
        "unit": "%",
        "description": "Mean percentage damage across Left Supramarginal Gyrus (BA 40) and Angular Gyrus (BA 39).",
    },
    {
        "name": "motor_articulatory_pct",
        "category": "Language Network",
        "unit": "%",
        "description": "Mean percentage damage across Left Precentral Gyrus motor speech strip and anterior Insular cortex.",
    },
    {
        "name": "L_IFG_opercularis_pct",
        "category": "Anatomical ROI",
        "unit": "%",
        "description": "Percentage of Left IFG pars opercularis infarcted.",
    },
    {
        "name": "L_IFG_triangularis_pct",
        "category": "Anatomical ROI",
        "unit": "%",
        "description": "Percentage of Left IFG pars triangularis infarcted.",
    },
    {
        "name": "L_STG_post_pct",
        "category": "Anatomical ROI",
        "unit": "%",
        "description": "Percentage of Left posterior Superior Temporal Gyrus infarcted.",
    },
    {
        "name": "L_MTG_post_pct",
        "category": "Anatomical ROI",
        "unit": "%",
        "description": "Percentage of Left posterior Middle Temporal Gyrus infarcted.",
    },
    {
        "name": "L_SMG_pct",
        "category": "Anatomical ROI",
        "unit": "%",
        "description": "Percentage of Left Supramarginal Gyrus infarcted.",
    },
    {
        "name": "L_AG_pct",
        "category": "Anatomical ROI",
        "unit": "%",
        "description": "Percentage of Left Angular Gyrus infarcted.",
    },
    {
        "name": "L_Precentral_pct",
        "category": "Anatomical ROI",
        "unit": "%",
        "description": "Percentage of Left Precentral speech motor cortex infarcted.",
    },
    {
        "name": "L_Insula_pct",
        "category": "Anatomical ROI",
        "unit": "%",
        "description": "Percentage of Left anterior Insular cortex infarcted.",
    },
    {
        "name": "cog_x_mni",
        "category": "Spatial Coordinates",
        "unit": "mm",
        "description": "Lesion center of gravity in MNI Left-Right stereotaxic axis.",
    },
    {
        "name": "cog_y_mni",
        "category": "Spatial Coordinates",
        "unit": "mm",
        "description": "Lesion center of gravity in MNI Anterior-Posterior stereotaxic axis.",
    },
    {
        "name": "cog_z_mni",
        "category": "Spatial Coordinates",
        "unit": "mm",
        "description": "Lesion center of gravity in MNI Inferior-Superior stereotaxic axis.",
    },
]

class FeatureExtractor:
    """Extracts leakage-free, standardized quantitative imaging features from a patient's MRI and lesion mask."""

    def __init__(self):
        self.feature_definitions = FEATURE_DEFINITIONS
        self.feature_names = [f["name"] for f in FEATURE_DEFINITIONS]

    def extract_features(self, lesion_volume: NiftiVolume) -> Dict[str, float]:
        """Extract complete numerical feature dictionary from a 3D lesion mask volume."""
        analyzer = LesionAnalyzer(lesion_volume)
        lesion_metrics = analyzer.compute_metrics()

        calculator = RoiOverlapCalculator(lesion_volume)
        roi_metrics = calculator.calculate_overlap_metrics()

        region_dict = {r["key"]: r["overlap_percentage"] for r in roi_metrics["region_measurements"]}
        net_summary = roi_metrics["network_summary"]

        cog_mni = lesion_metrics.get("center_of_gravity_mni") or [0.0, 0.0, 0.0]

        features: Dict[str, float] = {
            "total_lesion_vol_cm3": float(lesion_metrics["volume_cm3"]),
            "laterality_index": float(lesion_metrics["laterality_index"]),
            "broca_load_pct": float(net_summary["broca_complex_mean_pct"]),
            "wernicke_load_pct": float(net_summary["wernicke_area_mean_pct"]),
            "parietal_conduction_pct": float(net_summary["parietal_conduction_mean_pct"]),
            "motor_articulatory_pct": float(net_summary["motor_articulatory_mean_pct"]),
            "L_IFG_opercularis_pct": float(region_dict.get("L_IFG_opercularis", 0.0)),
            "L_IFG_triangularis_pct": float(region_dict.get("L_IFG_triangularis", 0.0)),
            "L_STG_post_pct": float(region_dict.get("L_STG_post", 0.0)),
            "L_MTG_post_pct": float(region_dict.get("L_MTG_post", 0.0)),
            "L_SMG_pct": float(region_dict.get("L_SMG", 0.0)),
            "L_AG_pct": float(region_dict.get("L_AG", 0.0)),
            "L_Precentral_pct": float(region_dict.get("L_Precentral", 0.0)),
            "L_Insula_pct": float(region_dict.get("L_Insula", 0.0)),
            "cog_x_mni": float(cog_mni[0]),
            "cog_y_mni": float(cog_mni[1]),
            "cog_z_mni": float(cog_mni[2]),
        }

        return features

    def to_dataframe(self, features: Dict[str, float]) -> pd.DataFrame:
        """Convert feature dict to a single-row pandas DataFrame with correct column ordering."""
        return pd.DataFrame([features])[self.feature_names]

feature_extractor = FeatureExtractor()
