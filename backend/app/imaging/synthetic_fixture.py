from pathlib import Path
import numpy as np
import nibabel as nib

ICBM152_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "data"
    / "atlas"
    / "icbm152_2009"
    / "mni_icbm152_nlin_sym_09a"
    / "mni_icbm152_t1_tal_nlin_sym_09a.nii.gz"
)

def create_synthetic_mni_case(
    output_dir: Path,
    case_name: str = "demo_arc_stroke_case",
    seed: int = 42,
    profile: str = "moderate",
) -> tuple[Path, Path]:
    """Generates an authentic MNI research brain T1w volume and a perisylvian stroke lesion mask."""
    output_dir.mkdir(parents=True, exist_ok=True)
    mri_path = output_dir / f"{case_name}_T1w.nii.gz"
    mask_path = output_dir / f"{case_name}_lesion_mask.nii.gz"

    # Check if authentic ICBM152 scientific standard template is available on disk
    if ICBM152_PATH.exists():
        real_t1 = nib.load(str(ICBM152_PATH))
        # Downsample by 2x for fast, snappy web slicing (~98 x 116 x 94)
        t1_raw = real_t1.get_fdata(dtype=np.float32)[::2, ::2, ::2]
        orig_affine = real_t1.affine
        new_affine = orig_affine.copy()
        new_affine[:3, :3] *= 2.0

        shape = t1_raw.shape
        x, y, z = np.mgrid[0:shape[0], 0:shape[1], 0:shape[2]]

        # Center in world MNI coordinates for Left MCA Perisylvian Stroke
        flat_vox = np.vstack([x.ravel(), y.ravel(), z.ravel(), np.ones(x.size)])
        mni_pts = np.dot(new_affine, flat_vox)[:3].T  # shape (N, 3)

        # Set lesion center & radii according to profile
        if profile == "mild":
            lx_mni, ly_mni, lz_mni = -42.0, 14.0, 16.0
            rx, ry, rz = 9.0, 11.0, 9.0
        elif profile == "severe":
            lx_mni, ly_mni, lz_mni = -48.0, -24.0, 15.0
            rx, ry, rz = 24.0, 29.0, 22.0
        else:  # moderate default
            lx_mni, ly_mni, lz_mni = -46.0, -14.0, 18.0
            rx, ry, rz = 18.0, 24.0, 20.0

        # Ellipsoidal infarct boundary in MNI mm
        dist_sq = (
            ((mni_pts[:, 0] - lx_mni) / rx) ** 2 +
            ((mni_pts[:, 1] - ly_mni) / ry) ** 2 +
            ((mni_pts[:, 2] - lz_mni) / rz) ** 2
        )
        lesion_flat = (dist_sq <= 1.0)
        brain_tissue = (t1_raw.ravel() > 18.0)  # Only inside brain tissue, not CSF/air
        lesion_flat = lesion_flat & brain_tissue

        lesion_mask = lesion_flat.reshape(shape).astype(np.uint8)

        # Darken the ischemic encephalomalacia infarct core in the T1w volume
        t1_vol = t1_raw.copy()
        t1_vol[lesion_mask == 1] = np.clip(t1_vol[lesion_mask == 1] * 0.35, 10.0, 30.0)

        # Save authentic NIfTI files
        t1_img = nib.Nifti1Image(t1_vol, new_affine)
        nib.save(t1_img, str(mri_path))

        mask_img = nib.Nifti1Image(lesion_mask, new_affine)
        nib.save(mask_img, str(mask_path))

        return mri_path, mask_path

    # Fallback to standard 2mm MNI grid if template is absent
    rng = np.random.default_rng(seed)
    shape = (91, 109, 91)
    affine = np.array([
        [-2.0,  0.0,  0.0,   90.0],
        [ 0.0,  2.0,  0.0, -126.0],
        [ 0.0,  0.0,  2.0,  -72.0],
        [ 0.0,  0.0,  0.0,    1.0],
    ], dtype=np.float32)

    x, y, z = np.mgrid[0:shape[0], 0:shape[1], 0:shape[2]]
    cx, cy, cz = 45.0, 63.0, 36.0

    brain_dist = (((x - cx) / 36.0) ** 2 + ((y - cy) / 46.0) ** 2 + ((z - cz) / 34.0) ** 2)
    brain_mask = (brain_dist <= 1.0)

    t1_data = np.zeros(shape, dtype=np.float32)
    t1_data[brain_mask] = rng.normal(loc=80.0, scale=12.0, size=np.sum(brain_mask))

    # Profile-driven coordinates in 2mm MNI voxel space
    if profile == "mild":
        lx, ly, lz = 66.0, 70.0, 44.0
        rx, ry, rz = 4.5, 5.5, 4.5
    elif profile == "severe":
        lx, ly, lz = 69.0, 50.0, 43.0
        rx, ry, rz = 11.2, 14.0, 12.0
    else:  # moderate default
        lx, ly, lz = 68.0, 56.0, 45.0
        rx, ry, rz = 9.2, 12.0, 10.0

    lesion_dist = (((x - lx) / rx) ** 2 + ((y - ly) / ry) ** 2 + ((z - lz) / rz) ** 2)
    lesion_mask = (lesion_dist <= 1.0) & brain_mask

    t1_data[lesion_mask] = rng.normal(loc=30.0, scale=5.0, size=np.sum(lesion_mask))

    t1_img = nib.Nifti1Image(t1_data, affine)
    nib.save(t1_img, str(mri_path))

    lesion_img = nib.Nifti1Image(lesion_mask.astype(np.uint8), affine)
    nib.save(lesion_img, str(mask_path))

    return mri_path, mask_path
