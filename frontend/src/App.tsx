import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ConditionDiagnosisPage } from './pages/ConditionDiagnosisPage';
import { SpeechTherapyPage } from './pages/SpeechTherapyPage';
import { UploadScanModal } from './components/UploadScanModal';
import { fetchStudies, getReportHtmlUrl } from './services/api';
import { StudySummary } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('condition');
  const [selectedStudyId, setSelectedStudyId] = useState<string>('demo_stroke_case_01');
  const [studies, setStudies] = useState<StudySummary[]>([]);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Sync dark class on html root
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Load studies on mount
  const refreshStudies = async () => {
    try {
      const list = await fetchStudies();
      setStudies(list);
      if (list.length > 0 && !list.some((s) => s.study_id === selectedStudyId)) {
        setSelectedStudyId(list[0].study_id);
      }
    } catch (err) {
      console.error('Failed to load studies list', err);
    }
  };

  useEffect(() => {
    refreshStudies();
  }, []);

  const handlePrintReport = () => {
    if (!selectedStudyId) return;
    window.open(getReportHtmlUrl(selectedStudyId), '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors font-sans antialiased">
      {/* Streamlined Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
        setIsDark={setIsDark}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onPrintReport={handlePrintReport}
        selectedStudyId={selectedStudyId}
        studies={studies}
        onSelectStudy={setSelectedStudyId}
      />

      {/* Main Experience View */}
      <main className="flex-1">
        {activeTab === 'condition' && (
          <ConditionDiagnosisPage
            selectedStudyId={selectedStudyId}
            studies={studies}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
            onNavigateToExercises={() => setActiveTab('exercises')}
          />
        )}

        {activeTab === 'exercises' && <SpeechTherapyPage />}
      </main>

      {/* Upload & Patient Selection Modal */}
      <UploadScanModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        studies={studies}
        currentStudyId={selectedStudyId}
        onSelectStudy={setSelectedStudyId}
        onStudyCreated={refreshStudies}
      />

      {/* Reassuring, Clean Healthcare Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 py-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              NeuroLens AI
            </span>{' '}
            — AI-Assisted Brain MRI Stroke Topography & Language Recovery Assistant
          </div>
          <div className="flex flex-wrap items-center justify-center space-x-3 text-[11px]">
            <span>Volumetric 3D MRI</span>
            <span>•</span>
            <span>Harvard-Oxford Language Atlas</span>
            <span>•</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              Designed for Patients, Families & Clinicians
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
