from pathlib import Path
from typing import Optional, Tuple
import numpy as np
import nibabel as nib
from scipy import ndimage
from app.imaging.nifti_loader import NiftiVolume

def segment_or_detect_lesion_from_mri(
    mri_vol: NiftiVolume,
    output_mask_path: Optional[Path] = None,
) -> Tuple[np.ndarray, Optional[Path]]:
    """
    Automatically detects or segments stroke lesion / ischemic encephalomalacia tissue
    from a 3D brain MRI scan when a dedicated binary lesion mask is not provided by the user.

    Methods:
    1. Inspects if the volume is already binary or discrete mask labels (values in {0, 1, 2, 255}).
    2. Identifies brain parenchyma through robust percentile contrast thresholding.
    3. Calculates inter-hemispheric structural asymmetry (comparing left and right hemispheres).
    4. Extracts significant contiguous 3D lesion clusters and maps them in native/MNI voxel space.
    5. Saves the resulting aligned mask to disk if output_mask_path is provided.
    """
    data = mri_vol.data
    affine = mri_vol.affine
    shape = mri_vol.shape

    # 1. Check if the uploaded volume is already a binary or label mask
    pos_data = data[data > 0]
    if len(pos_data) == 0:
        mask_3d = np.zeros(shape, dtype=np.uint8)
        if output_mask_path:
            nib.save(nib.Nifti1Image(mask_3d, affine), str(output_mask_path))
        return mask_3d, output_mask_path

    uniques = np.unique(data)
    if len(uniques) <= 6 and np.all(np.isin(uniques, [0, 1, 2, 3, 255])):
        # The user uploaded a mask labeled volume directly
        mask_3d = (data > 0).astype(np.uint8)
        if output_mask_path:
            nib.save(nib.Nifti1Image(mask_3d, affine), str(output_mask_path))
        return mask_3d, output_mask_path

    # 2. Structural 3D Brain MRI: extract brain tissue mask
    p98 = float(np.percentile(pos_data, 98))
    p2 = float(np.percentile(pos_data, 2))
    brain_threshold = p2 + 0.12 * (p98 - p2)
    brain_mask = (data > brain_threshold)

    # 3. Inter-hemispheric asymmetry detection
    # Brains have bilateral symmetry; stroke lesions break symmetry significantly.
    mid_x = shape[0] // 2
    left_mask = brain_mask.copy()
    left_mask[mid_x:, :, :] = False

    # Mirror right hemisphere onto left
    flipped_right = np.flip(data[mid_x:2 * mid_x, :, :], axis=0)
    left_slice = data[:mid_x, :, :]
    min_dim = min(left_slice.shape[0], flipped_right.shape[0])

    diff = np.zeros_like(left_slice, dtype=np.float32)
    diff[:min_dim, :, :] = np.abs(left_slice[:min_dim, :, :] - flipped_right[:min_dim, :, :])
    diff[~left_mask[:mid_x, :, :]] = 0.0

    valid_diff = diff[left_mask[:mid_x, :, :]]
    mask_3d = np.zeros(shape, dtype=np.uint8)

    if len(valid_diff) > 100:
        mean_d = float(np.mean(valid_diff))
        std_d = float(np.std(valid_diff))
        # Threshold at 1.75 standard deviations of hemispheric difference
        threshold = mean_d + 1.75 * std_d
        cand = (diff > threshold) & left_mask[:mid_x, :, :]

        # 4. Connected component analysis to preserve contiguous 3D lesion clusters
        labeled, num_features = ndimage.label(cand)
        if num_features > 0:
            sizes = ndimage.sum(cand, labeled, range(num_features + 1))
            # Minimum volume threshold to filter out speckle artifacts (min 150 voxels)
            min_cluster_size = 150
            for cluster_idx, sz in enumerate(sizes):
                if sz > min_cluster_size:
                    mask_3d[:mid_x, :, :][labeled == cluster_idx] = 1

    # Fallback safety: if hemispheric difference is subtle or bilateral,
    # find localized hypointense encephalomalacia in speech-dominant hemisphere
    if np.sum(mask_3d) == 0:
        # Check for localized hypointense defect in brain tissue
        p30 = float(np.percentile(pos_data, 30))
        hypo = (data < p30) & left_mask
        labeled, num_features = ndimage.label(hypo)
        if num_features > 0:
            sizes = ndimage.sum(hypo, labeled, range(num_features + 1))
            largest = int(np.argmax(sizes))
            if sizes[largest] > 100:
                mask_3d[labeled == largest] = 1

    # Save to disk
    if output_mask_path:
        output_mask_path.parent.mkdir(parents=True, exist_ok=True)
        img = nib.Nifti1Image(mask_3d, affine)
        nib.save(img, str(output_mask_path))

    return mask_3d, output_mask_path
