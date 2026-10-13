import io
import base64
from pathlib import Path
from typing import Dict, Any, Tuple, Optional, List
import numpy as np
import nibabel as nib
from PIL import Image

WINDOW_PRESETS = {
    "brain": {"level": 40.0, "width": 80.0},
    "stroke": {"level": 35.0, "width": 50.0},
    "subdural": {"level": 50.0, "width": 130.0},
    "full": {"level": 0.0, "width": 0.0},  # dynamic min-max
}

# Color palette for anatomical ROIs in RGBA (0-255)
ROI_COLOR_PALETTE = {
    "L_IFG_opercularis": (59, 130, 246, 180),    # Blue (Broca)
    "L_IFG_triangularis": (14, 165, 233, 180),   # Sky Blue (Broca)
    "L_STG_post": (245, 158, 11, 180),          # Amber (Wernicke)
    "L_MTG_post": (217, 119, 6, 180),           # Orange (Wernicke)
    "L_SMG": (168, 85, 247, 180),               # Purple (Supramarginal)
    "L_AG": (139, 92, 246, 180),                # Violet (Angular)
    "L_Precentral": (16, 185, 129, 180),        # Emerald (Motor speech)
    "L_Insula": (20, 184, 166, 180),            # Teal (Articulatory)
    "R_Homologue": (100, 116, 139, 140),        # Slate (Right hemisphere)
}

