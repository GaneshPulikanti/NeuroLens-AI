import {
  DatasetRegistryResponse,
  ModelMetadata,
  PredictionResult,
  RoiAnalysisResponse,
  StudyDetails,
  StudySummary,
} from '../types';

const RAW_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();
const BASE_URL = RAW_URL
  ? (RAW_URL.endsWith('/api') ? RAW_URL : `${RAW_URL.replace(/\/$/, '')}/api`)
  : '/api';

export async function fetchHealth(): Promise<{ status: string; service: string; version: string; studies_count: number }> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

export async function fetchDatasets(): Promise<DatasetRegistryResponse> {
  const res = await fetch(`${BASE_URL}/datasets`);
  if (!res.ok) throw new Error('Failed to fetch dataset registry');
  return res.json();
}

export async function fetchModels(): Promise<{ count: number; models: ModelMetadata[]; active_model: ModelMetadata }> {
  const res = await fetch(`${BASE_URL}/models`);
  if (!res.ok) throw new Error('Failed to fetch models');
  return res.json();
}

export async function runTrainExperiment(params: {
  model_type: string;
  feature_set: string;
  n_splits: number;
  random_seed: number;
}): Promise<{ message: string; experiment: ModelMetadata }> {
  const res = await fetch(`${BASE_URL}/experiments/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Experiment failed' }));
    throw new Error(err.detail || 'Experiment training failed');
  }
  return res.json();
}

export async function fetchStudies(): Promise<StudySummary[]> {
  const res = await fetch(`${BASE_URL}/studies`);
  if (!res.ok) throw new Error('Failed to fetch studies');
  return res.json();
}

export async function createStudy(): Promise<{ study_id: string; message: string }> {
  const res = await fetch(`${BASE_URL}/studies`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to create study');
  return res.json();
}

export async function loadDemoStudy(studyId: string): Promise<{ study_id: string; message: string }> {
  const res = await fetch(`${BASE_URL}/studies/${studyId}/load-demo`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to load demo study');
  return res.json();
}

export async function uploadStudyFile(
  studyId: string,
  file: File,
  fileType: 'mri' | 'lesion_mask'
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('file_type', fileType);

  const res = await fetch(`${BASE_URL}/studies/${studyId}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'File upload rejected');
  }
  return res.json();
}

export async function fetchStudyDetails(studyId: string): Promise<StudyDetails> {
  const res = await fetch(`${BASE_URL}/studies/${studyId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Study not found' }));
    throw new Error(err.detail || 'Failed to load study details');
  }
  return res.json();
}

export function getSliceImageUrl(
  studyId: string,
  plane: string,
  index: number,
  options: {
    preset?: string;
    customLevel?: number;
    customWidth?: number;
    showLesion?: boolean;
    lesionOpacity?: number;
    showRois?: boolean;
    roiOpacity?: number;
  } = {}
): string {
  const params = new URLSearchParams();
  if (options.preset) params.append('preset', options.preset);
  if (options.customLevel !== undefined) params.append('custom_level', options.customLevel.toString());
  if (options.customWidth !== undefined) params.append('custom_width', options.customWidth.toString());
  if (options.showLesion !== undefined) params.append('show_lesion', options.showLesion.toString());
  if (options.lesionOpacity !== undefined) params.append('lesion_opacity', options.lesionOpacity.toString());
  if (options.showRois !== undefined) params.append('show_rois', options.showRois.toString());
  if (options.roiOpacity !== undefined) params.append('roi_opacity', options.roiOpacity.toString());

  return `${BASE_URL}/studies/${studyId}/slices/${plane}/${index}?${params.toString()}`;
}

export async function fetchRoiAnalysis(studyId: string): Promise<RoiAnalysisResponse> {
  const res = await fetch(`${BASE_URL}/studies/${studyId}/roi-analysis`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'ROI analysis failed' }));
    throw new Error(err.detail || 'ROI analysis calculation failed');
  }
  return res.json();
}

export async function fetchPrediction(
  studyId: string,
  modelVersion?: string
): Promise<{ study_id: string; features_extracted: Record<string, number>; prediction: PredictionResult }> {
  const res = await fetch(`${BASE_URL}/studies/${studyId}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_version: modelVersion }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Prediction failed' }));
    throw new Error(err.detail || 'Model prediction failed');
  }
  return res.json();
}

export async function fetchReport(studyId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/reports/${studyId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Report generation failed' }));
    throw new Error(err.detail || 'Report generation failed');
  }
  return res.json();
}

export function getReportHtmlUrl(studyId: string): string {
  return `${BASE_URL}/reports/${studyId}/html`;
}
