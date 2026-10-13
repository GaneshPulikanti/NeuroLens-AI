from typing import Dict, Any, List, Optional
import numpy as np

# Anatomical Language ROIs based on Harvard-Oxford Cortical Atlas & AAL definitions in MNI152 stereotaxic space
LANGUAGE_ROIS_DEFINITION: List[Dict[str, Any]] = [
    {
        "id": 1,
        "key": "L_IFG_opercularis",
        "name": "Left IFG (Pars Opercularis)",
        "network": "Broca's Complex (Syntax & Motor Speech)",
        "brodmann": "BA 44",
        "hemisphere": "Left",
        "center_mni": [-50.0, 14.0, 18.0],
        "radii_mm": [14.0, 16.0, 15.0],
        "reference_volume_cm3": 8.4,
        "description": "Posterior region of the inferior frontal gyrus; critical for syntactic processing and speech articulation.",
    },
    {
        "id": 2,
        "key": "L_IFG_triangularis",
        "name": "Left IFG (Pars Triangularis)",
        "network": "Broca's Complex (Expressive Semantics)",
        "brodmann": "BA 45",
        "hemisphere": "Left",
        "center_mni": [-46.0, 28.0, 10.0],
        "radii_mm": [15.0, 15.0, 14.0],
        "reference_volume_cm3": 7.8,
        "description": "Anterior portion of the inferior frontal gyrus; associated with controlled semantic retrieval and verbal fluency.",
    },
    {
        "id": 3,
        "key": "L_STG_post",
        "name": "Left Superior Temporal Gyrus (Posterior)",
        "network": "Wernicke's Area (Auditory Comprehension)",
        "brodmann": "BA 22",
        "hemisphere": "Left",
        "center_mni": [-56.0, -38.0, 10.0],
        "radii_mm": [16.0, 20.0, 15.0],
        "reference_volume_cm3": 11.2,
        "description": "Classic Wernicke's territory; central node for auditory word recognition, phonological decoding, and language comprehension.",
    },
    {
        "id": 4,
        "key": "L_MTG_post",
        "name": "Left Middle Temporal Gyrus (Posterior)",
        "network": "Temporal-Parietal Semantic Hub",
        "brodmann": "BA 21 / BA 37",
        "hemisphere": "Left",
        "center_mni": [-58.0, -42.0, -4.0],
        "radii_mm": [15.0, 18.0, 14.0],
        "reference_volume_cm3": 9.5,
        "description": "Crucial ventral stream nexus for lexical retrieval, multi-modal semantic access, and spoken word production.",
    },
    {
        "id": 5,
        "key": "L_SMG",
        "name": "Left Supramarginal Gyrus",
        "network": "Parietal Phonological Network",
        "brodmann": "BA 40",
        "hemisphere": "Left",
        "center_mni": [-54.0, -36.0, 34.0],
        "radii_mm": [16.0, 16.0, 16.0],
        "reference_volume_cm3": 10.8,
        "description": "Dorsal stream component linking auditory phonology to motor articulation; essential for verbal repetition (damaged in conduction aphasia).",
    },
    {
        "id": 6,
        "key": "L_AG",
        "name": "Left Angular Gyrus",
        "network": "Semantic Integration & Literacy",
        "brodmann": "BA 39",
        "hemisphere": "Left",
        "center_mni": [-46.0, -62.0, 36.0],
        "radii_mm": [16.0, 18.0, 16.0],
        "reference_volume_cm3": 11.6,
        "description": "Heteromodal hub involved in semantic association, reading, writing, and sentence-level comprehension.",
    },
    {
        "id": 7,
        "key": "L_Precentral",
        "name": "Left Precentral Gyrus (Motor Speech)",
        "network": "Primary Motor Articulatory Strip",
        "brodmann": "BA 4",
        "hemisphere": "Left",
        "center_mni": [-48.0, -8.0, 42.0],
        "radii_mm": [14.0, 14.0, 20.0],
        "reference_volume_cm3": 12.0,
        "description": "Precentral motor representation for larynx, pharynx, tongue, and lips; damage impairs articulatory agility and speech execution.",
    },
    {
        "id": 8,
        "key": "L_Insula",
        "name": "Left Insular Cortex (Anterior)",
        "network": "Articulatory Coordination & Apraxia Hub",
        "brodmann": "Insula",
        "hemisphere": "Left",
        "center_mni": [-36.0, 8.0, 4.0],
        "radii_mm": [12.0, 16.0, 14.0],
        "reference_volume_cm3": 7.2,
        "description": "Deep subcortical/cortical structure; crucial for motor speech planning; lesion strongly associated with apraxia of speech.",
    },
    {
        "id": 9,
        "key": "R_Homologue",
        "name": "Right Perisylvian Homologue",
        "network": "Right Hemispheric Compensatory Network",
        "brodmann": "BA 44/22 Homologues",
        "hemisphere": "Right",
        "center_mni": [50.0, -10.0, 16.0],
        "radii_mm": [22.0, 24.0, 20.0],
        "reference_volume_cm3": 25.0,
        "description": "Contralateral perisylvian territory evaluated to quantify hemispheric laterality and right-hemisphere sparing.",
    },
]

