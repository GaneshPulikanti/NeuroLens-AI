import React, { useState } from 'react';
import {
  X,
  Upload,
  Brain,
  FileCheck,
  AlertCircle,
  RefreshCw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { StudySummary } from '../types';
import { createStudy, uploadStudyFile } from '../services/api';

interface UploadScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  studies: StudySummary[];
  currentStudyId: string;
  onSelectStudy: (studyId: string) => void;
  onStudyCreated: () => Promise<void>;
}

export const UploadScanModal: React.FC<UploadScanModalProps> = ({
  isOpen,
  onClose,
  studies,
  currentStudyId,
  onSelectStudy,
  onStudyCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'sample' | 'custom'>('sample');
  const [mriFile, setMriFile] = useState<File | null>(null);
  const [maskFile, setMaskFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCustomUpload = async () => {
    if (!mriFile) {
      setError('Please select a brain MRI file (.nii or .nii.gz).');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Create a new study directory
      const newStudy = await createStudy();
      const studyId = newStudy.study_id;

      // 2. Upload MRI
      await uploadStudyFile(studyId, mriFile, 'mri');

      // 3. Upload Lesion Mask if provided
      if (maskFile) {
        await uploadStudyFile(studyId, maskFile, 'lesion_mask');
      }

      setSuccessMsg('Brain scan uploaded and processed successfully!');
      await onStudyCreated();
      onSelectStudy(studyId);
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
        setMriFile(null);
        setMaskFile(null);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please verify NIfTI file format.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Select or Upload Brain Scan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose a pre-analyzed patient case or upload your own 3D MRI scan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-6 pt-4 pb-2 flex space-x-2 border-b border-slate-100 dark:border-slate-800/60">
          <button
            onClick={() => setActiveTab('sample')}
            className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'sample'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Ready-to-Use Patient Cases</span>
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'custom'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload My Brain Scan (.nii)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {activeTab === 'sample' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instantly explore clinical cases with different stroke sizes and speech impacts:
              </p>
              <div className="space-y-2.5">
                {studies.map((s) => {
                  const isCurrent = s.study_id === currentStudyId;
                  const tierColor =
                    s.severity_tier === 'Mild'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                      : s.severity_tier === 'Moderate'
                      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                      : s.severity_tier === 'Severe'
                      ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800'
                      : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';

                  return (
                    <div
                      key={s.study_id}
                      onClick={() => {
                        onSelectStudy(s.study_id);
                        onClose();
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-sm text-slate-900 dark:text-white">
                            {s.display_name || s.study_id}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                              Active
                            </span>
                          )}
                        </div>
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${tierColor}`}>
                          {s.severity_tier || 'Analyzed'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {s.description || 'Pre-processed brain scan with volumetric lesion mask.'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-center space-x-2.5 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-center space-x-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* MRI Upload Box */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  1. Structural Brain MRI Scan (T1w) <span className="text-red-500">*</span>
                </label>
                <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-950/40">
                  <input
                    type="file"
                    accept=".nii,.nii.gz,.gz"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setMriFile(e.target.files[0]);
                      }
                    }}
                  />
                  {mriFile ? (
                    <div className="flex items-center justify-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <FileCheck className="w-4 h-4" />
                      <span>{mriFile.name} ({(mriFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Drop MRI scan here or <span className="text-blue-500 underline">browse</span>
                      </p>
                      <p className="text-[11px] text-slate-400">Supported: .nii, .nii.gz</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Lesion Mask Upload Box */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  2. Stroke Lesion Mask File (Optional / Recommended)
                </label>
                <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-950/40">
                  <input
                    type="file"
                    accept=".nii,.nii.gz,.gz"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setMaskFile(e.target.files[0]);
                      }
                    }}
                  />
                  {maskFile ? (
                    <div className="flex items-center justify-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <FileCheck className="w-4 h-4" />
                      <span>{maskFile.name} ({(maskFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Drop stroke lesion mask here (or leave empty)
                      </p>
                      <p className="text-[11px] text-slate-400">Binary lesion mask aligned in MNI or scanner space</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleCustomUpload}
                disabled={!mriFile || uploading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Scan & Calculating Damage...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Upload & Generate Condition Report</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <span>Files are processed locally and securely.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
