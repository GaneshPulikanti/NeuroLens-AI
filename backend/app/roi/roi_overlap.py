from typing import Dict, Any, List
import numpy as np
from app.imaging.nifti_loader import NiftiVolume
from app.roi.atlas_manager import atlas_manager, LANGUAGE_ROIS_DEFINITION

class RoiOverlapCalculator:
    """Calculates voxel-wise anatomical lesion overlap, regional volume involvement, and network-level damage metrics."""

    def __init__(self, lesion_volume: NiftiVolume):
        self.lesion_vol = lesion_volume
        self.lesion_binary = (self.lesion_vol.data > 0.5).astype(np.uint8)
        self.voxel_vol_cm3 = self.lesion_vol.voxel_volume_cm3
        self.voxel_vol_mm3 = self.lesion_vol.voxel_volume_mm3

        # Generate rasterized ROI labels for this exact image geometry
        self.roi_labels_matrix = atlas_manager.generate_roi_label_volume(
            shape=self.lesion_vol.shape,
            affine=self.lesion_vol.affine,
        )

    def calculate_overlap_metrics(self) -> Dict[str, Any]:
        """Compute comprehensive regional and network damage measurements."""
        region_results: List[Dict[str, Any]] = []

        total_lesion_cm3 = float(np.sum(self.lesion_binary) * self.voxel_vol_cm3)
        broca_loads = []
        wernicke_loads = []
        parietal_loads = []
        motor_loads = []

        for roi in LANGUAGE_ROIS_DEFINITION:
            roi_id = roi["id"]
            roi_voxels = (self.roi_labels_matrix == roi_id)
            roi_voxel_count = int(np.sum(roi_voxels))

            if roi_voxel_count == 0:
                roi_vol_cm3 = roi["reference_volume_cm3"]
                overlap_voxels = 0
                overlap_vol_cm3 = 0.0
                overlap_pct = 0.0
            else:
                roi_vol_cm3 = float(roi_voxel_count * self.voxel_vol_cm3)
                overlap_mask = roi_voxels & (self.lesion_binary == 1)
                overlap_voxels = int(np.sum(overlap_mask))
                overlap_vol_cm3 = float(overlap_voxels * self.voxel_vol_cm3)
                overlap_pct = float((overlap_vol_cm3 / (roi_vol_cm3 + 1e-9)) * 100.0)

            overlap_pct = min(100.0, max(0.0, overlap_pct))

            # Severity tier
            if overlap_pct < 5.0:
                severity = "Spared / Minimal (<5%)"
                severity_color = "emerald"
            elif overlap_pct < 20.0:
                severity = "Mild Involvement (5-20%)"
                severity_color = "teal"
            elif overlap_pct < 50.0:
                severity = "Moderate Damage (20-50%)"
                severity_color = "amber"
            else:
                severity = "Severe Infarction (>50%)"
                severity_color = "red"

            # Functional grouping
            if "Broca" in roi["network"]:
                broca_loads.append(overlap_pct)
            elif "Wernicke" in roi["network"] or "Temporal" in roi["network"]:
                wernicke_loads.append(overlap_pct)
            elif "Parietal" in roi["network"] or "Semantic Integration" in roi["network"]:
                parietal_loads.append(overlap_pct)
            elif "Motor" in roi["network"] or "Apraxia" in roi["network"]:
                motor_loads.append(overlap_pct)

            region_results.append({
                "id": roi_id,
                "key": roi["key"],
                "name": roi["name"],
                "network": roi["network"],
                "brodmann": roi["brodmann"],
                "hemisphere": roi["hemisphere"],
                "roi_voxel_count": roi_voxel_count,
                "roi_volume_cm3": round(roi_vol_cm3, 2),
                "overlap_voxel_count": overlap_voxels,
                "overlap_volume_cm3": round(overlap_vol_cm3, 3),
                "overlap_percentage": round(overlap_pct, 2),
                "severity": severity,
                "severity_color": severity_color,
                "description": roi["description"],
            })

        # Summary Language Network Metrics
        network_summary = {
            "broca_complex_mean_pct": round(float(np.mean(broca_loads)) if broca_loads else 0.0, 2),
            "wernicke_area_mean_pct": round(float(np.mean(wernicke_loads)) if wernicke_loads else 0.0, 2),
            "parietal_conduction_mean_pct": round(float(np.mean(parietal_loads)) if parietal_loads else 0.0, 2),
            "motor_articulatory_mean_pct": round(float(np.mean(motor_loads)) if motor_loads else 0.0, 2),
            "total_language_cortex_lesion_cm3": round(
                sum(r["overlap_volume_cm3"] for r in region_results if r["hemisphere"] == "Left"), 3
            ),
            "total_lesion_cm3": round(total_lesion_cm3, 3),
        }

        return {
            "atlas": atlas_manager.get_atlas_info(),
            "region_measurements": region_results,
            "network_summary": network_summary,
        }