class AtlasManager:
    """Manages anatomical stereotaxic regions of interest, MNI coordinate mapping, and label rasterization."""

    def __init__(self):
        self.atlas_name = "Harvard-Oxford / AAL Cortical Language Network (MNI152 Space)"
        self.version = "v2.4"
        self.rois = LANGUAGE_ROIS_DEFINITION
        self.roi_by_id = {r["id"]: r for r in self.rois}
        self.roi_by_key = {r["key"]: r for r in self.rois}

    def get_atlas_info(self) -> Dict[str, Any]:
        """Return atlas metadata and regional inventory."""
        return {
            "atlas_name": self.atlas_name,
            "version": self.version,
            "coordinate_space": "MNI152 (Non-linear 6th Generation)",
            "roi_count": len(self.rois),
            "regions": self.rois,
        }

    def generate_roi_label_volume(self, shape: tuple, affine: np.ndarray) -> np.ndarray:
        """Rasterize language ROIs into a 3D integer label matrix matching the given volume shape and affine."""
        label_vol = np.zeros(shape, dtype=np.uint8)

        # Coordinate grid
        inv_affine = np.linalg.inv(affine)

        for roi in self.rois:
            roi_id = roi["id"]
            c_mni = np.array(roi["center_mni"])
            r_mm = np.array(roi["radii_mm"])

            # Compute bounding box in MNI mm
            mni_min = c_mni - r_mm * 1.2
            mni_max = c_mni + r_mm * 1.2

            # Convert bounding box to voxel indices
            v_corners = []
            for dx in [mni_min[0], mni_max[0]]:
                for dy in [mni_min[1], mni_max[1]]:
                    for dz in [mni_min[2], mni_max[2]]:
                        v = np.dot(inv_affine, np.array([dx, dy, dz, 1.0]))[:3]
                        v_corners.append(v)
            v_corners = np.array(v_corners)

            vx_min = max(0, int(np.floor(v_corners[:, 0].min())))
            vx_max = min(shape[0], int(np.ceil(v_corners[:, 0].max())) + 1)
            vy_min = max(0, int(np.floor(v_corners[:, 1].min())))
            vy_max = min(shape[1], int(np.ceil(v_corners[:, 1].max())) + 1)
            vz_min = max(0, int(np.floor(v_corners[:, 2].min())))
            vz_max = min(shape[2], int(np.ceil(v_corners[:, 2].max())) + 1)

            if vx_min >= vx_max or vy_min >= vy_max or vz_min >= vz_max:
                continue

            # Meshgrid for this sub-block
            grid_x, grid_y, grid_z = np.mgrid[vx_min:vx_max, vy_min:vy_max, vz_min:vz_max]
            flat_voxels = np.vstack([grid_x.ravel(), grid_y.ravel(), grid_z.ravel(), np.ones(grid_x.size)])
            world_pts = np.dot(affine, flat_voxels)[:3].T  # shape (N, 3)

            # Check ellipsoidal distance in MNI mm
            norm_dist = np.sum(((world_pts - c_mni) / r_mm) ** 2, axis=1)
            inside = (norm_dist <= 1.0).reshape(grid_x.shape)

            sub_mask = label_vol[vx_min:vx_max, vy_min:vy_max, vz_min:vz_max]
            # Write label where unassigned
            sub_mask[(sub_mask == 0) & inside] = roi_id

        return label_vol

atlas_manager = AtlasManager()
