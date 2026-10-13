export interface StudySummary {
  study_id: string;
  display_name?: string;
  description?: string;
  severity_tier?: string;
  has_mri: boolean;
  mri_filename: string | null;
  has_lesion_mask: boolean;
  mask_filename: string | null;
}

export interface VolumeMetadata {
  filename: string;
  shape: [number, number, number];
  dimensions: {
    x_sagittal: number;
    y_coronal: number;
    z_axial: number;
  };
  voxel_dims_mm: [number, number, number];
  voxel_volume_mm3: number;
  voxel_volume_cm3: number;
  orientation: string[];
  affine: number[][];
  intensity: {
    min: number;
    max: number;
    mean: number;
    std: number;
  };
}

export interface LesionMorphometry {
  lesion_detected: boolean;
  voxel_count: number;
  volume_mm3: number;
  volume_cm3: number;
  bounding_box_voxels: {
    x_range: [number, number];
    y_range: [number, number];
    z_range: [number, number];
  } | null;
  center_of_gravity_voxel: [number, number, number] | null;
  center_of_gravity_mni: [number, number, number] | null;
  left_hemisphere_vol_cm3: number;
  right_hemisphere_vol_cm3: number;
  laterality_index: number;
  laterality_label: string;
}

export interface StudyDetails {
  study_id: string;
  mri: VolumeMetadata;
  has_lesion_mask: boolean;
  lesion_mask: VolumeMetadata | null;
  alignment_compatible: boolean;
  alignment_warnings: string[];
  lesion_morphometry: LesionMorphometry | null;
  atlas_available: boolean;
}

export interface RoiMeasurement {
  id: number;
  key: string;
  name: string;
  network: string;
  brodmann: string;
  hemisphere: string;
  roi_voxel_count: number;
  roi_volume_cm3: number;
  overlap_voxel_count: number;
  overlap_volume_cm3: number;
  overlap_percentage: number;
  severity: string;
  severity_color: string;
  description: string;
}

export interface NetworkSummary {
  broca_complex_mean_pct: number;
  wernicke_area_mean_pct: number;
  parietal_conduction_mean_pct: number;
  motor_articulatory_mean_pct: number;
  total_language_cortex_lesion_cm3: number;
  total_lesion_cm3: number;
}

export interface RoiAnalysisResponse {
  study_id: string;
  results: {
    atlas: {
      atlas_name: string;
      version: string;
      coordinate_space: string;
      roi_count: number;
    };
    region_measurements: RoiMeasurement[];
    network_summary: NetworkSummary;
  };
}

export interface EvaluationMetrics {
  mae: number;
  rmse: number;
  r2: number;
  pearson_r: number;
  p_value?: number;
}

export interface FeatureImportanceItem {
  feature: string;
  importance_weight: number;
  coefficient: number;
  direction: string;
}

export interface ModelMetadata {
  model_version: string;
  model_type: string;
  feature_set: string;
  features_used: string[];
  trained_timestamp: string;
  n_participants: number;
  n_splits: number;
  random_seed: number;
  metrics: EvaluationMetrics;
  residual_std: number;
  ci_95_margin: number;
  baselines: {
    dummy_mean: EvaluationMetrics;
    lesion_volume_only: EvaluationMetrics;
  };
  feature_importance: FeatureImportanceItem[];
}

export interface PredictionResult {
  model_version: string;
  model_type: string;
  feature_set: string;
  predicted_wab_aq: number;
  uncertainty_interval_95: {
    lower: number;
    upper: number;
    margin: number;
  };
  impairment_category: string;
  impairment_severity: string;
  badge_color: string;
  clinical_implication: string;
  features_used: string[];
  feature_contributions: Array<{
    feature: string;
    patient_value: number;
    model_weight: number;
    estimated_impact: number;
    direction: string;
  }>;
  scientific_disclaimer: string;
}

export interface DatasetStatus {
  name: string;
  dataset_id?: string;
  source_url: string;
  zenodo_url?: string;
  doi: string;
  license: string;
  status: string;
  verified_participant_count?: number;
  prediction_target?: string;
  wab_aq_distribution?: {
    mean: number;
    std: number;
    median: number;
    min: number;
    max: number;
  };
  subtype_distribution?: Record<string, number>;
  features_cache_exists?: boolean;
  local_directory: string;
  command_to_download_raw?: string;
  purpose?: string;
  modalities?: string[];
  annotation?: string;
  local_scans_count?: number;
  scientific_note?: string;
}

export interface DatasetRegistryResponse {
  primary: DatasetStatus;
  secondary: DatasetStatus;
}
