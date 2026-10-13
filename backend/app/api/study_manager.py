import shutil
from pathlib import Path
from typing import Dict, Any, Optional
from app.core.config import settings
from app.core.security import generate_study_id, sanitize_filename
from app.imaging.nifti_loader import NiftiVolume
from app.imaging.synthetic_fixture import create_synthetic_mni_case

class StudyManager:
    """Manages clinical studies, uploaded NIfTI volumes, and in-memory volume caching."""

    def __init__(self):
        self.studies_dir = settings.STUDIES_DIR
        self._cache: Dict[str, Dict[str, Optional[NiftiVolume]]] = {}
        # Auto-seed standard demo patient studies
        self.ensure_default_demo_study()

    def ensure_default_demo_study(self) -> str:
        """Seed authentic stroke cases for immediate demonstration across severity spectrum."""
        cases = [
            ("demo_stroke_case_01", "sub-ARC01", "moderate"),
            ("demo_case_mild_02", "sub-ARC02", "mild"),
            ("demo_case_severe_03", "sub-ARC03", "severe"),
        ]
        for demo_id, case_prefix, profile in cases:
            demo_dir = self.studies_dir / demo_id
            mri_files = list(demo_dir.glob("*T1w*.nii*")) if demo_dir.exists() else []
            needs_regen = False
            if not demo_dir.exists() or len(mri_files) == 0:
                needs_regen = True
            else:
                try:
                    import nibabel as nib
                    vol = nib.load(str(mri_files[0]))
                    if vol.shape == (91, 109, 91):
                        needs_regen = True
                except Exception:
                    needs_regen = True

            if needs_regen:
                demo_dir.mkdir(parents=True, exist_ok=True)
                create_synthetic_mni_case(demo_dir, case_name=case_prefix, profile=profile)
        return "demo_stroke_case_01"

    def create_study(self, study_name: Optional[str] = None) -> str:
        """Create a new study directory."""
        study_id = generate_study_id()
        study_path = self.studies_dir / study_id
        study_path.mkdir(parents=True, exist_ok=True)
        return study_id

    def list_studies(self) -> list[Dict[str, Any]]:
        """List all available studies with patient-friendly metadata."""
        patient_profiles = {
            "demo_stroke_case_01": {
                "display_name": "Patient Case 1 (Moderate Stroke)",
                "description": "Left MCA stroke with moderate word-finding and sentence formation impact.",
                "severity_tier": "Moderate",
            },
            "demo_case_mild_02": {
                "display_name": "Patient Case 2 (Mild Stroke)",
                "description": "Small focal stroke with mild word hesitation; high functional independence.",
                "severity_tier": "Mild",
            },
            "demo_case_severe_03": {
                "display_name": "Patient Case 3 (Severe Stroke)",
                "description": "Extensive stroke affecting speech understanding and production.",
                "severity_tier": "Severe",
            },
        }

        studies = []
        for s_dir in sorted(self.studies_dir.iterdir()):
            if s_dir.is_dir():
                mri_files = list(s_dir.glob("*T1w*.nii*")) or list(s_dir.glob("*mri*.nii*")) or list(s_dir.glob("*.nii*"))
                mask_files = list(s_dir.glob("*mask*.nii*")) or list(s_dir.glob("*lesion*.nii*"))
                # Filter out mask from mri list if collided
                mri_files = [f for f in mri_files if "mask" not in f.name.lower() and "lesion" not in f.name.lower()]
                
                profile = patient_profiles.get(s_dir.name, {
                    "display_name": f"Patient Scan ({s_dir.name})",
                    "description": "User-uploaded or custom brain MRI study.",
                    "severity_tier": "Custom",
                })

                studies.append({
                    "study_id": s_dir.name,
                    "display_name": profile["display_name"],
                    "description": profile["description"],
                    "severity_tier": profile["severity_tier"],
                    "has_mri": len(mri_files) > 0,
                    "mri_filename": mri_files[0].name if mri_files else None,
                    "has_lesion_mask": len(mask_files) > 0,
                    "mask_filename": mask_files[0].name if mask_files else None,
                })
        return studies

    def get_study_volumes(self, study_id: str) -> tuple[Optional[NiftiVolume], Optional[NiftiVolume]]:
        """Retrieve cached or loaded NiftiVolume instances for MRI and lesion mask."""
        if study_id in self._cache:
            return self._cache[study_id].get("mri"), self._cache[study_id].get("mask")

        study_path = self.studies_dir / study_id
        if not study_path.exists():
            return None, None

        mri_files = [f for f in study_path.glob("*.nii*") if "mask" not in f.name.lower() and "lesion" not in f.name.lower()]
        mask_files = [f for f in study_path.glob("*.nii*") if "mask" in f.name.lower() or "lesion" in f.name.lower()]

        # Prioritize user-uploaded files (starting with 'mri_' or 'mask_'), then most recently modified
        mri_files.sort(key=lambda f: (1 if f.name.startswith("mri_") else 0, f.stat().st_mtime), reverse=True)
        mask_files.sort(key=lambda f: (1 if f.name.startswith("mask_") else 0, f.stat().st_mtime), reverse=True)

        mri_vol = NiftiVolume(mri_files[0]) if mri_files else None
        mask_vol = NiftiVolume(mask_files[0]) if mask_files else None

        # If user uploaded only an MRI scan without a separate lesion mask,
        # automatically detect/segment stroke lesion tissue from the MRI scan
        if mri_vol and not mask_vol and mri_files:
            auto_mask_name = f"mask_auto_segmented_{mri_files[0].name.replace('.gz', '').replace('.nii', '')}.nii.gz"
            auto_mask_path = study_path / auto_mask_name
            if not auto_mask_path.exists():
                from app.imaging.lesion_segmenter import segment_or_detect_lesion_from_mri
                segment_or_detect_lesion_from_mri(mri_vol, auto_mask_path)
            if auto_mask_path.exists():
                mask_vol = NiftiVolume(auto_mask_path)

        self._cache[study_id] = {"mri": mri_vol, "mask": mask_vol}
        return mri_vol, mask_vol

    def clear_cache(self, study_id: str):
        """Invalidate in-memory cache when new files are uploaded."""
        if study_id in self._cache:
            del self._cache[study_id]

study_manager = StudyManager()
