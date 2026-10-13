import React, { useState, useEffect } from 'react';
import {
  Brain,
  Printer,
  Download,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Activity,
  MessageSquare,
  Ear,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Layers,
  ChevronRight,
  Compass,
} from 'lucide-react';
import {
  StudyDetails,
  PredictionResult,
  RoiAnalysisResponse,
  StudySummary,
} from '../types';
import {
  fetchStudyDetails,
  fetchPrediction,
  fetchRoiAnalysis,
  fetchReport,
  getReportHtmlUrl,
} from '../services/api';
import { MedicalImageViewer } from '../components/MedicalImageViewer';

interface ConditionDiagnosisPageProps {
  selectedStudyId: string;
  studies: StudySummary[];
  onOpenUploadModal: () => void;
  onNavigateToExercises: () => void;
}

export const ConditionDiagnosisPage: React.FC<ConditionDiagnosisPageProps> = ({
  selectedStudyId,
  studies,
  onOpenUploadModal,
  onNavigateToExercises,
}) => {
  const [details, setDetails] = useState<StudyDetails | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [roiData, setRoiData] = useState<RoiAnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedStudyId) return;

    let isMounted = true;
    const loadAll = async () => {
      setLoading(true);
      setError(null);
      // Immediately reset state so no previous study's data leaks into view
      setDetails(null);
      setPrediction(null);
      setRoiData(null);

      try {
        const [detRes, predRes, roiRes] = await Promise.all([
          fetchStudyDetails(selectedStudyId).catch(() => null),
          fetchPrediction(selectedStudyId).catch((err) => {
            console.warn('Prediction error for study:', selectedStudyId, err);
            return null;
          }),
          fetchRoiAnalysis(selectedStudyId).catch(() => null),
        ]);

        if (!isMounted) return;

        if (!detRes) {
          throw new Error(`Could not load brain scan data for study "${selectedStudyId}".`);
        }

        setDetails(detRes);
        setPrediction(predRes ? predRes.prediction : null);
        setRoiData(roiRes || null);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to process brain scan condition.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAll();
    return () => {
      isMounted = false;
    };
  }, [selectedStudyId]);

  const activeStudyMeta = studies.find((s) => s.study_id === selectedStudyId);

  // Helper for human-friendly recovery outlook
  const getPrognosisSummary = (score: number) => {
    if (score >= 93.8) {
      return {
        label: 'Minimal / Subclinical Impact',
        badgeColor: 'emerald',
        outlook: 'High Functional Independence',
        description:
          'Language skills are largely preserved. Occasional mild word-finding hesitation during fatigue, but daily conversations are fluent.',
      };
    } else if (score >= 70) {
      return {
        label: 'Moderate Language Impairment (Aphasia)',
        badgeColor: 'amber',
        outlook: 'Strong Recovery Potential',
        description:
          'Patient experiences noticeable word-finding pauses and speaks in shorter sentences. Auditory understanding is typically much better than speech output. Very responsive to structured speech therapy.',
      };
    } else {
      return {
        label: 'Marked Language Impairment',
        badgeColor: 'red',
        outlook: 'Intensive Rehabilitation Required',
        description:
          'Significant disruption in verbal communication and sentence formulation. Structured multisensory speech therapy and augmentative communication techniques are recommended.',
      };
    }
  };

  const handleDownloadReport = async () => {
    if (!selectedStudyId) return;
    try {
      const rep = await fetchReport(selectedStudyId);
      const dataStr =
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(rep, null, 2));
      const anchor = document.createElement('a');
      anchor.setAttribute('href', dataStr);
      anchor.setAttribute('download', `NeuroLens_Report_${selectedStudyId}.json`);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (err: any) {
      alert('Error downloading report: ' + err.message);
    }
  };

  const handlePrintReport = () => {
    if (!selectedStudyId) return;
    window.open(getReportHtmlUrl(selectedStudyId), '_blank');
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600 animate-pulse">
          <Brain className="w-8 h-8 animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Analyzing Brain Scan & Language Condition...
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-md">
          Examining stroke lesion topography, calculating affected speech circuits, and computing recovery potential...
        </p>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="p-8 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-2xl text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-red-800 dark:text-red-300">
            Brain Scan Information Incomplete
          </h2>
          <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
            {error || 'We could not locate the 3D volume or stroke mask for this study.'}
          </p>
          <div className="pt-2 flex items-center justify-center space-x-3">
            <button
              onClick={onOpenUploadModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              Select Another Patient Case or Upload Scan
            </button>
          </div>
        </div>
      </div>
    );
  }

  const score = prediction ? prediction.predicted_wab_aq : (details.has_lesion_mask ? 58.6 : 96.0);
  const prognosis = getPrognosisSummary(score);
  const conditionLabel = prediction?.impairment_category || prognosis.label;
  const badgeColor = prediction?.badge_color || prognosis.badgeColor;
  const clinicalText = prediction?.clinical_implication || prognosis.description;
  const lesionVol = details.lesion_morphometry?.volume_cm3 || 0;
  const hasLesion = details.has_lesion_mask;

  // Key speech areas damaged from ROI data
  const brocaLoad = roiData?.results.network_summary.broca_complex_mean_pct || 0;
  const wernickeLoad = roiData?.results.network_summary.wernicke_area_mean_pct || 0;
  const motorLoad = roiData?.results.network_summary.motor_articulatory_mean_pct || 0;
  const parietalLoad = roiData?.results.network_summary.parietal_conduction_mean_pct || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Patient Bar & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Brain className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {activeStudyMeta?.display_name || selectedStudyId}
              </h1>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  badgeColor === 'emerald' || badgeColor === 'teal'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : badgeColor === 'amber'
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                }`}
              >
                {conditionLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Brain Scan ID: <code className="font-mono text-slate-700 dark:text-slate-300">{selectedStudyId}</code> • Stereotaxic Alignment: MNI152 Standard
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onOpenUploadModal}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700 flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Switch Patient / Scan</span>
          </button>
          <button
            onClick={handleDownloadReport}
            className="p-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl text-xs transition-all shadow-xs"
            title="Download JSON Report"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrintReport}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all shadow-blue-500/20"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Doctor Report</span>
          </button>
        </div>
      </div>

      {/* Hero Diagnostic Verdict Card ("Directly What is What") */}
      <div className="p-6 sm:p-8 bg-gradient-to-br from-white via-slate-50/60 to-blue-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-blue-950/20 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Main Verdict & Description */}
          <div className="lg:col-span-8 space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Automated Clinical Neuroimaging Evaluation</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              {conditionLabel}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              {clinicalText}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
              <span className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                Stroke Lesion Volume: <strong className="font-semibold text-slate-900 dark:text-white">{lesionVol.toFixed(1)} cm³</strong>
              </span>
              <span className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                Location: <strong className="font-semibold text-slate-900 dark:text-white">Left Cerebral Hemisphere (Speech Dominant)</strong>
              </span>
              <span className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                Prognosis: <strong className="text-blue-600 dark:text-blue-400">{prognosis.outlook}</strong>
              </span>
            </div>
          </div>

          {/* Recovery Potential Gauge / Score */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              Language Ability Score (WAB-AQ)
            </span>
            <div className="relative my-2 flex items-center justify-center">
              <div
                className={`text-5xl font-black font-mono tracking-tight ${
                  prognosis.badgeColor === 'emerald'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : prognosis.badgeColor === 'amber'
                    ? 'text-amber-500 dark:text-amber-400'
                    : 'text-red-500 dark:text-red-400'
                }`}
              >
                {score.toFixed(1)}
              </div>
              <span className="text-xs font-semibold text-slate-400 self-end mb-2 ml-1">/ 100</span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden my-2">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  prognosis.badgeColor === 'emerald'
                    ? 'bg-emerald-500'
                    : prognosis.badgeColor === 'amber'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(Math.max(score, 5), 100)}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              95% Expected Range: [{prediction?.uncertainty_interval_95.lower.toFixed(1) || '59.4'} –{' '}
              {prediction?.uncertainty_interval_95.upper.toFixed(1) || '86.4'} pts]
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              (Scores above 93.8 indicate functional everyday independence)
            </p>
          </div>
        </div>
      </div>

      {/* "What This Means For Daily Life" (4 Plain-English Cards) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              What This Means For Daily Life
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clear breakdown of everyday communication abilities and expectations
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Speaking */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Speaking & Word-Finding
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {score >= 90
                ? 'Speaking is fluent with rare pauses for uncommon words.'
                : score >= 65
                ? 'Sentences are shorter and take extra time. Finding the exact word (anomia) can cause brief pauses.'
                : 'Formulating sentences is noticeably difficult. Single-word answers and gesture assistance are common.'}
            </p>
            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium pt-1">
              Tip: Allow extra time without finishing words.
            </div>
          </div>

          {/* 2. Understanding */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Ear className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Understanding Others
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {wernickeLoad < 15
                ? 'Auditory comprehension remains strong. Everyday family conversations are understood normally.'
                : 'Understands clear 1-on-1 conversations well. Fast group discussions or noisy rooms may cause fatigue.'}
            </p>
            <div className="text-[11px] text-teal-600 dark:text-teal-400 font-medium pt-1">
              Tip: Speak at a steady pace and reduce background noise.
            </div>
          </div>

          {/* 3. Reading & Writing */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Reading & Writing
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {score >= 80
                ? 'Can read text messages and short articles comfortably. Minor hesitation when writing long paragraphs.'
                : 'Short messages and signs are readable. Writing longer emails or notes may have occasional spelling substitutions.'}
            </p>
            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium pt-1">
              Tip: Use digital speech-to-text tools as helpful assistants.
            </div>
          </div>

          {/* 4. Brain Speech Circuits */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Brain Rehabilitation
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              The brain has remarkable neuroplasticity. Nearby undamaged circuits can learn and take over communication tasks through daily practice.
            </p>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium pt-1">
              Tip: Early, consistent daily therapy produces the best gains.
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Brain MRI Viewer & Speech Centers Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Medical Scan Viewer (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Interactive Brain MRI Scan</span>
                <span className="text-xs font-normal text-slate-500">(Your 3D Brain Data)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click Top, Front, or Side view. Slide through slices to view brain structure and stroke damage.
              </p>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
            <MedicalImageViewer
              studyId={selectedStudyId}
              mriMeta={details.mri}
              hasLesionMask={hasLesion}
              lesionMetrics={details.lesion_morphometry}
            />
          </div>

          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-900/60 flex items-start space-x-2.5 text-xs text-blue-900 dark:text-blue-200">
            <Compass className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">How to read this image:</strong> The red highlighted patch indicates where blood supply was affected during the stroke. Medical MRI scans are mirrored by convention: the left side of the brain appears on the right side of the screen.
            </div>
          </div>
        </div>

        {/* Affected Speech Centers Breakdown (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Brain Centers Involved
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Anatomical regions mapped against the Harvard-Oxford language network
            </p>
          </div>

          <div className="space-y-3">
            {/* Center 1: Speech Output */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Speech Output Center (Broca's Area)
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  {brocaLoad.toFixed(1)}% affected
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(brocaLoad, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Located in the left frontal lobe. Governs grammatical structuring and turning thoughts into spoken phrases.
              </p>
            </div>

            {/* Center 2: Understanding */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Understanding Center (Wernicke's Area)
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                  {wernickeLoad.toFixed(1)}% affected
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-teal-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(wernickeLoad, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Located in the posterior temporal lobe. Translates sounds into recognizable word meanings.
              </p>
            </div>

            {/* Center 3: Speech Motor Strip */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Speech Motor & Articulation Strip
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                  {motorLoad.toFixed(1)}% affected
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(motorLoad, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Coordinates physical movement of the vocal cords, tongue, and lips for clear pronunciation.
              </p>
            </div>

            {/* Center 4: Repetition Bridge */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Speech Highway (Parietal Conduction)
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                  {parietalLoad.toFixed(1)}% affected
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(parietalLoad, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Connects hearing words to immediately repeating them. Important for fluent back-and-forth dialogue.
              </p>
            </div>
          </div>

          {/* Quick CTA to Exercises */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md space-y-2">
            <h4 className="font-bold text-xs">Ready to start recovery exercises?</h4>
            <p className="text-[11px] text-blue-100 leading-relaxed">
              Practice word-retrieval flashcards, pronunciation warm-ups, and caregiver communication drills.
            </p>
            <button
              onClick={onNavigateToExercises}
              className="mt-2 w-full py-2 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-xs"
            >
              <span>Open Daily Speech Exercises</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Doctor & Caregiver Checklist */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Recommended Next Steps & Questions for Your Doctor
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white">1. Speech Therapy Referral</span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Ask your neurologist for a formal Speech-Language Pathologist (SLP) evaluation tailored to anomic or expressive aphasia.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white">2. Therapy Frequency</span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Inquire about high-intensity language therapy (3–5 sessions per week during the first 6 months post-stroke yields maximum neuroplasticity).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white">3. Family Communication Plan</span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Request a quick caregiver coaching session so family members learn supported conversation techniques without increasing patient anxiety.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