class NiftiVolume:
    """Manages loading, geometry extraction, slice rendering, and overlay alignment for 3D NIfTI scans."""

    def __init__(self, filepath: str | Path):
        self.filepath = Path(filepath)
        if not self.filepath.exists():
            raise FileNotFoundError(f"NIfTI file not found: {self.filepath}")

        self.img = nib.load(str(self.filepath))
        # Ensure 3D shape
        raw_data = self.img.get_fdata(dtype=np.float32)
        if raw_data.ndim == 4:
            # Squeeze or take first volume if 4D
            raw_data = raw_data[..., 0] if raw_data.shape[-1] > 1 else raw_data.squeeze()
        self.data = raw_data
        self.shape = self.data.shape
        self.affine = self.img.affine
        self.header = self.img.header

        # Voxel dimensions in mm
        zooms = self.header.get_zooms()[:3]
        self.voxel_dims = (float(zooms[0]), float(zooms[1]), float(zooms[2]))
        self.voxel_volume_mm3 = float(self.voxel_dims[0] * self.voxel_dims[1] * self.voxel_dims[2])
        self.voxel_volume_cm3 = self.voxel_volume_mm3 / 1000.0

        # Orientation codes (e.g. ('R', 'A', 'S'))
        try:
            self.orientation = nib.aff2axcodes(self.affine)
        except Exception:
            self.orientation = ("U", "U", "U")

        # Intensity stats
        finite_mask = np.isfinite(self.data)
        if np.any(finite_mask):
            self.min_val = float(np.min(self.data[finite_mask]))
            self.max_val = float(np.max(self.data[finite_mask]))
            self.mean_val = float(np.mean(self.data[finite_mask]))
            self.std_val = float(np.std(self.data[finite_mask]))
            
            # Robust percentiles for MRI contrast windowing (exclude background zeros)
            pos_mask = finite_mask & (self.data > 0)
            if np.any(pos_mask):
                self.p2 = float(np.percentile(self.data[pos_mask], 2))
                self.p98 = float(np.percentile(self.data[pos_mask], 98))
                self.p50 = float(np.median(self.data[pos_mask]))
            else:
                self.p2 = self.min_val
                self.p98 = self.max_val
                self.p50 = (self.min_val + self.max_val) / 2.0
        else:
            self.min_val = self.max_val = self.mean_val = self.std_val = 0.0
            self.p2 = self.p98 = self.p50 = 0.0

    def get_metadata(self) -> Dict[str, Any]:
        """Return standardized geometric and intensity metadata."""
        return {
            "filename": self.filepath.name,
            "shape": list(self.shape),
            "dimensions": {
                "x_sagittal": int(self.shape[0]),
                "y_coronal": int(self.shape[1]),
                "z_axial": int(self.shape[2]),
            },
            "voxel_dims_mm": [round(v, 3) for v in self.voxel_dims],
            "voxel_volume_mm3": round(self.voxel_volume_mm3, 4),
            "voxel_volume_cm3": round(self.voxel_volume_cm3, 4),
            "orientation": list(self.orientation),
            "affine": [[round(float(c), 4) for c in row] for row in self.affine],
            "intensity": {
                "min": round(self.min_val, 2),
                "max": round(self.max_val, 2),
                "mean": round(self.mean_val, 2),
                "std": round(self.std_val, 2),
            },
        }

    def validate_alignment(self, other: "NiftiVolume") -> Tuple[bool, List[str]]:
        """Verify dimensional, geometric, and orientation compatibility with another volume (e.g. lesion mask)."""
        issues: List[str] = []
        if self.shape != other.shape:
            issues.append(f"Dimension mismatch: MRI {self.shape} vs Mask {other.shape}")

        affine_diff = np.max(np.abs(self.affine - other.affine))
        if affine_diff > 1e-2:
            issues.append(f"Affine matrix spatial mismatch (max diff: {affine_diff:.4f})")

        if self.orientation != other.orientation:
            issues.append(f"Orientation mismatch: MRI {self.orientation} vs Mask {other.orientation}")

        is_compatible = len(issues) == 0
        return is_compatible, issues

    def get_slice_2d(self, plane: str, index: int) -> np.ndarray:
        """Extract a 2D slice from the volume along the given plane."""
        plane = plane.lower()
        if plane == "axial":
            # Z slice: (X, Y)
            z = max(0, min(index, self.shape[2] - 1))
            slice_data = self.data[:, :, z]
            # Rotate for canonical neuroimaging display: Anterior UP, Right on Patient's Right / Left
            return np.rot90(slice_data)
        elif plane == "coronal":
            # Y slice: (X, Z)
            y = max(0, min(index, self.shape[1] - 1))
            slice_data = self.data[:, y, :]
            return np.rot90(slice_data)
        elif plane == "sagittal":
            # X slice: (Y, Z)
            x = max(0, min(index, self.shape[0] - 1))
            slice_data = self.data[x, :, :]
            return np.rot90(slice_data)
        else:
            raise ValueError(f"Unknown plane: {plane}. Must be axial, coronal, or sagittal.")

    def render_slice_rgba(
        self,
        plane: str,
        index: int,
        preset: str = "brain",
        custom_window: Optional[Dict[str, float]] = None,
        lesion_mask: Optional["NiftiVolume"] = None,
        lesion_opacity: float = 0.55,
        lesion_color: Tuple[int, int, int] = (239, 68, 68),  # Red-500
        roi_mask: Optional[np.ndarray] = None,
        roi_labels: Optional[Dict[int, str]] = None,
        roi_opacity: float = 0.40,
    ) -> Image.Image:
        """Render a high-fidelity RGBA slice image with window/level contrast and optional lesion/ROI overlays."""
        slice_2d = self.get_slice_2d(plane, index)

        # Apply Window / Level
        if custom_window and "level" in custom_window and "width" in custom_window:
            level = custom_window["level"]
            width = max(custom_window["width"], 1.0)
            lower = level - (width / 2.0)
            upper = level + (width / 2.0)
        elif self.min_val < -500:
            # CT scans calibrated in Hounsfield Units (-1000 to +3000 HU)
            if preset in WINDOW_PRESETS and preset != "full":
                level = WINDOW_PRESETS[preset]["level"]
                width = WINDOW_PRESETS[preset]["width"]
            else:
                level = (self.min_val + self.max_val) / 2.0
                width = max(self.max_val - self.min_val, 1.0)
            lower = level - (width / 2.0)
            upper = level + (width / 2.0)
        else:
            # MRI scans calibrated in arbitrary RF signal units (0 to max)
            p_range = max(self.p98 - self.p2, 1.0)
            if preset == "brain":
                lower = self.p2
                upper = self.p98
            elif preset == "stroke":
                lower = self.p2 + 0.08 * p_range
                upper = self.p98 - 0.05 * p_range
            elif preset == "subdural":
                lower = self.p50
                upper = self.max_val
            else:
                lower = self.min_val
                upper = self.max_val
            if upper <= lower:
                upper = lower + 1.0

        # Normalize to 0-255 grayscale
        norm_slice = np.clip((slice_2d - lower) / (upper - lower + 1e-6), 0.0, 1.0)
        gray_u8 = (norm_slice * 255.0).astype(np.uint8)

        # Construct RGBA base image
        rgba = np.zeros((*gray_u8.shape, 4), dtype=np.uint8)
        rgba[..., 0] = gray_u8
        rgba[..., 1] = gray_u8
        rgba[..., 2] = gray_u8
        rgba[..., 3] = 255  # Fully opaque base

        # Overlay ROI Atlas if provided
        if roi_mask is not None and roi_labels:
            roi_slice = self._slice_any_matrix(roi_mask, plane, index)
            for label_id, region_name in roi_labels.items():
                mask_pixels = (roi_slice == label_id)
                if np.any(mask_pixels):
                    r_c, g_c, b_c, a_c = ROI_COLOR_PALETTE.get(region_name, (59, 130, 246, 160))
                    eff_alpha = (a_c / 255.0) * roi_opacity
                    for c_idx, channel_val in enumerate([r_c, g_c, b_c]):
                        rgba[mask_pixels, c_idx] = (
                            (1.0 - eff_alpha) * rgba[mask_pixels, c_idx] + eff_alpha * channel_val
                        ).astype(np.uint8)

        # Overlay Lesion Mask if provided
        if lesion_mask is not None:
            lesion_slice = lesion_mask.get_slice_2d(plane, index)
            lesion_pixels = (lesion_slice > 0.1)
            if np.any(lesion_pixels):
                alpha = np.clip(lesion_opacity, 0.0, 1.0)
                for c_idx, val in enumerate(lesion_color):
                    rgba[lesion_pixels, c_idx] = (
                        (1.0 - alpha) * rgba[lesion_pixels, c_idx] + alpha * val
                    ).astype(np.uint8)

        return Image.fromarray(rgba, mode="RGBA")

    def _slice_any_matrix(self, matrix: np.ndarray, plane: str, index: int) -> np.ndarray:
        """Helper to slice arbitrary 3D matrix in matching coordinate convention."""
        plane = plane.lower()
        if plane == "axial":
            z = max(0, min(index, matrix.shape[2] - 1))
            return np.rot90(matrix[:, :, z])
        elif plane == "coronal":
            y = max(0, min(index, matrix.shape[1] - 1))
            return np.rot90(matrix[:, y, :])
        elif plane == "sagittal":
            x = max(0, min(index, matrix.shape[0] - 1))
            return np.rot90(matrix[x, :, :])
        return np.zeros((10, 10))

    def render_slice_base64(
        self,
        plane: str,
        index: int,
        preset: str = "brain",
        custom_window: Optional[Dict[str, float]] = None,
        lesion_mask: Optional["NiftiVolume"] = None,
        lesion_opacity: float = 0.55,
        roi_mask: Optional[np.ndarray] = None,
        roi_labels: Optional[Dict[int, str]] = None,
        roi_opacity: float = 0.40,
    ) -> str:
        """Render slice and return as Base64 data URL string."""
        img = self.render_slice_rgba(
            plane=plane,
            index=index,
            preset=preset,
            custom_window=custom_window,
            lesion_mask=lesion_mask,
            lesion_opacity=lesion_opacity,
            roi_mask=roi_mask,
            roi_labels=roi_labels,
            roi_opacity=roi_opacity,
        )
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{encoded}"
