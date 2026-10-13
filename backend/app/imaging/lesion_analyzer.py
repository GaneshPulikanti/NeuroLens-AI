from typing import Dict, Any, Tuple
import numpy as np
from app.imaging.nifti_loader import NiftiVolume

class LesionAnalyzer:
    """Calculates quantitative physical measurements, spatial bounding boxes, centroids, and laterality from 3D lesion masks."""

    def __init__(self, lesion_volume: NiftiVolume):
        self.vol = lesion_volume
        # Threshold to binary (handle soft probabilities or anti-aliasing)
        self.binary_mask = (self.vol.data > 0.5).astype(np.uint8)
        self.total_voxels = int(np.sum(self.binary_mask))
        self.volume_mm3 = float(self.total_voxels * self.vol.voxel_volume_mm3)
        self.volume_cm3 = float(self.volume_mm3 / 1000.0)

    def compute_metrics(self) -> Dict[str, Any]:
        """Compute complete volumetric, spatial, and hemispheric metrics."""
        if self.total_voxels == 0:
            return {
                "lesion_detected": False,
                "voxel_count": 0,
                "volume_mm3": 0.0,
                "volume_cm3": 0.0,
                "bounding_box_voxels": None,
                "center_of_gravity_voxel": None,
                "center_of_gravity_mni": None,
                "left_hemisphere_vol_cm3": 0.0,
                "right_hemisphere_vol_cm3": 0.0,
                "laterality_index": 0.0,
                "laterality_label": "No lesion detected",
            }

        # Bounding Box in voxel indices
        coords = np.argwhere(self.binary_mask)  # shape (N, 3)
        x_min, y_min, z_min = coords.min(axis=0)
        x_max, y_max, z_max = coords.max(axis=0)

        # Center of gravity (voxel space)
        cog_vox = coords.mean(axis=0)  # [x, y, z]

        # Transform Center of Gravity to MNI World Space (mm) via 4x4 Affine
        cog_homo = np.array([cog_vox[0], cog_vox[1], cog_vox[2], 1.0])
        cog_mni = np.dot(self.vol.affine, cog_homo)[:3]

        # Hemispheric calculation using MNI X-coordinate
        # In MNI152 space: negative X = Left hemisphere, positive X = Right hemisphere
        # Transform all lesion voxels to world X coordinates to split hemispheres accurately
        # Homogeneous coordinates for all lesion voxels
        sample_stride = max(1, len(coords) // 20000)  # Downsample for speed if massive lesion
        sub_coords = coords[::sample_stride]
        sub_homo = np.hstack([sub_coords, np.ones((len(sub_coords), 1))])
        world_pts = np.dot(self.vol.affine, sub_homo.T)[:3].T
        world_x = world_pts[:, 0]

        left_vox_fraction = float(np.mean(world_x < 0.0))
        right_vox_fraction = 1.0 - left_vox_fraction

        left_vol_cm3 = round(self.volume_cm3 * left_vox_fraction, 3)
        right_vol_cm3 = round(self.volume_cm3 * right_vox_fraction, 3)

        if (left_vol_cm3 + right_vol_cm3) > 0:
            laterality_idx = (left_vol_cm3 - right_vol_cm3) / (left_vol_cm3 + right_vol_cm3)
        else:
            laterality_idx = 0.0

        if laterality_idx > 0.4:
            laterality_label = "Dominant Left Hemisphere (Perisylvian / Language dominant)"
        elif laterality_idx < -0.4:
            laterality_label = "Dominant Right Hemisphere"
        else:
            laterality_label = "Bilateral / Midline involvement"

        return {
            "lesion_detected": True,
            "voxel_count": self.total_voxels,
            "volume_mm3": round(self.volume_mm3, 2),
            "volume_cm3": round(self.volume_cm3, 3),
            "bounding_box_voxels": {
                "x_range": [int(x_min), int(x_max)],
                "y_range": [int(y_min), int(y_max)],
                "z_range": [int(z_min), int(z_max)],
            },
            "center_of_gravity_voxel": [round(float(c), 1) for c in cog_vox],
            "center_of_gravity_mni": [round(float(c), 1) for c in cog_mni],
            "left_hemisphere_vol_cm3": left_vol_cm3,
            "right_hemisphere_vol_cm3": right_vol_cm3,
            "laterality_index": round(float(laterality_idx), 3),
            "laterality_label": laterality_label,
        }
